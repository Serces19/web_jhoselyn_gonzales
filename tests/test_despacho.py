import importlib
import json
from pathlib import Path
import sys

import boto3
import pytest
from conftest import event


@pytest.fixture
def desk(api, monkeypatch):
    monkeypatch.setenv('CORE_TABLE', 'DespachoCore')
    api[1].create_table(TableName='DespachoCore', BillingMode='PAY_PER_REQUEST',
        KeySchema=[{'AttributeName': 'pk', 'KeyType': 'HASH'}, {'AttributeName': 'sk', 'KeyType': 'RANGE'}],
        AttributeDefinitions=[{'AttributeName': k, 'AttributeType': 'S'} for k in ['pk', 'sk', 'gsi1pk', 'gsi1sk', 'gsi2pk', 'gsi2sk']],
        GlobalSecondaryIndexes=[{'IndexName': name, 'KeySchema': [{'AttributeName': name.lower() + 'pk', 'KeyType': 'HASH'},
             {'AttributeName': name.lower() + 'sk', 'KeyType': 'RANGE'}], 'Projection': {'ProjectionType': 'KEYS_ONLY'}} for name in ['GSI1', 'GSI2']])
    monkeypatch.syspath_prepend(str(Path('infrastructure/lambda_despacho').resolve()))
    monkeypatch.setenv('APPOINTMENTS_TABLE', 'Appointments')
    for module in ['despacho_handler', 'repository', 'model', 'crm', 'finance', 'desk_calendar', 'worker', 'metrics', 'migration']:
        sys.modules.pop(module, None)
    handler = importlib.import_module('despacho_handler')

    def invoke(method, path, body=None, key='command', query=None, admin=True):
        response = handler.lambda_handler(event(method, '/api/admin/despacho' + path, body, admin, key=key, query=query), None)
        return response['statusCode'], json.loads(response['body'])
    return invoke, api[1].Table('DespachoCore')


def person(desk, name='Offline Person', key='person'):
    status, response = desk[0]('POST', '/personas', {'display_name': name, 'contacts': [{'kind': 'PHONE', 'value': '+59170000000'}]}, key)
    assert status == 201, response
    return response['data']['person_id']


def case(desk):
    identifier = person(desk)
    status, result = desk[0]('POST', '/casos', {'title': 'Offline fixture', 'original_narrative': 'Original test narrative',
        'area': 'Civil', 'parties': [{'person_id': identifier, 'role': 'CLIENTE'}]}, 'case')
    assert status == 201, result
    return identifier, result['data']['case_id']


def test_desk_no_public_access(desk):
    assert desk[0]('GET', '/personas', admin=False)[0] == 401
    assert desk[0]('GET', '/config')[0] == 200


def test_production_review_mode_rejects_writes_before_database_changes(desk, monkeypatch):
    monkeypatch.setenv('ENVIRONMENT', 'production')
    monkeypatch.setenv('PILOT_ENABLED', 'false')
    assert desk[0]('GET', '/personas')[0] == 200
    status, response = desk[0]('POST', '/personas', {'display_name': 'Must never persist'}, 'blocked')
    assert status == 503 and response['error']['code'] == 'PILOT_NOT_ENABLED'
    assert desk[1].scan()['Count'] == 0


def test_shared_phone_is_not_unique_and_name_query_is_paginated(desk):
    first, second = person(desk, 'José Uno', 'one'), person(desk, 'José Dos', 'two')
    status, response = desk[0]('GET', '/conflictos', query={'phone': '+591 7000 0000'})
    assert status == 200 and {p['id'] for p in response['data']['candidates']} == {first, second}
    status, response = desk[0]('GET', '/personas', query={'name': 'JOSE', 'limit': '1'})
    assert status == 200 and response['data']['next_cursor']
    cursor = response['data']['next_cursor']
    assert desk[0]('GET', '/personas', query={'name': 'Otra', 'cursor': cursor})[0] == 400
    _, tail = desk[0]('GET', '/personas', query={'name': 'jose', 'limit': '1', 'cursor': cursor})
    assert response['data']['items'][0]['id'] != tail['data']['items'][0]['id']


def test_intake_is_atomic_and_replay_cannot_duplicate_case(desk):
    body = {'person': {'display_name': 'Offline intake'}, 'case': {'title': 'Fixture', 'area': 'Civil',
        'original_narrative': 'Original', 'parties': [{'person_id': 'missing', 'role': 'CONTRAPARTE'}]}}
    assert desk[0]('POST', '/intake', body)[0] == 404
    assert desk[1].scan()['Count'] == 0
    body['case']['parties'] = []
    status, created = desk[0]('POST', '/intake', body)
    assert status == 201
    assert desk[0]('POST', '/intake', body)[1]['data'] == created['data']
    assert len([row for row in desk[1].scan()['Items'] if row.get('entity_type') == 'CASE']) == 1


def test_case_review_is_bound_to_current_person_version(desk):
    person_id, case_id = case(desk)
    assert desk[0]('PATCH', '/casos/' + case_id, {'expected_version': 1, 'state': 'ACTIVO'}, 'activate')[0] == 409
    review = {'expected_version': 1, 'conflict_decision': 'APROBADO', 'conflict_note': 'Reviewed offline fixture'}
    assert desk[0]('PATCH', '/casos/' + case_id, review, 'review')[0] == 200
    # Replay after a version change returns original result rather than a spurious conflict.
    assert desk[0]('PATCH', '/casos/' + case_id, review, 'review')[0] == 200
    assert desk[0]('PATCH', '/personas/' + person_id, {'expected_version': 1, 'display_name': 'Changed identity'}, 'edit')[0] == 200
    assert desk[0]('PATCH', '/casos/' + case_id, {'expected_version': 2, 'state': 'ACTIVO'}, 'activate2')[0] == 409


def test_opportunity_loss_reason_history_and_worker_replay(desk):
    person_id = person(desk)
    status, result = desk[0]('POST', '/oportunidades', {'person_id': person_id, 'summary': 'Fixture', 'source': 'Offline'}, 'opp')
    identifier = result['data']['opportunity_id']
    assert desk[0]('PATCH', '/oportunidades/' + identifier, {'expected_version': 1, 'stage': 'PERDIDO'}, 'lose')[0] == 422
    assert desk[0]('PATCH', '/oportunidades/' + identifier, {'expected_version': 1, 'stage': 'GANADO'}, 'win')[0] == 200
    worker = importlib.import_module('worker')
    outbox = [row for row in desk[1].scan()['Items'] if row.get('entity_type') == 'OUTBOX']
    for row in reversed(outbox):
        worker.apply(row['id']); worker.apply(row['id'])
    rows = [row for row in desk[1].scan()['Items'] if row['pk'].startswith('METRIC#')]
    assert next(row for row in rows if row['sk'] == 'OPP#GANADO')['value'] == 1
    assert next(row for row in rows if row['sk'] == 'OPP#NUEVO')['value'] == 0


def test_payment_allocation_reversal_and_business_dedupe(desk):
    person_id, case_id = case(desk)
    base = '/casos/' + case_id
    status, result = desk[0]('POST', base + '/honorarios', {'currency': 'BOB', 'amount': '123.45', 'effective_date': '2026-10-14',
        'description': 'Offline agreement', 'installments': [{'due_date': '2026-10-15', 'amount': '123.45'}]}, 'agreement')
    assert status == 201, result
    quota = result['data']['installment_ids'][0]
    payload = {'currency': 'BOB', 'amount': '100', 'effective_date': '2026-10-14', 'confirmed': True,
        'payer_id': person_id, 'method': 'OFFLINE', 'reference': 'fixture-1', 'allocations': [{'installment_id': quota, 'amount': '100'}]}
    status, payment = desk[0]('POST', base + '/pagos', payload, 'pay')
    assert status == 201, payment
    assert desk[0]('POST', base + '/pagos', payload, 'another-command')[0] == 409
    assert desk[0]('POST', base + '/pagos', {**payload, 'amount': '30', 'reference': 'fixture-2',
        'allocations': [{'installment_id': quota, 'amount': '30'}]}, 'over')[0] == 409
    table = desk[1]
    assert table.get_item(Key={'pk': 'CASE#' + case_id, 'sk': 'INSTALLMENT#' + quota})['Item']['paid_minor'] == 10000
    status, result = desk[0]('POST', base + '/pagos/' + payment['data']['payment_id'] + '/reversion',
        {'expected_version': 1, 'reason': 'Accounting fixture reversal', 'effective_date': '2026-10-14'}, 'reverse')
    assert status == 201, result
    assert table.get_item(Key={'pk': 'CASE#' + case_id, 'sk': 'INSTALLMENT#' + quota})['Item']['paid_minor'] == 0
    assert table.get_item(Key={'pk': 'CASE#' + case_id, 'sk': 'BALANCE#BOB'})['Item']['received_minor'] == 0


def test_currency_mismatch_and_unconfirmed_payment_never_write(desk):
    person_id, case_id = case(desk)
    before = desk[1].scan()['Count']
    payload = {'currency': 'USD', 'amount': '10', 'effective_date': '2026-10-14', 'payer_id': person_id}
    assert desk[0]('POST', '/casos/' + case_id + '/pagos', payload)[0] == 422
    assert desk[1].scan()['Count'] == before


def test_task_deadline_requires_source_and_explicit_zone(desk):
    _, case_id = case(desk)
    payload = {'kind': 'PLAZO', 'title': 'Offline deadline', 'due_at': '2026-11-01T09:00:00'}
    assert desk[0]('POST', '/casos/' + case_id + '/tareas', payload)[0] == 422
    payload.update(due_at='2026-11-01T09:00:00-04:00')
    assert desk[0]('POST', '/casos/' + case_id + '/tareas', payload)[0] == 422
    payload.update(manual_confirmed=True, date_source='Offline test instruction')
    assert desk[0]('POST', '/casos/' + case_id + '/tareas', payload)[0] == 201


def test_rebuild_waits_for_worker_and_reconciles_corrupt_counter(desk):
    pid = person(desk)
    _, result = desk[0]('POST', '/oportunidades', {'person_id': pid, 'summary': 'Fixture', 'source': 'Offline'}, 'opp')
    period = desk[1].get_item(Key={'pk': 'OPP#' + result['data']['opportunity_id'], 'sk': 'META'})['Item']['cohort_period']
    status, started = desk[0]('POST', '/metricas/rebuild', {'period': period}, 'rebuild')
    assert status == 202
    job = started['data']['job_id']
    status, step = desk[0]('POST', '/jobs/' + job + '/step', {'expected_version': 1}, 'step-1')
    assert status == 200 and step['data']['status'] == 'WAITING_WORKER'
    worker = importlib.import_module('worker')
    for item in desk[1].scan()['Items']:
        if item.get('entity_type') == 'OUTBOX': worker.apply(item['id'])
    version = step['data']['version']
    desk[1].update_item(Key={'pk': 'METRIC#' + period, 'sk': 'OPP#NUEVO'}, UpdateExpression='SET #v = :v',
                         ExpressionAttributeNames={'#v': 'value'}, ExpressionAttributeValues={':v': 999})
    status, result = desk[0]('POST', '/jobs/' + job + '/step', {'expected_version': version}, 'step-final')
    assert status == 200 and result['data']['status'] == 'DONE'
    assert desk[1].get_item(Key={'pk': 'METRIC#' + period, 'sk': 'OPP#NUEVO'})['Item']['value'] == 1


def test_original_narrative_and_person_client_history_remain_intact(desk):
    pid, case_id = case(desk)
    assert desk[0]('PATCH', '/personas/' + pid, {'expected_version': 1, 'is_client': True}, 'client-on')[0] == 200
    assert desk[0]('PATCH', '/personas/' + pid, {'expected_version': 2, 'is_client': False}, 'client-off')[0] == 200
    assert desk[0]('PATCH', '/personas/' + pid, {'expected_version': 3, 'is_client': True}, 'client-again')[0] == 200
    assert desk[0]('PATCH', '/casos/' + case_id, {'expected_version': 1, 'title': 'Corrected title', 'original_narrative': 'Altered'}, 'edit-case')[0] == 200
    assert desk[0]('GET', '/casos/' + case_id)[1]['data']['item']['original_narrative'] == 'Original test narrative'


def test_later_allocation_updates_balances_and_full_reversal(desk):
    pid, cid = case(desk)
    base = '/casos/' + cid
    _, agreement = desk[0]('POST', base + '/honorarios', {'currency': 'BOB', 'amount': '100', 'effective_date': '2026-10-14',
        'description': 'Offline', 'installments': [{'due_date': '2026-11-01', 'amount': '100'}]}, 'agreement')
    quota = agreement['data']['installment_ids'][0]
    _, payment = desk[0]('POST', base + '/pagos', {'currency': 'BOB', 'amount': '100', 'effective_date': '2026-10-14',
        'confirmed': True, 'payer_id': pid, 'reference': 'later', 'method': 'OFFLINE'}, 'payment')
    payment_path = base + '/pagos/' + payment['data']['payment_id']
    allocation = {'expected_version': 1, 'allocations': [{'installment_id': quota, 'amount': '60'}]}
    assert desk[0]('POST', payment_path + '/asignaciones', allocation, 'allocation')[0] == 201
    assert desk[0]('POST', payment_path + '/asignaciones', allocation, 'allocation')[0] == 201
    assert desk[1].get_item(Key={'pk': 'CASE#' + cid, 'sk': 'BALANCE#BOB'})['Item']['unassigned_minor'] == 4000
    assert desk[0]('POST', payment_path + '/reversion', {'expected_version': 2, 'reason': 'Offline reversal', 'effective_date': '2026-10-14'}, 'reverse')[0] == 201
    assert desk[1].get_item(Key={'pk': 'CASE#' + cid, 'sk': 'INSTALLMENT#' + quota})['Item']['paid_minor'] == 0


def test_client_funds_cannot_be_reversed_after_use(desk):
    pid, cid = case(desk)
    base = '/casos/' + cid
    _, payment = desk[0]('POST', base + '/pagos', {'currency': 'BOB', 'amount': '100', 'effective_date': '2026-10-14',
        'confirmed': True, 'payer_id': pid, 'kind': 'FONDOS_CLIENTE', 'reference': 'funds', 'method': 'OFFLINE'}, 'funds')
    assert desk[0]('POST', base + '/gastos', {'currency': 'BOB', 'amount': '20', 'effective_date': '2026-10-14',
        'kind': 'FONDOS_CLIENTE', 'reference': 'spent', 'description': 'Offline expense'}, 'expense')[0] == 201
    assert desk[0]('POST', base + '/pagos/' + payment['data']['payment_id'] + '/reversion',
        {'expected_version': 1, 'reason': 'Offline', 'effective_date': '2026-10-14'}, 'reverse')[0] == 409


def test_legacy_import_is_idempotent_and_changed_origin_requires_review(desk):
    migration = importlib.import_module('migration')
    source = {'lead_id': 'offline-legacy', 'client_name': 'Offline source', 'case_details': 'Preserve original', 'stage': 'GANADO', 'budget': '100'}
    ev = {'headers': {'idempotency-key': 'legacy'}}
    first = migration.import_lead(ev, 'offline-operator', source)
    assert migration.import_lead(ev, 'offline-operator', source) == first
    assert not any(row.get('entity_type') == 'PAYMENT' for row in desk[1].scan()['Items'])
    with pytest.raises(Exception, match='origen cambió'):
        migration.import_lead(ev, 'offline-operator', {**source, 'budget': '200'})
    unresolved = migration.import_lead({'headers': {'idempotency-key': 'unresolved'}}, 'offline-operator',
                                     {'lead_id': 'unknown', 'client_name': 'Cliente web', 'case_details': 'Original'})
    assert unresolved['person_id'] is None and unresolved['status'] == 'UNRESOLVED_REQUIRES_REVIEW'


def test_existing_appointment_link_is_unique_and_preserves_booking(desk):
    _, cid = case(desk)
    appointments = boto3.resource('dynamodb').Table('Appointments')
    appointments.put_item(Item={'appointment_id': 'offline-appointment', 'version': 1, 'status': 'PENDING'})
    payload = {'expected_version': 1, 'appointment_id': 'offline-appointment'}
    assert desk[0]('POST', '/casos/' + cid + '/citas', payload, 'link')[0] == 201
    assert desk[0]('POST', '/casos/' + cid + '/citas', payload, 'link')[0] == 201
    assert appointments.get_item(Key={'appointment_id': 'offline-appointment'})['Item']['status'] == 'PENDING'
    assert desk[0]('POST', '/casos/' + cid + '/citas', {**payload, 'expected_version': 2}, 'duplicate')[0] == 409


def test_opportunity_case_link_and_manual_invoice_are_explicit(desk):
    pid = person(desk)
    _, opp = desk[0]('POST', '/oportunidades', {'person_id': pid, 'summary': 'Offline opportunity', 'source': 'Offline'}, 'opp')
    oid = opp['data']['opportunity_id']
    status, result = desk[0]('POST', '/intake', {'person_id': pid, 'case': {'title': 'Offline', 'area': 'Civil',
        'original_narrative': 'Original', 'opportunity_id': oid}}, 'intake')
    assert status == 201
    cid = result['data']['case_id']
    assert desk[1].get_item(Key={'pk': 'OPP#' + oid, 'sk': 'CASE#' + cid})['Item']['target_pk'] == 'CASE#' + cid
    assert desk[0]('GET', '/personas/' + pid + '/casos')[1]['data']['items'][0]['id'] == cid
    status, payment = desk[0]('POST', '/casos/' + cid + '/pagos', {'currency': 'BOB', 'amount': '10',
        'effective_date': '2026-10-14', 'confirmed': True, 'payer_id': pid, 'reference': 'manual', 'method': 'OFFLINE',
        'invoice_metadata': {'number': 'offline-test'}}, 'invoice')
    assert status == 201
    row = desk[1].get_item(Key={'pk': 'CASE#' + cid, 'sk': 'PAYMENT#' + payment['data']['payment_id']})['Item']
    assert row['invoice_metadata']['siat_issued_by_system'] is False
    assert row['invoice_metadata']['attachment_status'] == 'NOT_UPLOADED_E2_PENDING'


def test_overdue_report_uses_all_months_and_current_unpaid_currency_balances(desk):
    pid, cid = case(desk)
    _, agreement = desk[0]('POST', '/casos/' + cid + '/honorarios', {'currency': 'BOB', 'amount': '100', 'effective_date': '2026-10-14',
        'description': 'Offline', 'installments': [{'due_date': '2026-09-01', 'amount': '40'}, {'due_date': '2026-10-01', 'amount': '60'}]}, 'agreement')
    _, job = desk[0]('POST', '/metricas/vencido', {'cutoff_date': '2026-10-14'}, 'overdue')
    job = job['data']
    for i in range(4):
        status, response = desk[0]('POST', '/jobs/' + job['job_id'] + '/step', {'expected_version': job['version']}, 'step-' + str(i))
        assert status == 200
        job = response['data']
        if job['status'] == 'DONE': break
    assert job['status'] == 'DONE' and job['totals'] == {'BOB': 10000}
    # DONE cannot advance or add its final page a second time with a new command key.
    assert desk[0]('POST', '/jobs/' + job['job_id'] + '/step', {'expected_version': job['version']}, 'done-again')[1]['data']['totals'] == {'BOB': 10000}
    _, fresh = desk[0]('POST', '/metricas/vencido', {'cutoff_date': '2026-10-14'}, 'fresh')
    assert desk[0]('POST', '/casos/' + cid + '/pagos', {'currency': 'BOB', 'amount': '20', 'effective_date': '2026-10-14',
        'confirmed': True, 'payer_id': pid, 'reference': 'reduce-due', 'method': 'OFFLINE',
        'allocations': [{'installment_id': agreement['data']['installment_ids'][0], 'amount': '20'}]}, 'reduce')[0] == 201
    assert desk[0]('POST', '/jobs/' + fresh['data']['job_id'] + '/step', {'expected_version': 1}, 'changed')[0] == 409


def test_adding_parties_requires_draft_and_invalidates_review(desk):
    _, cid = case(desk)
    pid = person(desk, 'Offline additional party', 'additional')
    body = {'expected_version': 1, 'conflict_decision': 'APROBADO', 'conflict_note': 'Offline review'}
    assert desk[0]('PATCH', '/casos/' + cid, body, 'review')[0] == 200
    assert desk[0]('POST', '/casos/' + cid + '/partes', {'expected_version': 2, 'person_id': pid, 'role': 'CONTRAPARTE'}, 'party')[0] == 201
    assert desk[0]('GET', '/casos/' + cid)[1]['data']['review_valid'] is False
    assert desk[0]('PATCH', '/casos/' + cid, {'expected_version': 3, 'state': 'ACTIVO'}, 'activate')[0] == 409


def test_week_agenda_crosses_month_boundary_with_bound_cursor(desk):
    _, cid = case(desk)
    for key, due in [('oct', '2026-10-31T23:00:00-04:00'), ('nov', '2026-11-01T09:00:00-04:00')]:
        assert desk[0]('POST', '/casos/' + cid + '/tareas', {'kind': 'TAREA', 'title': key, 'due_at': due}, key)[0] == 201
    query = {'view': 'SEMANA', 'date': '2026-10-30', 'limit': '1'}
    status, first = desk[0]('GET', '/agenda', query=query)
    assert status == 200 and first['data']['items'][0]['title'] == 'oct'
    cursor = first['data']['next_cursor']
    assert cursor
    assert desk[0]('GET', '/agenda', query={**query, 'date': '2026-10-29', 'cursor': cursor})[0] == 400
    names = [row['title'] for row in first['data']['items']]
    for _ in range(4):
        if not cursor: break
        _, page = desk[0]('GET', '/agenda', query={**query, 'cursor': cursor})
        names += [row['title'] for row in page['data']['items']]
        cursor = page['data']['next_cursor']
    assert names == ['oct', 'nov']
