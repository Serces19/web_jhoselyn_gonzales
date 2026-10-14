"""Summarize saved Terraform plan without dumping raw state or environment values."""
import argparse
import json
import subprocess
import sys
import re
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')

ROOT=Path(__file__).resolve().parents[2]

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--plan',default='e0.tfplan');args=parser.parse_args()
    log=ROOT/'.local-backups/e0-plan.log'
    if log.exists():
        content=log.read_text(encoding='utf-8')
        match=re.search(r'Plan: (\d+) to add, (\d+) to change, (\d+) to destroy',content)
        if match:
            changes=[{'address':address,'actions':[{'created':'create','updated in-place':'update','destroyed':'delete'}.get(action,action)]} for address,action in re.findall(r'^  # (.+?) will be (.+)$',content,re.MULTILINE)]
            summary={'source':'saved plan console log','counts':{'add':int(match[1]),'change':int(match[2]),'destroy':int(match[3])},'changes':changes}
            (ROOT/'docs/operations/terraform-plan-summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
            print(json.dumps(summary,indent=2))
            if int(match[3]): raise SystemExit('Destructive change requires review')
            return
    local=ROOT/'.tools/terraform/terraform.exe'
    result=subprocess.run([str(local) if local.exists() else 'terraform','show','-json',args.plan],cwd=ROOT/'infrastructure',capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=180)
    if result.returncode: raise SystemExit('Cannot read saved plan: '+result.stderr[-1500:])
    plan=json.loads(result.stdout)
    changes=[{'address':r['address'],'actions':r['change']['actions']} for r in plan.get('resource_changes',[]) if r['change']['actions']!=['no-op']]
    dangerous=[r for r in changes if 'delete' in r['actions']]
    summary={'changes':changes,'deletions_or_replacements':dangerous}
    path=ROOT/'docs/operations/terraform-plan-summary.json'
    path.write_text(json.dumps(summary,indent=2),encoding='utf-8')
    print(json.dumps(summary,indent=2))
    if dangerous: raise SystemExit('Destructive change requires review')

if __name__=='__main__':main()
