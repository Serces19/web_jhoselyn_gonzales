"""Create recoverable on-demand backups of project tables; no table data output."""
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
import boto3

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--profile',required=True)
    p.add_argument('--apply',action='store_true')
    args=p.parse_args()
    names=['Appointments','AvailabilityBlocks','BlogPosts','ProBonoRequests','ChatLeads','ChatSessions']
    if not args.apply:
        print(json.dumps({'tables':names,'apply':False}));return
    client=boto3.Session(profile_name=args.profile,region_name='us-east-1').client('dynamodb')
    suffix=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')
    backups=[]
    for name in names:
        result=client.create_backup(TableName=name,BackupName='e0-before-'+name+'-'+suffix)
        description=result['BackupDetails']
        backups.append({'table':name,'backup_arn':description['BackupArn'],'status':description['BackupStatus']})
    target=Path(__file__).resolve().parents[2]/'.local-backups'/('aws-'+suffix)
    target.mkdir(parents=True)
    (target/'backups.json').write_text(json.dumps(backups,indent=2),encoding='utf-8')
    print(json.dumps({'created':len(backups),'manifest_directory':str(target),'statuses':[x['status'] for x in backups]}))

if __name__=='__main__':main()
