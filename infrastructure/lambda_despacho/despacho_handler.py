"""Private E1 API. No public routes, no model calls, no external effects."""
from decimal import Decimal
import json
import os
import re
import uuid

from botocore.exceptions import ClientError
from contracts import ApiError, body_of
from security import require_admin
import crm
import finance
import model
import metrics
import repository as r


def dispatch(event, actor, method, path, body):
    params = event.get('queryStringParameters') or {}
    if path == '/config' and method == 'GET':
        return 200, {'stages': sorted(model.STAGES), 'case_states': sorted(model.CASE_STATES),
                     'party_roles': sorted(model.ROLES), 'currencies': sorted(model.CURRENCIES), 'environment': os.getenv('ENVIRONMENT', 'development'),
                     'pilot_enabled': os.getenv('PILOT_ENABLED', 'false') == 'true', 'time_zone': 'America/La_Paz'}
    if path == '/personas':
        if method == 'GET':
            rows, cursor = crm.persons(params)
            return 200, {'items': rows, 'next_cursor': cursor}
        if method == 'POST':
            return 201, crm.create_person(event, actor, body)
    match = re.fullmatch(r'/personas/([^/]+)', path)
    if match:
        if method == 'GET':
            return 200, r.get('PERSON#' + match[1], required=True)
        if method == 'PATCH':
            return 200, crm.edit_person(event, actor, match[1], body)
    if path == '/conflictos' and method == 'GET':
        return 200, crm.conflicts(params)
    if path == '/oportunidades':
        if method == 'GET':
            stage = model.choice(params, 'stage', model.STAGES, 'NUEVO')
            rows, cursor = r.list_entities('LIST#OPP#' + stage, params)
            return 200, {'items': rows, 'next_cursor': cursor}
        if method == 'POST':
            return 201, crm.create_opportunity(event, actor, body)
    match = re.fullmatch(r'/oportunidades/([^/]+)', path)
    if match:
        if method == 'GET':
            item = r.get('OPP#' + match[1], required=True)
            history, cursor = r.query(item['pk'], params, prefix='STAGE#')
            return 200, {'item': item, 'history': history, 'next_cursor': cursor}
        if method == 'PATCH':
            return 200, crm.edit_opportunity(event, actor, match[1], body)
    if path == '/intake' and method == 'POST':
        return 201, crm.intake(event, actor, body)
    if path == '/casos':
        if method == 'GET':
            state = model.choice(params, 'state', model.CASE_STATES, 'BORRADOR')
            rows, cursor = r.list_entities('LIST#CASE#' + state, params)
            return 200, {'items': rows, 'next_cursor': cursor}
        if method == 'POST':
            return 201, crm.create_case(event, actor, body)
    match = re.fullmatch(r'/casos/([^/]+)', path)
    if match:
        if method == 'PATCH':
            return 200, crm.edit_case(event, actor, match[1], body)
        if method == 'GET':
            item = r.get('CASE#' + match[1], required=True)
            rows, cursor = r.query(item['pk'], params)
            parties, _ = r.query(item['pk'], {'limit': 100}, prefix='PARTY#')
            balances, _ = r.query(item['pk'], {'limit': 100}, prefix='BALANCE#')
            people = {party['person_id']: r.get('PERSON#' + party['person_id'], required=True) for party in parties}
            review = item.get('conflict_review') or {}
            review_valid = review.get('decision') == 'APROBADO' and review.get('parties_digest') == crm.party_digest(parties, people)
            return 200, {'item': item, 'parties': parties, 'balances': balances,
                         'review_valid': review_valid, 'records': [row for row in rows if row['sk'] != 'META'], 'next_cursor': cursor}
    match = re.fullmatch(r'/casos/([^/]+)/partes', path)
    if match and method == 'POST':
        return 201, crm.add_party(event, actor, match[1], body)
    match = re.fullmatch(r'/casos/([^/]+)/(honorarios|pagos|gastos)', path)
    if match and method == 'POST':
        function = {'honorarios': finance.agreement, 'pagos': finance.payment, 'gastos': finance.expense}[match[2]]
        return 201, function(event, actor, match[1], body)
    match = re.fullmatch(r'/casos/([^/]+)/pagos/([^/]+)/reversion', path)
    if match and method == 'POST':
        return 201, finance.reverse(event, actor, match[1], match[2], body)
    match = re.fullmatch(r'/casos/([^/]+)/pagos/([^/]+)/asignaciones', path)
    if match and method == 'POST':
        return 201, finance.allocate(event, actor, match[1], match[2], body)
    match = re.fullmatch(r'/personas/([^/]+)/casos', path)
    if match and method == 'GET':
        r.get('PERSON#' + match[1], required=True)
        rows, cursor = r.query('PERSON#' + match[1], params, prefix='CASE#')
        return 200, {'items': [{**r.get(row['target_pk'], required=True), 'role': row['role']} for row in rows], 'next_cursor': cursor}
    match = re.fullmatch(r'/casos/([^/]+)/tareas(?:/([^/]+))?', path)
    if match and ((not match[2] and method == 'POST') or (match[2] and method == 'PATCH')):
        from desk_calendar import task
        return 201 if method == 'POST' else 200, task(event, actor, match[1], body, match[2])
    match = re.fullmatch(r'/casos/([^/]+)/citas', path)
    if match and method == 'POST':
        from desk_calendar import link_appointment
        return 201, link_appointment(event, actor, match[1], body)
    if path == '/agenda' and method == 'GET':
        from desk_calendar import agenda
        return 200, agenda(params)
    if path == '/metricas' and method == 'GET':
        period = params.get('period', '')
        if not re.fullmatch(r'\d{4}-(0[1-9]|1[0-2])', period):
            raise ApiError(422, 'INVALID_PERIOD', 'Periodo YYYY-MM requerido')
        rows, cursor = r.query('METRIC#' + period, params)
        return 200, {'items': rows, 'next_cursor': cursor, 'period': period, 'consistency': 'ASYNCHRONOUS',
                     'currency_aggregation': 'SEPARATE', 'commercial_win_is_not_judicial_result': True}
    if path == '/metricas/rebuild' and method == 'POST':
        return 202, metrics.start(event, actor, body)
    if path == '/metricas/vencido' and method == 'POST':
        return 202, metrics.overdue_start(event, actor, body)
    match = re.fullmatch(r'/jobs/([^/]+)(/step)?', path)
    if match:
        if method == 'GET' and not match[2]:
            return 200, r.get('JOB#' + match[1], required=True)
        if method == 'POST' and match[2]:
            return 200, metrics.step(event, actor, match[1], body)
    raise ApiError(404, 'NOT_FOUND', 'Ruta inexistente')


def response(status, data, request_id):
    def encode(value):
        if isinstance(value, Decimal):
            return int(value) if value == value.to_integral_value() else str(value)
        raise TypeError()
    return {'statusCode': status, 'headers': {'Content-Type': 'application/json', 'Cache-Control': 'no-store'},
            'body': json.dumps({**data, 'request_id': request_id}, default=encode, ensure_ascii=False)}


def lambda_handler(event, context):
    request_id = event.get('requestContext', {}).get('requestId') or str(uuid.uuid4())
    try:
        actor = require_admin(event)
        method = event.get('requestContext', {}).get('http', {}).get('method', '')
        root = '/api/admin/despacho'
        raw = event.get('rawPath', '')
        if not raw.startswith(root + '/'):
            raise ApiError(404, 'NOT_FOUND', 'Ruta inexistente')
        path = raw[len(root):]
        body = body_of(event) if method in {'POST', 'PATCH'} else {}
        if method in {'POST', 'PATCH'} and os.getenv('ENVIRONMENT') == 'production' and os.getenv('PILOT_ENABLED', 'false') != 'true':
            raise ApiError(503, 'PILOT_NOT_ENABLED', 'Escrituras del despacho pendientes de habilitar para el piloto')
        if method in {'POST', 'PATCH'}:
            previous = r.replay(event, actor, method + path, body)
            if previous is not None:
                status = 202 if path in {'/metricas/rebuild', '/metricas/vencido'} else 200 if method == 'PATCH' or path.endswith('/step') else 201
                return response(status, {'data': previous}, request_id)
        status, data = dispatch(event, actor, method, path, body)
        return response(status, {'data': data}, request_id)
    except ApiError as exc:
        return response(exc.status, {'error': {'code': exc.code, 'message': exc.message}}, request_id)
    except Exception as exc:
        code = exc.response['Error']['Code'] if isinstance(exc, ClientError) else type(exc).__name__
        print(json.dumps({'request_id': request_id, 'code': code}))
        return response(503, {'error': {'code': 'DEPENDENCY_ERROR', 'message': 'Servicio temporalmente no disponible'}}, request_id)
