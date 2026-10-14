"""Read-only deployment checks. Reports status/counts, never response bodies or PII."""
import argparse
import json
from pathlib import Path
import urllib.error
import urllib.request

import boto3

ROOT = Path(__file__).resolve().parents[2]
API = 'https://x4konjc6z6.execute-api.us-east-1.amazonaws.com'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--profile', required=True)
    args = parser.parse_args()
    session = boto3.Session(profile_name=args.profile, region_name='us-east-1')
    assert session.client('sts').get_caller_identity()['Account'] == '295894327291'
    checks = []
    for path, expected in [('/api/admin/appointments', 401), ('/api/appointments', 401),
                           ('/api/crm/leads', 401), ('/api/blog', 200),
                           ('/api/schedule', 200), ('/api/availability?date=2099-10-13', 200)]:
        try:
            with urllib.request.urlopen(API + path, timeout=30) as response:
                status = response.status
        except urllib.error.HTTPError as error:
            status = error.code
        checks.append({'path': path, 'status': status, 'expected': expected, 'passed': status == expected})
    config = session.client('lambda').get_function_configuration(FunctionName='jhoselyn_web_api')
    variables = config['Environment']['Variables']
    pool = session.client('cognito-idp').describe_user_pool(UserPoolId='us-east-1_WIEGYaEgn')['UserPool']
    tables = []
    db = session.client('dynamodb')
    for name in ['Appointments', 'AvailabilityBlocks', 'BlogPosts', 'ChatLeads', 'ChatSessions', 'ProBonoRequests', 'OperationControl', 'BookingSlots']:
        table = db.describe_table(TableName=name)['Table']
        recovery = db.describe_continuous_backups(TableName=name)['ContinuousBackupsDescription']
        tables.append({'table': name, 'status': table['TableStatus'],
                       'deletion_protected': table.get('DeletionProtectionEnabled', False),
                       'pitr': recovery['PointInTimeRecoveryDescription']['PointInTimeRecoveryStatus']})
    jobs = session.client('amplify').list_jobs(appId='d2caobufsyec5z', branchName='main', maxResults=1)['jobSummaries']
    report = {'api_checks': checks, 'lambda_update': config['LastUpdateStatus'],
              'booking_ready': variables.get('BOOKING_READY'), 'ai_enabled': variables.get('CHAT_AI_ENABLED'),
              'mfa': pool['MfaConfiguration'], 'self_signup_disabled': pool['AdminCreateUserConfig']['AllowAdminCreateUserOnly'],
              'tables': tables, 'frontend_job': {k: jobs[0][k] for k in ['jobId', 'status', 'commitId']}}
    (ROOT / 'docs/operations/deployment-verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))
    if not all(check['passed'] for check in checks):
        raise SystemExit(1)


if __name__ == '__main__':
    main()
