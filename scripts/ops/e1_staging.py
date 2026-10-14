"""Isolated disposable E1 infra; fixed prefix/key guard prevents production mutation."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import boto3

ROOT = Path(__file__).resolve().parents[2]
DIRECTORY = ROOT / '.local-backups/e1-staging'
sys.stdout.reconfigure(encoding='utf-8')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('operation', choices=['prepare', 'plan', 'apply', 'destroy-plan', 'destroy'])
    parser.add_argument('--profile', required=True)
    args = parser.parse_args()
    session = boto3.Session(profile_name=args.profile, region_name='us-east-1')
    assert session.client('sts').get_caller_identity()['Account'] == '295894327291'
    DIRECTORY.mkdir(parents=True, exist_ok=True)
    if args.operation == 'prepare':
        for name in ['main.tf', 'e0.tf', 'despacho.tf', 'budgets.tf', 'variables.tf', '.terraform.lock.hcl']:
            content = (ROOT / 'infrastructure' / name).read_text(encoding='utf-8')
            # Disposable tables only. Production definitions remain protected.
            import re
            content = re.sub(r'deletion_protection_enabled\s*=\s*true', 'deletion_protection_enabled = false', content)
            (DIRECTORY / name).write_text(content, encoding='utf-8')
        for folder in ['lambda_api', 'lambda_despacho']:
            shutil.copytree(ROOT / 'infrastructure' / folder, DIRECTORY / folder, dirs_exist_ok=True,
                            ignore=shutil.ignore_patterns('__pycache__'))
        (DIRECTORY / 'backend.tf').write_text('terraform {\n backend "s3" {}\n}\n')
        (DIRECTORY / 'staging.auto.tfvars.json').write_text(json.dumps({'resource_prefix': 'staging-e1-',
            'despacho_enabled': True, 'booking_ready': True, 'chat_ai_enabled': False,
            'allowed_origins': ['http://localhost:5173'], 'alerts_emails': [], 'monthly_budget_usd': None}))
        command = ['init', '-input=false', '-no-color', '-backend-config=bucket=jhoselyn-tfstate-295894327291-us-east-1',
                   '-backend-config=key=staging/e1/terraform.tfstate', '-backend-config=region=us-east-1',
                   '-backend-config=encrypt=true', '-backend-config=use_lockfile=true', '-backend-config=profile=' + args.profile]
    else:
        assert json.loads((DIRECTORY / 'staging.auto.tfvars.json').read_text())['resource_prefix'] == 'staging-e1-'
        assert json.loads((DIRECTORY / '.terraform/terraform.tfstate').read_text())['backend']['config']['key'] == 'staging/e1/terraform.tfstate'
        assert not (DIRECTORY / 'production.auto.tfvars.json').exists()
        if args.operation in ['plan', 'destroy-plan']:
            command = ['plan', '-input=false', '-no-color', '-out=e1.tfplan']
            if args.operation == 'destroy-plan': command += ['-destroy']
        else:
            plan = subprocess.run([str(ROOT / '.tools/terraform/terraform.exe'), 'show', '-json', 'e1.tfplan'],
                                  cwd=DIRECTORY, text=True, capture_output=True, check=True)
            parsed = json.loads(plan.stdout)
            assert parsed['variables']['resource_prefix']['value'] == 'staging-e1-'
            assert parsed['variables']['chat_ai_enabled']['value'] is False
            assert not parsed['variables']['alerts_emails']['value']
            assert parsed['variables']['monthly_budget_usd']['value'] is None
            changes = [row for row in parsed['resource_changes'] if row['mode'] == 'managed']
            if args.operation == 'destroy':
                assert all(row['change']['actions'] in [['delete'], ['no-op']] for row in changes)
            else:
                assert all('delete' not in row['change']['actions'] for row in changes)
            command = ['apply', '-input=false', '-no-color', 'e1.tfplan']
    result = subprocess.run([str(ROOT / '.tools/terraform/terraform.exe'), *command], cwd=DIRECTORY,
        env={**os.environ, 'AWS_PROFILE': args.profile, 'AWS_EC2_METADATA_DISABLED': 'true'},
        text=True, encoding='utf-8', errors='replace', capture_output=True, timeout=900)
    (DIRECTORY / (args.operation + '.log')).write_text(result.stdout + result.stderr, encoding='utf-8')
    print(result.stdout[-2800:], result.stderr[-1000:], flush=True)
    raise SystemExit(result.returncode)


if __name__ == '__main__':
    main()
