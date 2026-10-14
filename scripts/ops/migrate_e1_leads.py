"""Dry-run default. Current apply is staging-only; never prints client records."""
import argparse
import hashlib
import importlib
import os
from pathlib import Path
import sys

import boto3

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--profile', required=True)
    parser.add_argument('--prefix', default='staging-e1-')
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    if not args.prefix.startswith('staging-') and args.apply:
        raise SystemExit('Production migration requires its approved cutover runbook; this command is staging-only')
    session = boto3.Session(profile_name=args.profile, region_name='us-east-1')
    assert session.client('sts').get_caller_identity()['Account'] == '295894327291'
    sys.path[:0] = [str(ROOT / 'infrastructure/lambda_despacho'), str(ROOT / 'infrastructure/lambda_api')]
    migration = importlib.import_module('migration')
    if args.apply:
        os.environ['CORE_TABLE'] = args.prefix + 'DespachoCore'
        boto3.setup_default_session(profile_name=args.profile, region_name='us-east-1')
        importer = migration.import_lead
    table = session.resource('dynamodb').Table(args.prefix + 'ChatLeads')
    counts, params = {'rows': 0, 'processed': 0, 'replayed': 0, 'importable': 0, 'unresolved': 0, 'needs_review': 0}, {}
    while True:
        page = table.scan(**params)
        for row in page.get('Items', []):
            counts['rows'] += 1
            counts['needs_review'] += 1
            counts['unresolved' if migration.classification(row).startswith('UNRESOLVED') else 'importable'] += 1
            if args.apply:
                marker = 'MIGRATION#ChatLeads#' + hashlib.sha256(row['lead_id'].encode()).hexdigest()
                counts['replayed'] += migration.r.get(marker) is not None
                importer({'headers': {'idempotency-key': 'legacy-' + hashlib.sha256(row['lead_id'].encode()).hexdigest()}}, 'migration-operator', row)
                counts['processed'] += 1
        if not page.get('LastEvaluatedKey'): break
        params = {'ExclusiveStartKey': page['LastEvaluatedKey']}
    print({'mode': 'apply' if args.apply else 'read-only', 'environment': args.prefix or 'production', **counts})


if __name__ == '__main__':
    main()
