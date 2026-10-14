"""Production review verification: no users, fixtures, migrations, or business writes."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import time
import urllib.error
import urllib.request

import boto3

ROOT = Path(__file__).resolve().parents[2]
API = 'https://x4konjc6z6.execute-api.us-east-1.amazonaws.com'
ORIGIN = 'https://main.d2caobufsyec5z.amplifyapp.com'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--profile', required=True)
    args = parser.parse_args()
    session = boto3.Session(profile_name=args.profile, region_name='us-east-1')
    assert session.client('sts').get_caller_identity()['Account'] == '295894327291'
    checks = []

    def check(label, condition):
        checks.append({'name': label, 'passed': bool(condition)})
        if not condition: raise AssertionError(label)

    lamb = session.client('lambda')
    configurations = {}
    for suffix in ['api', 'relay', 'worker', 'reconcile']:
        cfg = lamb.get_function_configuration(FunctionName='jhoselyn-despacho-' + suffix)
        variables = cfg['Environment']['Variables']
        check(suffix + ' production review config', cfg['State'] == 'Active' and cfg['LastUpdateStatus'] == 'Successful'
              and variables.get('PILOT_ENABLED') == 'false' and variables.get('ENVIRONMENT') == 'production')
        configurations[suffix] = cfg
    variables = configurations['api']['Environment']['Variables']
    now = int(time.time())
    # AWS operator invocation tests the deployed handler's guard. It is not a signed
    # Gateway end-to-end login; no fake production user or credentials are created.
    claims = {'iss': variables['COGNITO_ISSUER'], 'client_id': variables['COGNITO_CLIENT_ID'],
              'token_use': 'access', 'exp': now + 600, 'iat': now - 1,
              'cognito:groups': ['Admins'], 'sub': 'release-verification'}

    def invoke(method, path, body=None, admin=True):
        event = {'rawPath': '/api/admin/despacho' + path, 'headers': {'idempotency-key': 'read-only-release-check'},
            'body': json.dumps(body or {}), 'requestContext': {'requestId': 'release-verification',
                'http': {'method': method}, 'authorizer': {'jwt': {'claims': {**claims, 'cognito:groups': ['Admins'] if admin else []}}}}}
        result = lamb.invoke(FunctionName='jhoselyn-despacho-api', Payload=json.dumps(event).encode())
        check('deployed handler response ' + method + path, 'FunctionError' not in result)
        payload = json.loads(result['Payload'].read())
        return payload['statusCode'], json.loads(payload['body'])

    status, config = invoke('GET', '/config')
    check('review config exposed', status == 200 and config['data']['environment'] == 'production' and not config['data']['pilot_enabled'])
    status, persons = invoke('GET', '/personas')
    check('person directory readable and initially empty', status == 200 and persons['data']['items'] == [])
    status, cases = invoke('GET', '/casos', {})
    check('cases readable and initially empty', status == 200 and cases['data']['items'] == [])
    check('non-admin handler denied', invoke('GET', '/personas', admin=False)[0] == 403)
    for method, path, body in [('POST', '/personas', {}), ('PATCH', '/casos/nonexistent', {}),
                             ('POST', '/metricas/rebuild', {'period': datetime.now(timezone.utc).strftime('%Y-%m')})]:
        status, response = invoke(method, path, body)
        check('production write blocked ' + method + path, status == 503 and response['error']['code'] == 'PILOT_NOT_ENABLED')
    for path in ['/config', '/personas']:
        try:
            with urllib.request.urlopen(API + '/api/admin/despacho' + path, timeout=30) as response: status = response.status
        except urllib.error.HTTPError as error: status = error.code
        check('Gateway anonymous denied ' + path, status == 401)
    request = urllib.request.Request(API + '/api/admin/despacho/config', method='OPTIONS',
        headers={'Origin': ORIGIN, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization'})
    with urllib.request.urlopen(request, timeout=30) as response:
        check('production origin CORS', response.status in [200, 204] and response.headers.get('Access-Control-Allow-Origin') == ORIGIN)
    db = session.client('dynamodb')
    table = db.describe_table(TableName='DespachoCore')['Table']
    recovery = db.describe_continuous_backups(TableName='DespachoCore')['ContinuousBackupsDescription']
    check('Core private on-demand protected with PITR', table['BillingModeSummary']['BillingMode'] == 'PAY_PER_REQUEST'
          and table['DeletionProtectionEnabled'] and recovery['PointInTimeRecoveryDescription']['PointInTimeRecoveryStatus'] == 'ENABLED')
    check('GSI projection keys only', len(table['GlobalSecondaryIndexes']) == 2 and
          all(index['Projection']['ProjectionType'] == 'KEYS_ONLY' for index in table['GlobalSecondaryIndexes']))
    iam = session.client('iam')
    role = iam.get_role(RoleName='serverless_lambda_exec_role')['Role']['Arn']
    simulation = iam.simulate_principal_policy(PolicySourceArn=role,
        ActionNames=['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:PutItem'], ResourceArns=[table['TableArn']])
    check('public Lambda still denied Core', all(row['EvalDecision'] == 'implicitDeny' for row in simulation['EvaluationResults']))
    pool = session.client('cognito-idp').describe_user_pool(UserPoolId='us-east-1_WIEGYaEgn')['UserPool']
    check('MFA OPTIONAL preserved', pool['MfaConfiguration'] == 'OPTIONAL')
    legacy = lamb.get_function_configuration(FunctionName='jhoselyn_web_api')['Environment']['Variables']
    check('legacy booking available and AI off', legacy['BOOKING_READY'] == 'true' and legacy['CHAT_AI_ENABLED'] == 'false')
    report = {'checked_at_utc': datetime.now(timezone.utc).isoformat(), 'mode': 'PRODUCTION_READ_ONLY',
        'checks': checks, 'new_production_users': 0, 'business_records_written': 0, 'leads_migrated': 0,
        'authenticated_gateway_browser_acceptance': 'PENDING_USER_LOGIN',
        'verification_method': 'anonymous HTTP, AWS configuration/IAM, privileged direct handler invocation'}
    (ROOT / 'docs/operations/e1-production-verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8', newline='\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__': main()
