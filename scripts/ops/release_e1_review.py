"""Apply only additive private E1 infrastructure, with production writes disabled."""
import argparse
from datetime import datetime, timezone
import json
import os
import re
from pathlib import Path
import subprocess
import sys

import boto3

ROOT = Path(__file__).resolve().parents[2]
sys.stdout.reconfigure(encoding='utf-8')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--profile', required=True)
    parser.add_argument('--cors-fix', action='store_true', help='Only additive E1 OPTIONS route, after initial deployment')
    parser.add_argument('--preflight-handler', action='store_true', help='Only code updates to the four private E1 functions')
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
    assert plan['variables']['admin_mfa_mode']['value'] == 'OPTIONAL'
    changed = [row for row in plan['resource_changes'] if row['mode'] == 'managed' and row['change']['actions'] != ['no-op']]
    assert not (args.cors_fix and args.preflight_handler)
    assert all(row['change']['actions'] == (['update'] if args.preflight_handler else ['create']) and '.despacho' in row['address'] for row in changed)
    if args.cors_fix:
        assert len(changed) == 1 and changed[0]['address'] == 'aws_apigatewayv2_route.despacho_options[0]'
        route = changed[0]['change']['after']
        assert route['route_key'] == 'OPTIONS /api/admin/despacho/{proxy+}' and route['authorization_type'] == 'NONE'
    elif args.preflight_handler:
        assert len(changed) == 4 and all(row['type'] == 'aws_lambda_function' for row in changed)
        for row in changed:
            before, after = row['change']['before'], row['change']['after']
            assert before['environment'] == after['environment'] and before['role'] == after['role'] and before['handler'] == after['handler']
    else:
        assert len(changed) == 26
    functions = [row['change']['after'] for row in changed if row['type'] == 'aws_lambda_function']
    assert len(functions) == (0 if args.cors_fix else 4)
    # Newly created queue URLs make the whole map unknown in the saved plan.
    # Check Terraform-evaluated constants and their direct bindings instead.
    assert plan['planned_values']['outputs']['despacho_review_mode']['value'] == {'environment': 'production', 'pilot_enabled': False}
    configuration = next(row for row in plan['configuration']['root_module']['resources'] if row['address'] == 'aws_lambda_function.despacho')
    references = configuration['expressions']['environment'][0]['variables']['references']
    assert {'local.despacho_pilot_enabled', 'local.despacho_environment'} <= set(references)
    source = (directory / 'despacho.tf').read_text(encoding='utf-8')
    assert re.search(r'^\s*PILOT_ENABLED\s*=\s*tostring\(local\.despacho_pilot_enabled\)\s*$', source, re.MULTILINE)
    assert re.search(r'^\s*ENVIRONMENT\s*=\s*local\.despacho_environment\s*$', source, re.MULTILINE)
    core = next(row['change']['after'] for row in plan['resource_changes'] if row['type'] == 'aws_dynamodb_table' and row['address'] == 'aws_dynamodb_table.despacho[0]')
    assert core['deletion_protection_enabled'] and core['billing_mode'] == 'PAY_PER_REQUEST'
    backup = ROOT / '.local-backups' / ('e1-review-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    backup.mkdir(parents=True, exist_ok=True)
    previous = session.client('s3').get_object(Bucket='jhoselyn-tfstate-295894327291-us-east-1', Key='production/terraform.tfstate')
    (backup / 'before.tfstate').write_bytes(previous['Body'].read())
    print(json.dumps({'reviewed_resources': len(changed), 'private_e1_code_updates': len(changed) if args.preflight_handler else 0,
                      'existing_e0_resource_mutations': 0, 'production_writes': False}), flush=True)
    result = subprocess.run([terraform, 'apply', '-input=false', '-no-color', 'e0.tfplan'], cwd=directory,
        env={**os.environ, 'AWS_PROFILE': args.profile, 'AWS_EC2_METADATA_DISABLED': 'true'}, capture_output=True,
        text=True, encoding='utf-8', errors='replace', timeout=1200)
    (backup / 'apply.log').write_text(result.stdout + result.stderr, encoding='utf-8')
    print(result.stdout[-2500:] + result.stderr[-1500:], flush=True)
    raise SystemExit(result.returncode)


if __name__ == '__main__': main()
