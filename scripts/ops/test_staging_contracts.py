"""Real Lambda/DynamoDB contract tests; only the disposable staging function is invoked.

Gateway JWT signatures are covered separately by test_staging_e0.py. Here the
administrative AWS caller supplies a Gateway-shaped context to isolate contracts.
"""
import argparse
import json
from pathlib import Path
import secrets
import time

import boto3

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--profile', required=True)
    args = parser.parse_args()
    session = boto3.Session(profile_name=args.profile, region_name='us-east-1')
    assert session.client('sts').get_caller_identity()['Account'] == '295894327291'
    client = session.client('lambda')
    function = 'staging-e0-jhoselyn_web_api'
    config = client.get_function_configuration(FunctionName=function)['Environment']['Variables']
    assert config['APPOINTMENTS_TABLE'].startswith('staging-e0-')
    run = secrets.token_hex(4)
    report = {'environment': 'staging-e0-', 'transport': 'IAM Lambda invoke; JWT checked in separate suite', 'checks': []}

    def invoke(method, path, body=None, query=None, raw=None):
        event = {'version': '2.0', 'rawPath': path, 'headers': {'idempotency-key': run + path + str(body)},
                 'queryStringParameters': query, 'requestContext': {'requestId': run,
                 'http': {'method': method, 'sourceIp': '127.0.0.1'}, 'authorizer': {'jwt': {'claims': {
                 'iss': config['COGNITO_ISSUER'], 'client_id': config['COGNITO_CLIENT_ID'], 'token_use': 'access',
                 'exp': int(time.time()) + 300, 'iat': int(time.time()), 'sub': 'isolated-contract-test', 'cognito:groups': '[Admins]'}}}},
                 'body': raw if raw is not None else json.dumps(body or {})}
        # Idempotency header stays within the real 128-character limit.
        import hashlib
        event['headers']['idempotency-key'] = hashlib.sha256(event['headers']['idempotency-key'].encode()).hexdigest()
        result = client.invoke(FunctionName=function, Payload=json.dumps(event).encode())
        assert not result.get('FunctionError')
        response = json.load(result['Payload'])
        return response['statusCode'], json.loads(response['body'])

    def check(name, value):
        report['checks'].append({'name': name, 'passed': bool(value)})
        assert value, name

    status, error = invoke('POST', '/api/appointments', raw='{')
    check('invalid JSON 400, sanitized response', status == 400 and 'details' not in error)
    check('body over 32KB 413', invoke('POST', '/api/appointments', raw=json.dumps({'value': 'x' * 33000}))[0] == 413)
    check('invalid input 422', invoke('POST', '/api/appointments', {'name': 'Staging contract fixture'})[0] == 422)
    check('missing entity 404', invoke('PATCH', '/api/admin/crm/leads/missing-' + run, {'expected_version': 1, 'stage': 'CONTACTADO'})[0] == 404)
    created = []
    for index in range(2):
        status, row = invoke('POST', '/api/admin/crm/leads', {'client_name': 'Staging contract fixture ' + str(index), 'deal_value': '123.45'})
        check('decimal lead created ' + str(index), status == 201)
        created.append(row['lead_id'])
    rows, cursor = [], None
    while True:
        query = {'limit': '1'}
        if cursor:
            query['cursor'] = cursor
        status, page = invoke('GET', '/api/admin/crm/leads', query=query)
        assert status == 200
        rows.extend(page['leads'])
        cursor = page.get('next_cursor')
        if not cursor:
            break
    ids = [row['lead_id'] for row in rows]
    check('pagination complete without duplicates', set(created).issubset(ids) and len(ids) == len(set(ids)))
    check('123.45 preserved as exact decimal string', all(row['deal_value'] == '123.45' for row in rows if row['lead_id'] in created))
    check('invalid cursor 400', invoke('GET', '/api/admin/crm/leads', query={'cursor': 'invalid'})[0] == 400)
    path = '/api/admin/crm/leads/' + created[0]
    check('first optimistic update succeeds', invoke('PATCH', path, {'expected_version': 1, 'stage': 'CONTACTADO'})[0] == 200)
    check('stale update 409', invoke('PATCH', path, {'expected_version': 1, 'stage': 'GANADO'})[0] == 409)
    (ROOT / 'docs/operations/contracts-verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
