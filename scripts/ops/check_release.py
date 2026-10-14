"""Read-only AWS release prerequisites; safe metadata only."""
import argparse
import json
from pathlib import Path
import boto3

ROOT=Path(__file__).resolve().parents[2]
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--profile',required=True);args=parser.parse_args()
    session=boto3.Session(profile_name=args.profile,region_name='us-east-1')
    functions=[]
    for page in session.client('lambda').get_paginator('list_functions').paginate():
        functions.extend(x['FunctionName'] for x in page['Functions'] if x['Role'].endswith('/serverless_lambda_exec_role'))
    manifests=sorted((ROOT/'.local-backups').glob('aws-*/backups.json'))
    backups=[]
    if manifests:
        for row in json.loads(manifests[-1].read_text(encoding='utf-8')):
            status=session.client('dynamodb').describe_backup(BackupArn=row['backup_arn'])['BackupDescription']['BackupDetails']['BackupStatus']
            backups.append({'table':row['table'],'status':status})
    report={'functions_using_existing_role':functions,'backups':backups}
    (ROOT/'docs/operations/release-prerequisites.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,indent=2))
if __name__=='__main__':main()
