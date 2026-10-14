"""Disposable E0 integration environment with a separate state and fixed prefix."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

import boto3

ROOT = Path(__file__).resolve().parents[2]
DIRECTORY = ROOT / '.local-backups/e0-staging'
PREFIX = 'staging-e0-'
sys.stdout.reconfigure(encoding='utf-8')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('operation', choices=['prepare', 'plan', 'apply', 'destroy-plan', 'destroy'])
    parser.add_argument('--profile', required=True)
    args = parser.parse_args()
    session = boto3.Session(profile_name=args.profile, region_name='us-east-1')
    assert session.client('sts').get_caller_identity()['Account'] == '295894327291'
    env = {**os.environ, 'AWS_PROFILE': args.profile, 'AWS_EC2_METADATA_DISABLED': 'true'}
    terraform = str(ROOT / '.tools/terraform/terraform.exe')
    DIRECTORY.mkdir(parents=True, exist_ok=True)
    if args.operation == 'prepare':
        for name in ['main.tf', 'e0.tf', 'variables.tf', '.terraform.lock.hcl']:
            source = ROOT / 'infrastructure' / name
            value = source.read_text(encoding='utf-8')
            # Only this disposable copy permits teardown; production is untouched.
            value = value.replace('deletion_protection_enabled = true', 'deletion_protection_enabled = false')
            (DIRECTORY / name).write_text(value, encoding='utf-8')
        shutil.copytree(ROOT / 'infrastructure/lambda_api', DIRECTORY / 'lambda_api', dirs_exist_ok=True,
                        ignore=shutil.ignore_patterns('__pycache__'))
        (DIRECTORY / 'backend.tf').write_text('terraform {\n backend "s3" {}\n}\n')
        config = {'resource_prefix': PREFIX, 'booking_ready': True, 'admin_mfa_mode': 'OPTIONAL',
                  'chat_ai_enabled': False, 'alerts_email': None, 'allowed_origins': ['http://localhost:5173']}
        (DIRECTORY / 'staging.auto.tfvars.json').write_text(json.dumps(config))
        command = ['init', '-input=false', '-no-color',
                   '-backend-config=bucket=jhoselyn-tfstate-295894327291-us-east-1',
                   '-backend-config=key=staging/e0/terraform.tfstate', '-backend-config=region=us-east-1',
                   '-backend-config=encrypt=true', '-backend-config=use_lockfile=true',
                   '-backend-config=profile=' + args.profile]
    else:
        config = json.loads((DIRECTORY / 'staging.auto.tfvars.json').read_text())
        assert config['resource_prefix'] == PREFIX
        assert not (DIRECTORY / 'production.auto.tfvars.json').exists()
        backend = json.loads((DIRECTORY / '.terraform/terraform.tfstate').read_text())['backend']['config']
        assert backend['key'] == 'staging/e0/terraform.tfstate'
        if args.operation in ['plan', 'destroy-plan']:
            command = ['plan', '-input=false', '-no-color', '-out=staging.tfplan']
            if args.operation == 'destroy-plan':
                command.append('-destroy')
        else:
            command = ['apply', '-input=false', '-no-color', 'staging.tfplan']
    result = subprocess.run([terraform, *command], cwd=DIRECTORY, env=env, capture_output=True,
                            text=True, encoding='utf-8', errors='replace', timeout=900)
    (DIRECTORY / (args.operation + '.log')).write_text(result.stdout + result.stderr, encoding='utf-8')
    print(result.stdout[-3200:], result.stderr[-1500:], flush=True)
    raise SystemExit(result.returncode)


if __name__ == '__main__':
    main()
