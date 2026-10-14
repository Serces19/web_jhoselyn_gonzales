"""Bounded Terraform checks with explicit AWS profile; no apply."""
import argparse
import os
import subprocess
import sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')

ROOT=Path(__file__).resolve().parents[2]
def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--profile',required=True)
    parser.add_argument('--bootstrap',action='store_true')
    args=parser.parse_args()
    directory=ROOT/'infrastructure'/('bootstrap' if args.bootstrap else '')
    env={**os.environ,'AWS_PROFILE':args.profile,'AWS_EC2_METADATA_DISABLED':'true'}
    local=ROOT/'.tools/terraform/terraform.exe'
    command=[str(local) if local.exists() else 'terraform','plan','-input=false','-no-color','-out=bootstrap.tfplan' if args.bootstrap else '-out=e0.tfplan']
    try:
        result=subprocess.run(command,cwd=directory,env=env,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=180)
    except subprocess.TimeoutExpired:
        raise SystemExit('Terraform provider timeout; no changes applied') from None
    log=ROOT/'.local-backups'/('bootstrap-plan.log' if args.bootstrap else 'e0-plan.log')
    log.write_text(result.stdout+'\n'+result.stderr,encoding='utf-8')
    print(result.stdout[-1700:]);print(result.stderr[-1700:])
    raise SystemExit(result.returncode)
if __name__=='__main__':main()
