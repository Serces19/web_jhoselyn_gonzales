"""Restore one existing backup into an isolated table; no overwrite of production."""
import argparse
import hashlib
import json
from pathlib import Path
import time

import boto3

ROOT = Path(__file__).resolve().parents[2]
REPORT = ROOT / 'docs/operations/restore-verification.json'
TARGET = 'staging-e0-restore-appointments-20261014'


def snapshot(table):
    items, kwargs = [], {}
    while True:
        page = table.scan(**kwargs)
        items.extend(json.dumps(row, sort_keys=True, default=str) for row in page.get('Items', []))
        if not page.get('LastEvaluatedKey'):
            break
        kwargs = {'ExclusiveStartKey': page['LastEvaluatedKey']}
    return len(items), hashlib.sha256('\n'.join(sorted(items)).encode()).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('operation', choices=['start', 'check', 'cleanup'])
    parser.add_argument('--profile', required=True)
    args = parser.parse_args()
    session = boto3.Session(profile_name=args.profile, region_name='us-east-1')
    assert session.client('sts').get_caller_identity()['Account'] == '295894327291'
    db = session.client('dynamodb')
    if args.operation == 'start':
        manifest = sorted((ROOT / '.local-backups').glob('aws-*/backups.json'))[-1]
        backup = next(row for row in json.loads(manifest.read_text()) if row['table'] == 'Appointments')
        db.restore_table_from_backup(TargetTableName=TARGET, BackupArn=backup['backup_arn'])
        report = {'table': TARGET, 'source': 'Appointments', 'started_unix': time.time(), 'status': 'CREATING'}
    else:
        report = json.loads(REPORT.read_text())
        assert report['table'] == TARGET and TARGET.startswith('staging-e0-restore-')
        if args.operation == 'check':
            result = db.describe_table(TableName=TARGET)['Table']
            report['status'] = result['TableStatus']
            if result['TableStatus'] == 'ACTIVE':
                resource = session.resource('dynamodb')
                restored = snapshot(resource.Table(TARGET))
                original = snapshot(resource.Table('Appointments'))
                report.update(restored_count=restored[0], current_source_count=original[0],
                              content_matches_current_source=restored == original,
                              measured_ready_seconds=round(time.time() - report['started_unix'], 1),
                              keys_match=db.describe_table(TableName='Appointments')['Table']['KeySchema'] == result['KeySchema'])
        else:
            if report.get('status') != 'ACTIVE' or not report.get('keys_match') or not report.get('content_matches_current_source'):
                raise SystemExit('Successful restore verification required before cleanup')
            db.delete_table(TableName=TARGET)
            report['cleanup'] = 'DELETE_REQUESTED'
    REPORT.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
