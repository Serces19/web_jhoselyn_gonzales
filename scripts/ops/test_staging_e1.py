"""Live private E1 contracts. Disposable AWS prefix only; no messages or model calls."""
import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import json
from pathlib import Path
import secrets
import time
import urllib.error
import urllib.request
from zoneinfo import ZoneInfo

import boto3

ROOT = Path(__file__).resolve().parents[2]
PREFIX = 'staging-e1-'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--profile', required=True)
    args = parser.parse_args()
    session = boto3.Session(profile_name=args.profile, region_name='us-east-1')
    assert session.client('sts').get_caller_identity()['Account'] == '295894327291'
    cognito, gateway = session.client('cognito-idp'), session.client('apigatewayv2')
    pools = [p for page in cognito.get_paginator('list_user_pools').paginate(MaxResults=60)
             for p in page['UserPools'] if p['Name'] == PREFIX + 'jhoselyn_web_pool']
    assert len(pools) == 1
    pool = pools[0]['Id']
    client = next(c['ClientId'] for c in cognito.list_user_pool_clients(UserPoolId=pool)['UserPoolClients']
                  if c['ClientName'] == PREFIX + 'jhoselyn_web_app_client')
    apis = [a for page in gateway.get_paginator('get_apis').paginate() for a in page['Items']
            if a['Name'] == PREFIX + 'jhoselyn_web_http_api']
    assert len(apis) == 1
    endpoint = apis[0]['ApiEndpoint']
    report = {'checked_at_utc': datetime.now().astimezone().isoformat(), 'environment': PREFIX,
              'checks': [], 'latency_ms': {}, 'fixtures': 'synthetic, API-only, deleted before teardown'}
    users, tokens, latencies = [], {}, []
    db = session.resource('dynamodb')
    core = db.Table(PREFIX + 'DespachoCore')
    root = '/api/admin/despacho'

    def check(label, condition):
        report['checks'].append({'name': label, 'passed': bool(condition)})
        if not condition: raise AssertionError(label)

    def request(method, path, body=None, token=None, key=None):
        headers = {'Content-Type': 'application/json'}
        if token: headers['Authorization'] = 'Bearer ' + token
        if key: headers['Idempotency-Key'] = key
        start = time.perf_counter()
        try:
            with urllib.request.urlopen(urllib.request.Request(endpoint + root + path, method=method,
                    headers=headers, data=json.dumps(body).encode() if body is not None else None), timeout=40) as response:
                result = response.status, json.load(response)
        except urllib.error.HTTPError as error:
            result = error.code, json.loads(error.read())
        latencies.append(round((time.perf_counter() - start) * 1000, 2))
        return result

    def cleanup_table(table):
        keys = [entry['AttributeName'] for entry in table.key_schema]
        params = {}
        while True:
            page = table.scan(**params)
            with table.batch_writer() as batch:
                for item in page.get('Items', []): batch.delete_item(Key={key: item[key] for key in keys})
            if not page.get('LastEvaluatedKey'): break
            params = {'ExclusiveStartKey': page['LastEvaluatedKey']}

    try:
        run = secrets.token_hex(4)
        for role in ['admin', 'ordinary']:
            username = 'e1-' + role + '-' + run + '@example.invalid'
            result = cognito.admin_create_user(UserPoolId=pool, Username=username, MessageAction='SUPPRESS',
                UserAttributes=[{'Name': 'email', 'Value': username}, {'Name': 'email_verified', 'Value': 'true'}])
            username = result['User']['Username']; users.append(username)
            password = 'E1!' + secrets.token_urlsafe(30) + 'aZ9'
            cognito.admin_set_user_password(UserPoolId=pool, Username=username, Password=password, Permanent=True)
            if role == 'admin': cognito.admin_add_user_to_group(UserPoolId=pool, Username=username, GroupName='Admins')
            tokens[role] = cognito.initiate_auth(ClientId=client, AuthFlow='USER_PASSWORD_AUTH',
                AuthParameters={'USERNAME': username, 'PASSWORD': password})['AuthenticationResult']
        admin = tokens['admin']['AccessToken']
        check('anonymous denied', request('GET', '/personas')[0] == 401)
        check('non-admin denied', request('GET', '/personas', token=tokens['ordinary']['AccessToken'])[0] == 403)
        check('ID token denied', request('GET', '/personas', token=tokens['admin']['IdToken'])[0] in [401, 403])
        check('admin access', request('GET', '/config', token=admin)[0] == 200)
        iam = session.client('iam')
        role = iam.get_role(RoleName=PREFIX + 'serverless_lambda_exec_role')['Role']['Arn']
        arn = core.table_arn
        simulation = iam.simulate_principal_policy(PolicySourceArn=role,
            ActionNames=['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:PutItem'], ResourceArns=[arn])
        check('public Lambda IAM denies Core', all(row['EvalDecision'] == 'implicitDeny' for row in simulation['EvaluationResults']))
        persons = []
        for i in range(2):
            status, row = request('POST', '/personas', {'display_name': 'E1 API-only fixture ' + str(i),
                'contacts': [{'kind': 'PHONE', 'value': '+59170000000'}]}, admin, 'person-' + str(i))
            check('person create ' + str(i), status == 201); persons.append(row['data']['person_id'])
        check('shared contact preserves identities', len(request('GET', '/conflictos?phone=%2B59170000000', token=admin)[1]['data']['candidates']) == 2)
        intake = {'person_id': persons[0], 'case': {'title': 'E1 API-only fixture', 'area': 'Civil', 'original_narrative': 'Synthetic isolated contract test',
            'parties': [{'person_id': persons[1], 'role': 'CONTRAPARTE'}]}}
        status, row = request('POST', '/intake', intake, admin, 'intake')
        check('atomic intake IAM', status == 201)
        cid = row['data']['case_id']; base = '/casos/' + cid
        check('intake replay', request('POST', '/intake', intake, admin, 'intake')[1]['data'] == row['data'])
        check('activation without review denied', request('PATCH', base, {'expected_version': 1, 'state': 'ACTIVO'}, admin, 'no-review')[0] == 409)
        review = {'expected_version': 1, 'state': 'ACTIVO', 'conflict_decision': 'APROBADO', 'conflict_note': 'API-only isolated fixture review'}
        check('reviewed activation', request('PATCH', base, review, admin, 'review')[0] == 200)
        check('stale case update denied', request('PATCH', base, review, admin, 'stale')[0] == 409)
        status, agreement = request('POST', base + '/honorarios', {'currency': 'BOB', 'amount': '100', 'effective_date': '2026-10-14',
            'description': 'API-only fixture', 'installments': [{'due_date': '2026-11-01', 'amount': '100'}]}, admin, 'agreement')
        check('agreement real transaction', status == 201)
        quota = agreement['data']['installment_ids'][0]
        payment = {'currency': 'BOB', 'amount': '70', 'effective_date': '2026-10-14', 'confirmed': True,
                   'payer_id': persons[0], 'method': 'API_TEST', 'allocations': [{'installment_id': quota, 'amount': '70'}]}
        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(lambda i: request('POST', base + '/pagos', {**payment, 'reference': 'race-' + str(i)}, admin, 'race-' + str(i)), range(2)))
        check('concurrent allocations cannot exceed quota', sorted(row[0] for row in results) == [201, 409])
        winner = next(row for row in results if row[0] == 201)[1]['data']['payment_id']
        check('full accounting reversal', request('POST', base + '/pagos/' + winner + '/reversion',
            {'expected_version': 1, 'reason': 'API-only fixture reversal', 'effective_date': '2026-10-14'}, admin, 'reverse')[0] == 201)
        balance = core.get_item(Key={'pk': 'CASE#' + cid, 'sk': 'BALANCE#BOB'}, ConsistentRead=True)['Item']
        check('balance and quota restored', balance['received_minor'] == 0 and balance['allocated_minor'] == 0)
        db.Table(PREFIX + 'Appointments').put_item(Item={'appointment_id': 'e1-fixture', 'version': 1, 'status': 'PENDING'})
        check('link legacy appointment real IAM', request('POST', base + '/citas', {'expected_version': 2, 'appointment_id': 'e1-fixture'}, admin, 'link')[0] == 201)
        check('task manual source required', request('POST', base + '/tareas', {'kind': 'PLAZO', 'title': 'API-only fixture', 'due_at': '2026-11-01T09:00:00-04:00'}, admin, 'task-bad')[0] == 422)
        check('task manual date', request('POST', base + '/tareas', {'kind': 'PLAZO', 'title': 'API-only fixture', 'due_at': '2026-11-01T09:00:00-04:00',
              'manual_confirmed': True, 'date_source': 'API-only test instruction'}, admin, 'task')[0] == 201)
        status, opp = request('POST', '/oportunidades', {'person_id': persons[0], 'summary': 'API-only fixture', 'source': 'API_TEST'}, admin, 'opp')
        check('opportunity created', status == 201)
        status, linked = request('POST', '/intake', {'person_id': persons[0], 'case': {'title': 'Linked API-only fixture', 'area': 'Civil',
             'original_narrative': 'Isolated original narrative', 'opportunity_id': opp['data']['opportunity_id']}}, admin, 'linked-intake')
        check('opportunity case link', status == 201)
        linked_case = linked['data']['case_id']
        check('person historical case relations', len(request('GET', '/personas/' + persons[0] + '/casos', token=admin)[1]['data']['items']) == 2)
        status, manual = request('POST', base + '/pagos', {**payment, 'allocations': [], 'reference': 'later-payment',
            'invoice_metadata': {'number': 'API-only external invoice reference'}}, admin, 'later-payment')
        check('manual invoice metadata', status == 201)
        manual_id = manual['data']['payment_id']
        check('later allocation', request('POST', base + '/pagos/' + manual_id + '/asignaciones',
              {'expected_version': 1, 'allocations': [{'installment_id': quota, 'amount': '20'}]}, admin, 'later-allocation')[0] == 201)
        status, due_job = request('POST', '/metricas/vencido', {'cutoff_date': '2026-11-02'}, admin, 'overdue')
        check('overdue job accepted', status == 202)
        due_job = due_job['data']
        for i in range(5):
            status, next_due = request('POST', '/jobs/' + due_job['job_id'] + '/step', {'expected_version': due_job['version']}, admin, 'due-step-' + str(i))
            check('overdue bounded step ' + str(i), status == 200); due_job = next_due['data']
            if due_job['status'] == 'DONE': break
        check('overdue all months uses actual unpaid balance', due_job['status'] == 'DONE' and due_job['totals'] == {'BOB': 8000})
        check('day agenda explicit time zone', len(request('GET', '/agenda?view=DIA&date=2026-11-01', token=admin)[1]['data']['items']) == 1)
        check('incremental parties invalidate review', request('POST', '/casos/' + linked_case + '/partes',
              {'expected_version': 1, 'person_id': persons[1], 'role': 'PAGADOR'}, admin, 'party')[0] == 201)
        period = datetime.now(ZoneInfo('America/La_Paz')).strftime('%Y-%m')
        deadline = time.monotonic() + 100
        while time.monotonic() < deadline:
            row = core.get_item(Key={'pk': 'METRIC#' + period, 'sk': 'OPP#NUEVO'}, ConsistentRead=True).get('Item')
            if row and row['value'] == 1: break
            time.sleep(3)
        check('real Stream FIFO worker metrics', bool(row) and row['value'] == 1)
        status, job = request('POST', '/metricas/rebuild', {'period': period}, admin, 'rebuild')
        check('rebuild job accepted', status == 202)
        job = job['data']
        for i in range(20):
            status, response = request('POST', '/jobs/' + job['job_id'] + '/step', {'expected_version': job['version']}, admin, 'step-' + str(i))
            check('rebuild step ' + str(i), status == 200)
            job = response['data']
            if job['status'] == 'DONE': break
            time.sleep(3)
        check('rebuild completed without double counting', job['status'] == 'DONE' and
            core.get_item(Key={'pk': 'METRIC#' + period, 'sk': 'OPP#NUEVO'}, ConsistentRead=True)['Item']['value'] == 1)
        lamb = session.client('lambda')
        relay_mapping = lamb.list_event_source_mappings(FunctionName=PREFIX + 'jhoselyn-despacho-relay')['EventSourceMappings'][0]['UUID']
        lamb.update_event_source_mapping(UUID=relay_mapping, Enabled=False)
        for _ in range(40):
            if lamb.get_event_source_mapping(UUID=relay_mapping)['State'] == 'Disabled': break
            time.sleep(2)
        check('relay stopped for recovery test', lamb.get_event_source_mapping(UUID=relay_mapping)['State'] == 'Disabled')
        status, extra = request('POST', '/oportunidades', {'person_id': persons[0], 'summary': 'API-only recovery fixture', 'source': 'API_TEST'}, admin, 'recovery-opp')
        check('commit succeeds with relay unavailable', status == 201)
        deadline = time.monotonic() + 100
        while time.monotonic() < deadline:
            invoke = lamb.invoke(FunctionName=PREFIX + 'jhoselyn-despacho-reconcile', Payload=b'{}')
            check('reconcile invokes real worker IAM', 'FunctionError' not in invoke)
            row = core.get_item(Key={'pk': 'METRIC#' + period, 'sk': 'OPP#NUEVO'}, ConsistentRead=True).get('Item')
            if row and row['value'] == 2: break
            time.sleep(3)
        check('outbox recovered after commit without stream delivery', row and row['value'] == 2)
        # Deliver an already consumed event directly to verify durable dedupe beyond FIFO's window.
        from boto3.dynamodb.conditions import Key
        ledger = core.query(KeyConditionExpression=Key('pk').eq('LEDGER#' + period), ConsistentRead=True)['Items']
        event_id = next(item['event_id'] for item in ledger if item['deltas'].get('OPP#NUEVO') == 1)
        duplicated = lamb.invoke(FunctionName=PREFIX + 'jhoselyn-despacho-worker', Payload=json.dumps({'Records': [
            {'messageId': 'duplicate', 'body': json.dumps({'event_id': event_id})}]}).encode())
        check('worker duplicate invokes successfully', 'FunctionError' not in duplicated)
        check('duplicate after rebuild does not increment', core.get_item(Key={'pk': 'METRIC#' + period, 'sk': 'OPP#NUEVO'}, ConsistentRead=True)['Item']['value'] == 2)
        sorted_ms = sorted(latencies)
        report['latency_ms'] = {'samples': len(sorted_ms), 'min': min(sorted_ms), 'median': sorted_ms[len(sorted_ms)//2],
                                'max': max(sorted_ms), 'includes_cold_start_and_network': True, 'not_an_SLA': True}
    except Exception as exc:
        report['failure_type'] = type(exc).__name__
        raise
    finally:
        # Stop event delivery before deleting fixtures, so no worker recreates counters.
        lamb = session.client('lambda')
        mappings = []
        for suffix in ['relay', 'worker']:
            mappings += lamb.list_event_source_mappings(FunctionName=PREFIX + 'jhoselyn-despacho-' + suffix)['EventSourceMappings']
        for mapping in mappings: lamb.update_event_source_mapping(UUID=mapping['UUID'], Enabled=False)
        for mapping in mappings:
            for _ in range(40):
                if lamb.get_event_source_mapping(UUID=mapping['UUID'])['State'] == 'Disabled': break
                time.sleep(2)
            assert lamb.get_event_source_mapping(UUID=mapping['UUID'])['State'] == 'Disabled'
        cleanup_table(core); cleanup_table(db.Table(PREFIX + 'Appointments'))
        for username in users: cognito.admin_delete_user(UserPoolId=pool, Username=username)
        report['fixtures_removed'] = core.scan(Select='COUNT')['Count'] == 0
        (ROOT / 'docs/operations/e1-staging-verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(json.dumps(report, indent=2), flush=True)


if __name__ == '__main__': main()
