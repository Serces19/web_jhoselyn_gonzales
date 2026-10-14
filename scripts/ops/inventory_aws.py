"""Scoped read-only AWS inventory. Stores configuration summary, never customer records/secrets."""
import argparse
import json
from pathlib import Path
import boto3
from botocore.exceptions import ClientError

ROOT = Path(__file__).resolve().parents[2]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--profile', required=True)
    args = parser.parse_args()
    session = boto3.Session(profile_name=args.profile, region_name='us-east-1')
    state = json.loads((ROOT / 'infrastructure/terraform.tfstate').read_text(encoding='utf-8'))
    ids = {r['type'] + '.' + r['name']: r['instances'][0]['attributes'] for r in state['resources'] if r.get('instances')}
    account = session.client('sts').get_caller_identity()['Account']
    arn = ids['aws_lambda_function.api_handler']['arn']
    if arn.split(':')[4] != account:
        raise RuntimeError('Profile account differs from Terraform state; stopping inventory')
    report = {'profile': args.profile, 'region': 'us-east-1', 'account_matches_state': True, 'errors': {}}
    def read(name, function):
        try:
            report[name] = function()
        except ClientError as exc:
            report['errors'][name] = exc.response['Error']['Code']
    api_id = ids['aws_apigatewayv2_api.http_api']['id']
    gw = session.client('apigatewayv2')
    read('api', lambda: {k:v for k,v in gw.get_api(ApiId=api_id).items() if k in ('ApiId','ApiEndpoint','CorsConfiguration')})
    read('routes', lambda: [{k:v for k,v in x.items() if k in ('RouteKey','AuthorizationType','AuthorizerId')} for x in gw.get_routes(ApiId=api_id)['Items']])
    read('authorizers_count', lambda: len(gw.get_authorizers(ApiId=api_id).get('Items', [])))
    def function():
        x = session.client('lambda').get_function_configuration(FunctionName=ids['aws_lambda_function.api_handler']['function_name'])
        return {**{k:x.get(k) for k in ('Runtime','Timeout','MemorySize','LastModified','CodeSha256')}, 'environment_names': sorted(x.get('Environment',{}).get('Variables',{})), 'vpc_configured': bool(x.get('VpcConfig',{}).get('SubnetIds'))}
    read('lambda', function)
    cognito = session.client('cognito-idp')
    pool_id = ids['aws_cognito_user_pool.pool']['id']
    read('cognito', lambda: {k:v for k,v in cognito.describe_user_pool(UserPoolId=pool_id)['UserPool'].items() if k in ('MfaConfiguration','AdminCreateUserConfig','Policies','UserPoolTier')})
    def admins():
        x = cognito.list_users_in_group(UserPoolId=pool_id, GroupName='Admins')
        return {'count_first_page':len(x['Users']), 'has_more':bool(x.get('NextToken')), 'enabled':sum(bool(u.get('Enabled')) for u in x['Users'])}
    read('admins', admins)
    db = session.client('dynamodb')
    report['tables'] = {}
    for key,value in ids.items():
        if key.startswith('aws_dynamodb_table.'):
            name = value['name']
            def table():
                x = db.describe_table(TableName=name)['Table']
                pitr = db.describe_continuous_backups(TableName=name)['ContinuousBackupsDescription']
                return {'status':x['TableStatus'], 'approx_item_count':x['ItemCount'], 'bytes':x['TableSizeBytes'], 'billing':x.get('BillingModeSummary',{}).get('BillingMode'), 'pitr':pitr.get('PointInTimeRecoveryDescription',{}).get('PointInTimeRecoveryStatus')}
            read('table_'+name, table)
            if 'table_'+name in report:
                report['tables'][name] = report.pop('table_'+name)
    sns = session.client('sns')
    read('notification_protocols', lambda: [x['Protocol'] for x in sns.list_subscriptions_by_topic(TopicArn=ids['aws_sns_topic.lead_alerts']['arn'])['Subscriptions']])
    read('amplify', lambda: [{'name':x['name'], 'default_domain':x.get('defaultDomain')} for x in session.client('amplify').list_apps()['apps'] if x['name']=='web_jhoselyn_gonzales'])
    def cost():
        x = session.client('ce').get_cost_and_usage(TimePeriod={'Start':'2026-10-01','End':'2026-10-14'},Granularity='MONTHLY',Metrics=['UnblendedCost'],GroupBy=[{'Type':'DIMENSION','Key':'SERVICE'}])
        return [{'period':p['TimePeriod'], 'estimated':p.get('Estimated'), 'services':[{'service':g['Keys'][0],**g['Metrics']['UnblendedCost']} for g in p['Groups']]} for p in x['ResultsByTime']]
    read('account_cost_october_to_13', cost)
    out = ROOT / 'docs/operations/aws-inventory.json'
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
    print(json.dumps(report, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
