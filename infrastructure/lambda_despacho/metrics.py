"""Bounded, resumable rebuild from the immutable strong-consistent event ledger."""
import re
from datetime import date
import uuid

from contracts import ApiError, text
import repository as r


def revision(period, kind):
    return int((r.get('REV#' + period, kind) or {}).get('version', 0))


def guard(period, kind, version):
    condition = '#v = :v' if version else 'attribute_not_exists(pk)'
    value = {'TableName': r.table().name, 'Key': r.wire({'pk': 'REV#' + period, 'sk': kind}), 'ConditionExpression': condition}
    if version:
        value.update(ExpressionAttributeNames={'#v': 'version'}, ExpressionAttributeValues=r.wire({':v': version}))
    return {'ConditionCheck': value}


def start(event, actor, body):
    period = text(body, 'period', 7, True)
    if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', period):
        raise ApiError(422, 'INVALID_PERIOD', 'Período YYYY-MM requerido')
    identifier = str(uuid.uuid4())
    item = {'pk': 'JOB#' + identifier, 'sk': 'META', 'id': identifier, 'entity_type': 'JOB', 'version': 1,
            'period': period, 'status': 'PENDING', 'totals': {}, 'cursor': None,
            'ledger_revision': revision(period, 'LEDGER'), 'processed_events': 0, 'created_at': r.timestamp()}
    return r.commit(event, actor, 'POST/metricas/rebuild', body, [r.put(item)], {'job_id': identifier, 'version': 1, 'status': 'PENDING'})


def step(event, actor, identifier, body):
    job = r.get('JOB#' + identifier, required=True)
    version = r.expected(body, job)
    if job.get('kind') == 'OVERDUE':
        return overdue_step(event, actor, job, body, version)
    if job['status'] == 'DONE':
        return {'job_id': identifier, 'status': 'DONE', 'version': version}
    period = job['period']
    if revision(period, 'LEDGER') != job['ledger_revision']:
        raise ApiError(409, 'SOURCE_CHANGED', 'Hay movimientos nuevos: inicia otra conciliación')
    query = {'limit': 25}
    if job.get('cursor'):
        query['cursor'] = job['cursor']
    rows, cursor = r.query('LEDGER#' + period, query)
    ready = all(r.get('APPLIED#metrics#' + row['event_id']) for row in rows)
    updated = {**job, 'version': version + 1, 'updated_at': r.timestamp()}
    totals = {key: int(value) for key, value in job['totals'].items()}
    operations = [guard(period, 'LEDGER', int(job['ledger_revision']))]
    if not ready:
        updated['status'] = 'WAITING_WORKER'
    else:
        for row in rows:
            for key, value in row['deltas'].items():
                totals[key] = totals.get(key, 0) + int(value)
        updated.update(totals=totals, cursor=cursor, processed_events=int(job['processed_events']) + len(rows), status='RUNNING' if cursor else 'DONE')
        if not cursor:
            metric_revision = revision(period, 'METRICS')
            current, more = r.query('METRIC#' + period, {'limit': 100})
            if more or len(totals) > 80:
                raise ApiError(422, 'REBUILD_LIMIT', 'Requiere conciliación ampliada')
            operations.append(guard(period, 'METRICS', metric_revision))
            for row in current:
                if row['sk'] not in totals:
                    operations.append(r.remove(row['pk'], row['sk']))
            for name, value in totals.items():
                # Replace derived counters only after guarding both revisions.
                operations.append({'Put': {'TableName': r.table().name, 'Item': r.wire({'pk': 'METRIC#' + period,
                    'sk': name, 'value': value, 'updated_at': r.timestamp(), 'rebuilt_by': actor})}})
    operations.append(r.put(updated, version))
    return r.commit(event, actor, 'POST/jobs/' + identifier + '/step', body, operations,
                    {'job_id': identifier, 'status': updated['status'], 'version': updated['version'], 'processed_events': updated['processed_events']})


def overdue_start(event, actor, body):
    cutoff = text(body, 'cutoff_date', 10, True)
    try:
        if date.fromisoformat(cutoff).isoformat() != cutoff: raise ValueError()
    except ValueError:
        raise ApiError(422, 'INVALID_DATE', 'Fecha de corte inválida') from None
    identifier = str(uuid.uuid4())
    item = {'pk': 'JOB#' + identifier, 'sk': 'META', 'id': identifier, 'entity_type': 'JOB', 'version': 1,
            'kind': 'OVERDUE', 'cutoff_date': cutoff, 'source_revision': revision('FINANCE', 'DUE'),
            'status': 'PENDING', 'totals': {}, 'cursor': None, 'processed_months': 0, 'created_at': r.timestamp()}
    return r.commit(event, actor, 'POST/metricas/vencido', body, [r.put(item)],
                    {'job_id': identifier, 'version': 1, 'status': 'PENDING', 'cutoff_date': cutoff})


def overdue_step(event, actor, job, body, version):
    identifier = job['id']
    if job['status'] == 'DONE':
        return {'job_id': identifier, 'version': version, 'status': 'DONE', 'totals': job['totals'], 'cutoff_date': job['cutoff_date']}
    if revision('FINANCE', 'DUE') != job['source_revision']:
        raise ApiError(409, 'SOURCE_CHANGED', 'Cambió el saldo de cuotas: inicia otra consulta')
    query = {'limit': 1}
    if job.get('cursor'): query['cursor'] = job['cursor']
    months, cursor = r.query('DUE_MONTHS', query)
    totals = {key: int(value) for key, value in job['totals'].items()}
    for month in months:
        if month['sk'] > job['cutoff_date'][:7]:
            cursor = None
            break
        rows, more = r.query('DUE_BALANCE#' + month['sk'], {'limit': 100})
        if more:
            raise ApiError(422, 'DUE_REPORT_LIMIT', 'Mes requiere conciliación ampliada')
        for row in rows:
            if row['due_date'] < job['cutoff_date']:
                totals[row['currency']] = totals.get(row['currency'], 0) + int(row['outstanding_minor'])
    updated = {**job, 'version': version + 1, 'totals': totals, 'cursor': cursor,
               'status': 'RUNNING' if cursor else 'DONE', 'updated_at': r.timestamp(),
               'processed_months': int(job['processed_months']) + len(months)}
    operations = [guard('FINANCE', 'DUE', int(job['source_revision'])), r.put(updated, version)]
    return r.commit(event, actor, 'POST/jobs/' + identifier + '/step', body, operations,
        {'job_id': identifier, 'version': version + 1, 'status': updated['status'], 'cutoff_date': job['cutoff_date'],
         'totals': totals if not cursor else None, 'processed_months': updated['processed_months'],
         'balance_basis': 'CURRENT_UNPAID_INSTALLMENTS', 'historical_payment_snapshot': False})
