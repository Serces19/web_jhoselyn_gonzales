"""Read-only staging inventory and remote-state cleanup proof. Counts only."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path

import boto3

ROOT = Path(__file__).resolve().parents[2]
PREFIX = 'staging-e1-'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--profile', required=True)
    args = parser.parse_args()
    session = boto3.Session(profile_name=args.profile, region_name='us-east-1')
    assert session.client('sts').get_caller_identity()['Account'] == '295894327291'
    counts = {}
    counts['tables'] = sum(name.startswith(PREFIX) for page in session.client('dynamodb').get_paginator('list_tables').paginate() for name in page['TableNames'])
    counts['functions'] = sum(row['FunctionName'].startswith(PREFIX) for page in session.client('lambda').get_paginator('list_functions').paginate() for row in page['Functions'])
    counts['roles'] = sum(row['RoleName'].startswith(PREFIX) for page in session.client('iam').get_paginator('list_roles').paginate() for row in page['Roles'])
    counts['queues'] = len(session.client('sqs').list_queues(QueueNamePrefix=PREFIX).get('QueueUrls', []))
    counts['apis'] = sum(row['Name'].startswith(PREFIX) for page in session.client('apigatewayv2').get_paginator('get_apis').paginate() for row in page['Items'])
    counts['pools'] = sum(row['Name'].startswith(PREFIX) for page in session.client('cognito-idp').get_paginator('list_user_pools').paginate(MaxResults=60) for row in page['UserPools'])
    counts['topics'] = sum(row['TopicArn'].split(':')[-1].startswith(PREFIX) for page in session.client('sns').get_paginator('list_topics').paginate() for row in page['Topics'])
    counts['alarms'] = sum(len(page.get('MetricAlarms', [])) for page in session.client('cloudwatch').get_paginator('describe_alarms').paginate(AlarmNamePrefix=PREFIX))
    counts['event_rules'] = len(session.client('events').list_rules(NamePrefix=PREFIX)['Rules'])
    counts['log_groups'] = sum(len(page['logGroups']) for prefix in ['/aws/lambda/', '/aws/apigateway/'] for page in session.client('logs').get_paginator('describe_log_groups').paginate(logGroupNamePrefix=prefix + PREFIX))
    obj = session.client('s3').get_object(Bucket='jhoselyn-tfstate-295894327291-us-east-1', Key='staging/e1/terraform.tfstate')
    state = json.loads(obj['Body'].read())
    counts['state_managed_resources'] = sum(row['mode'] == 'managed' for row in state.get('resources', []))
    report = {'checked_at_utc': datetime.now(timezone.utc).isoformat(), 'environment': PREFIX, 'remaining': counts,
              'complete': all(value == 0 for value in counts.values()), 'remote_state_retained': True}
    (ROOT / 'docs/operations/e1-cleanup.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))
    assert report['complete']


if __name__ == '__main__': main()
