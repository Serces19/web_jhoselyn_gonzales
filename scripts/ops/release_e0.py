"""Explicit E0 release operations. Never prints state, credentials or customer data."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

import boto3

ROOT = Path(__file__).resolve().parents[2]
sys.stdout.reconfigure(encoding='utf-8')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('operation', choices=['migrate-state', 'apply'])
    parser.add_argument('--profile', required=True)
    args = parser.parse_args()
    session = boto3.Session(profile_name=args.profile, region_name='us-east-1')
    if session.client('sts').get_caller_identity()['Account'] != '295894327291':
        raise SystemExit('Unexpected AWS account')
    env = {**os.environ, 'AWS_PROFILE': args.profile, 'AWS_EC2_METADATA_DISABLED': 'true'}
    infrastructure = ROOT / 'infrastructure'
    backup = ROOT / '.local-backups' / time.strftime('release-%Y%m%dT%H%M%SZ', time.gmtime())
    backup.mkdir(parents=True, exist_ok=True)
    terraform = str(ROOT / '.tools/terraform/terraform.exe')
    if args.operation == 'migrate-state':
        for directory, key in [(infrastructure, 'production/terraform.tfstate'), (infrastructure / 'bootstrap', 'bootstrap/terraform.tfstate')]:
            import json
            metadata = directory / '.terraform/terraform.tfstate'
            if metadata.exists() and json.loads(metadata.read_text()).get('backend', {}).get('type') == 's3':
                raise SystemExit('Already using remote state; do not migrate an old local snapshot')
            shutil.copy2(directory / 'terraform.tfstate', backup / (directory.name + '.tfstate'))
            (directory / 'backend.tf').write_text('terraform {\n  backend "s3" {}\n}\n', encoding='utf-8')
            command = [terraform, 'init', '-migrate-state', '-no-color',
                       '-backend-config=bucket=jhoselyn-tfstate-295894327291-us-east-1',
                       '-backend-config=key=' + key, '-backend-config=region=us-east-1',
                       '-backend-config=encrypt=true', '-backend-config=use_lockfile=true',
                       '-backend-config=profile=' + args.profile]
            result = subprocess.run(command, cwd=directory, env=env, input='yes\n', text=True,
                                    encoding='utf-8', capture_output=True, timeout=600)
            (backup / (directory.name + '-init.log')).write_text(result.stdout + result.stderr, encoding='utf-8')
            print(result.stdout[-2000:], result.stderr[-1000:], flush=True)
            if result.returncode:
                raise SystemExit(result.returncode)
    elif args.operation == 'apply':
        result = subprocess.run([terraform, 'apply', '-input=false', '-no-color', 'e0.tfplan'],
                                cwd=infrastructure, env=env, capture_output=True, text=True,
                                encoding='utf-8', timeout=1200)
        (backup / 'apply.log').write_text(result.stdout + result.stderr, encoding='utf-8')
        print(result.stdout[-4500:], result.stderr[-2000:], flush=True)
        raise SystemExit(result.returncode)


if __name__ == '__main__':
    main()
