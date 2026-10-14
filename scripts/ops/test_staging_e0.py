"""Live E0 checks restricted to the disposable staging prefix. No production fixtures."""
import argparse
import base64
from concurrent.futures import ThreadPoolExecutor
import hashlib
import hmac
import json
from pathlib import Path
import secrets
import struct
import time
import urllib.error
import urllib.request

import boto3

ROOT = Path(__file__).resolve().parents[2]
PREFIX = 'staging-e0-'


def totp(secret):
    key = base64.b32decode(secret + '=' * ((8 - len(secret) % 8) % 8))
    digest = hmac.new(key, struct.pack('>Q', int(time.time()) // 30), hashlib.sha1).digest()
    offset = digest[-1] & 15
    return f'{(struct.unpack(">I", digest[offset:offset+4])[0] & 0x7fffffff) % 1000000:06d}'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--profile', required=True)
    args = parser.parse_args()
    session = boto3.Session(profile_name=args.profile, region_name='us-east-1')
    assert session.client('sts').get_caller_identity()['Account'] == '295894327291'
    cognito = session.client('cognito-idp')
    pools = [pool for page in cognito.get_paginator('list_user_pools').paginate(MaxResults=60)
             for pool in page['UserPools'] if pool['Name'] == PREFIX + 'jhoselyn_web_pool']
    assert len(pools) == 1
    pool = pools[0]['Id']
    clients = cognito.list_user_pool_clients(UserPoolId=pool)['UserPoolClients']
    client = next(c['ClientId'] for c in clients if c['ClientName'] == PREFIX + 'jhoselyn_web_app_client')
    gateway = session.client('apigatewayv2')
    apis = [a for page in gateway.get_paginator('get_apis').paginate() for a in page['Items']
            if a['Name'] == PREFIX + 'jhoselyn_web_http_api']
    assert len(apis) == 1
    endpoint = apis[0]['ApiEndpoint']
    report = {'environment': PREFIX, 'checks': []}

    def check(label, condition):
        report['checks'].append({'name': label, 'passed': bool(condition)})
        if not condition:
            raise AssertionError(label)

    def request(method, path, body=None, token=None, key=None):
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = 'Bearer ' + token
        if key:
            headers['Idempotency-Key'] = key
        data = json.dumps(body).encode() if body is not None else None
        for attempt in range(5):
            try:
                with urllib.request.urlopen(urllib.request.Request(endpoint + path, data=data, headers=headers, method=method), timeout=45) as response:
                    return response.status, json.load(response)
            except urllib.error.HTTPError as error:
                if error.code == 429 and attempt < 4:
                    time.sleep(1)
                    continue
                return error.code, json.loads(error.read())

    password = 'E0!' + secrets.token_urlsafe(30) + 'aZ9'
    tokens = {}
    run_id = secrets.token_hex(4)
    for role in ['admin', 'ordinary']:
        username = f'e0-{role}-{run_id}@example.invalid'
        result = cognito.admin_create_user(UserPoolId=pool, Username=username, MessageAction='SUPPRESS',
                                          UserAttributes=[{'Name': 'email', 'Value': username}, {'Name': 'email_verified', 'Value': 'true'}])
        username = result['User']['Username']
        cognito.admin_set_user_password(UserPoolId=pool, Username=username, Password=password, Permanent=True)
        if role == 'admin':
            cognito.admin_add_user_to_group(UserPoolId=pool, Username=username, GroupName='Admins')
        auth = cognito.initiate_auth(ClientId=client, AuthFlow='USER_PASSWORD_AUTH',
                                     AuthParameters={'USERNAME': username, 'PASSWORD': password})
        tokens[role] = auth['AuthenticationResult']
        if role == 'admin':
            secret = cognito.associate_software_token(AccessToken=tokens[role]['AccessToken'])['SecretCode']
            result = cognito.verify_software_token(AccessToken=tokens[role]['AccessToken'], UserCode=totp(secret))
            check('TOTP enrollment', result['Status'] == 'SUCCESS')
            cognito.set_user_mfa_preference(AccessToken=tokens[role]['AccessToken'],
                                           SoftwareTokenMfaSettings={'Enabled': True, 'PreferredMfa': True})
            auth = cognito.initiate_auth(ClientId=client, AuthFlow='USER_PASSWORD_AUTH',
                                         AuthParameters={'USERNAME': username, 'PASSWORD': password})
            check('TOTP required on next login', auth.get('ChallengeName') == 'SOFTWARE_TOKEN_MFA')
            # Cognito rejects replay of the code consumed during enrollment.
            time.sleep(31 - time.time() % 30)
            auth = cognito.respond_to_auth_challenge(ClientId=client, ChallengeName='SOFTWARE_TOKEN_MFA',
                    Session=auth['Session'], ChallengeResponses={'USERNAME': username, 'SOFTWARE_TOKEN_MFA_CODE': totp(secret)})
            tokens[role] = auth['AuthenticationResult']
    admin = tokens['admin']['AccessToken']
    check('anonymous denied', request('GET', '/api/admin/appointments')[0] == 401)
    check('non-admin denied', request('GET', '/api/admin/appointments', token=tokens['ordinary']['AccessToken'])[0] == 403)
    check('ID token denied by access scope', request('GET', '/api/admin/appointments', token=tokens['admin']['IdToken'])[0] in [401, 403])
    check('invalid signature denied', request('GET', '/api/admin/appointments', token=admin[:-8] + 'invalid0')[0] == 401)
    check('admin access JWT', request('GET', '/api/admin/appointments', token=admin)[0] == 200)
    db = session.resource('dynamodb')
    days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    db.Table(PREFIX + 'AvailabilityBlocks').put_item(Item={'block_id': 'WEEKLY_SCHEDULE', 'version': 1, 'schedule': {day: ['09:00', '10:00'] for day in days}})
    body = {'name': 'E0 staging integration fixture', 'phone': '+59170000000', 'date': '2099-10-13', 'time': '09:00'}
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(request, 'POST', '/api/appointments', body, None, 'concurrent-' + str(i)) for i in range(2)]
        results = [future.result() for future in futures]
    check('real concurrent slot exclusion and IAM ConditionCheckItem', sorted(row[0] for row in results) == [201, 409])
    winner = next(i for i, row in enumerate(results) if row[0] == 201)
    row = results[winner][1]
    check('idempotent replay', request('POST', '/api/appointments', body, key='concurrent-' + str(winner))[1].get('appointment_id') == row['appointment_id'])
    path = '/api/admin/appointments/' + row['appointment_id']
    check('atomic reschedule', request('PATCH', path, {'expected_version': 1, 'time': '10:00'}, admin)[0] == 200)
    check('stale version rejected', request('PATCH', path, {'expected_version': 1, 'status': 'CANCELLED'}, admin)[0] == 409)
    check('atomic cancellation', request('PATCH', path, {'expected_version': 2, 'status': 'CANCELLED'}, admin)[0] == 200)
    check('slots released', db.Table(PREFIX + 'BookingSlots').scan(Select='COUNT')['Count'] == 0)
    post = {'title': 'E0 staging draft', 'content': 'Isolated integration fixture', 'published': False, 'slug': 'e0-staging-draft'}
    status, draft = request('POST', '/api/admin/blog', post, admin, 'draft-1')
    check('draft write real IAM', status == 201)
    check('draft invisible by slug', request('GET', '/api/blog/' + post['slug'])[0] == 404)
    check('draft invisible in listing', request('GET', '/api/blog')[1].get('posts') == [])
    check('publish existing post', request('PUT', '/api/admin/blog/' + draft['post_id'], {'expected_version': 1, 'published': True}, admin)[0] == 200)
    check('published visible', request('GET', '/api/blog/' + post['slug'])[0] == 200)
    check('slug uniqueness', request('POST', '/api/admin/blog', post, admin, 'draft-2')[0] == 409)
    status, chat = request('POST', '/api/chat', {'message': 'Horario de atención'}, key='ai-disabled')
    check('chat disabled without model call', status == 200 and chat.get('ai_enabled') is False)
    (ROOT / 'docs/operations/staging-verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
