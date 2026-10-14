"""Apply only additive private E1 infrastructure, with production writes disabled."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import sys

import boto3

ROOT = Path(__file__).resolve().parents[2]
sys.stdout.reconfigure(encoding='utf-8')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--profile', required=True)
    args = parser.parse_args()
    session = boto3.Session(profile_name=args.profile, region_name='us-east-1')
    assert session.client('sts').get_caller_identity()['Account'] == '295894327291'
    directory = ROOT / 'infrastructure'
    assert json.loads((directory / '.terraform/terraform.tfstate').read_text())['backend']['config']['key'] == 'production/terraform.tfstate'
    terraform = str(ROOT / '.tools/terraform/terraform.exe')
    raw = subprocess.run([terraform, 'show', '-json', 'e0.tfplan'], cwd=directory, capture_output=True,
                         text=True, encoding='utf-8', timeout=600, check=True)
    plan = json.loads(raw.stdout)
    assert plan['variables']['resource_prefix']['value'] == ''
    assert plan['variables']['despacho_enabled']['value'] is True
    assert plan['variables']['chat_ai_enabled']['value'] is False
    changed = [row for row in plan['resource_changes'] if row['mode'] == 'managed' and row['change']['actions'] != ['no-op']]
    assert changed and all(row['change']['actions'] == ['create'] and '.despacho' in row['address'] for row in changed)
    functions = [row['change']['after'] for row in changed if row['type'] == 'aws_lambda_function']
    assert len(functions) == 4
    assert all(row['environment'][0]['variables']['PILOT_ENABLED'] == 'false' and
               row['environment'][0]['variables']['ENVIRONMENT'] == 'production' for row in functions)
    core = next(row['change']['after'] for row in changed if row['type'] == 'aws_dynamodb_table')
    assert core['deletion_protection_enabled'] and core['billing_mode'] == 'PAY_PER_REQUEST'
    backup = ROOT / '.local-backups' / ('e1-review-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    backup.mkdir(parents=True, exist_ok=True)
    previous = session.client('s3').get_object(Bucket='jhoselyn-tfstate-295894327291-us-east-1', Key='production/terraform.tfstate')
    (backup / 'before.tfstate').write_bytes(previous['Body'].read())
    print(json.dumps({'reviewed_new_resources': len(changed), 'existing_resource_mutations': 0, 'production_writes': False}), flush=True)
    result = subprocess.run([terraform, 'apply', '-input=false', '-no-color', 'e0.tfplan'], cwd=directory,
        env={**os.environ, 'AWS_PROFILE': args.profile, 'AWS_EC2_METADATA_DISABLED': 'true'}, capture_output=True,
        text=True, encoding='utf-8', errors='replace', timeout=1200)
    (backup / 'apply.log').write_text(result.stdout + result.stderr, encoding='utf-8')
    print(result.stdout[-2500:] + result.stderr[-1500:], flush=True)
    raise SystemExit(result.returncode)


if __name__ == '__main__': main()
