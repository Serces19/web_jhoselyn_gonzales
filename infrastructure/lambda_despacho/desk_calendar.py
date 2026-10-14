from datetime import datetime, timezone, date, timedelta
import base64
import json
import re
from zoneinfo import ZoneInfo
import uuid

from contracts import ApiError, text
import os
import boto3
import repository as r
import model


def agenda(params):
    view = model.choice(params, 'view', {'MES', 'DIA', 'SEMANA'}, 'MES')
    if view == 'MES':
        period = params.get('period', '')
        if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', period):
            raise ApiError(422, 'INVALID_PERIOD', 'Período YYYY-MM requerido')
        rows, cursor = r.query('DUE_TASK#' + period, params, 'GSI2')
    else:
        day = params.get('date', '')
        try:
            start = date.fromisoformat(day)
            if start.isoformat() != day: raise ValueError()
            end = start + timedelta(days=1 if view == 'DIA' else 7)
            months = sorted({(start + timedelta(days=i)).strftime('%Y-%m') for i in range((end - start).days)})
            binding = {'view': view, 'date': day}
            phase, inner = 0, None
            if params.get('cursor'):
                saved = json.loads(base64.urlsafe_b64decode(params['cursor']))
                if saved['binding'] != binding or type(saved['phase']) is not int or not 0 <= saved['phase'] < len(months): raise ValueError()
                phase, inner = saved['phase'], saved['cursor']
            zone = ZoneInfo('America/La_Paz')
            bounds = [datetime.combine(value, datetime.min.time(), zone).astimezone(timezone.utc).isoformat() for value in [start, end]]
        except (ValueError, TypeError, KeyError, UnicodeError):
            raise ApiError(400, 'INVALID_AGENDA_QUERY', 'Fecha o cursor de agenda inválidos') from None
        rows, inner_cursor = r.query('DUE_TASK#' + months[phase], {'limit': params.get('limit', 25), 'cursor': inner}, 'GSI2', bounds=bounds)
        cursor = None
        if inner_cursor or phase + 1 < len(months):
            cursor = base64.urlsafe_b64encode(json.dumps({'binding': binding, 'phase': phase if inner_cursor else phase + 1,
                                                       'cursor': inner_cursor}).encode()).decode()
    return {'items': [r.get(row['pk'], row['sk'], True) for row in rows], 'next_cursor': cursor,
            'view': view, 'time_zone': 'America/La_Paz'}


def task(event, actor, case_id, body, task_id=None):
    case = r.get('CASE#' + case_id, required=True)
    old = r.get(case['pk'], 'TASK#' + task_id, required=True) if task_id else None
    version = r.expected(body, old) if old else None
    fields = {**(old or {}), **body}
    kind = model.choice(fields, 'kind', {'TAREA', 'AUDIENCIA', 'PLAZO'}, 'TAREA')
    due = text(fields, 'due_at', 40, True)
    try:
        value = datetime.fromisoformat(due)
        if value.tzinfo is None:
            raise ValueError()
        value = value.astimezone(timezone.utc)
    except ValueError:
        raise ApiError(422, 'INVALID_DUE_DATE', 'Fecha con zona horaria requerida') from None
    source = text(fields, 'date_source', 1000)
    if kind in {'PLAZO', 'AUDIENCIA'} and (fields.get('manual_confirmed') is not True or not source):
        raise ApiError(422, 'DATE_CONFIRMATION_REQUIRED', 'Confirma manualmente la fecha y su fuente')
    identifier = task_id or str(uuid.uuid4())
    state = model.choice(fields, 'state', {'PENDIENTE', 'HECHO', 'CANCELADO'}, 'PENDIENTE')
    item = {'pk': case['pk'], 'sk': 'TASK#' + identifier, 'id': identifier, 'entity_type': 'TASK',
            'version': (version or 0) + 1, 'title': text(fields, 'title', 200, True), 'kind': kind, 'state': state,
            'due_at': value.isoformat(), 'time_zone': 'America/La_Paz', 'date_source': source,
            'manual_confirmed': fields.get('manual_confirmed', False), 'updated_at': r.timestamp(),
            'gsi2pk': 'DUE_TASK#' + value.astimezone(ZoneInfo('America/La_Paz')).strftime('%Y-%m'),
            'gsi2sk': value.isoformat() + '#' + identifier}
    action = ('PATCH' if task_id else 'POST') + '/casos/' + case_id + '/tareas' + ('/' + identifier if task_id else '')
    return r.commit(event, actor, action, body, [r.check(case), r.put(item, version)], {'task_id': identifier, 'version': item['version']})


def link_appointment(event, actor, case_id, body):
    case = r.get('CASE#' + case_id, required=True)
    version = r.expected(body, case)
    identifier = text(body, 'appointment_id', 80, True)
    table = boto3.resource('dynamodb').Table(os.environ['APPOINTMENTS_TABLE'])
    appointment = table.get_item(Key={'appointment_id': identifier}, ConsistentRead=True).get('Item')
    if not appointment:
        raise ApiError(404, 'APPOINTMENT_NOT_FOUND', 'Cita inexistente')
    check = {'ConditionCheck': {'TableName': table.name, 'Key': r.wire({'appointment_id': identifier}),
        'ConditionExpression': 'attribute_exists(appointment_id) AND (attribute_not_exists(#v) OR #v = :v)',
        'ExpressionAttributeNames': {'#v': 'version'}, 'ExpressionAttributeValues': r.wire({':v': int(appointment.get('version', 0))})}}
    operations = [r.put({**case, 'version': version + 1, 'updated_at': r.timestamp()}, version), check,
        r.put({'pk': case['pk'], 'sk': 'APPOINTMENT#' + identifier, 'version': 1, 'appointment_id': identifier}),
        r.put({'pk': 'APPOINTMENT#' + identifier, 'sk': 'CASE_LINK', 'version': 1, 'case_id': case_id})]
    return r.commit(event, actor, 'POST/casos/' + case_id + '/citas', body, operations,
                    {'appointment_id': identifier, 'case_id': case_id, 'version': version + 1})
