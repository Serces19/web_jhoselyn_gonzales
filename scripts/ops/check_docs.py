"""Validate local links, canonical requirement references and syntax; no AWS calls."""
import ast
import re
import subprocess
import sys
from pathlib import Path
sys.stdout.reconfigure(encoding='utf-8')
ROOT=Path(__file__).resolve().parents[2]
errors=[]
files=[ROOT/'README.md',*sorted((ROOT/'docs').rglob('*.md'))]
for path in files:
    value=path.read_text(encoding='utf-8')
    for target in re.findall(r'\]\(([^)]+)\)',value):
        if target.startswith(('https:','http:','#','mailto:','tel:','codex:')): continue
        target=target.split('#')[0]
        if not (path.parent/target).exists(): errors.append(f'{path.relative_to(ROOT)} -> {target}')
for path in (ROOT/'infrastructure/lambda_api').glob('*.py'):
    ast.parse(path.read_text(encoding='utf-8'))
spec=ROOT/'docs/specs/despacho-digital-coste-minimo'
criteria=set(re.findall(r'\*\*(R\d{2}\.\d+):\*\*',(spec/'requirements.md').read_text(encoding='utf-8')))
references=set(re.findall(r'R\d{2}\.\d+',(spec/'tasks.md').read_text(encoding='utf-8')))
if criteria!=references: errors.append('Requirement references differ')
result=subprocess.run(['git','-c','safe.directory=K:/Trabajos/Code/jhoselyn_gonzales_webpage','diff','--check'],capture_output=True,text=True,encoding='utf-8',errors='replace')
if result.returncode: errors.append(result.stdout or result.stderr)
print(f'Documents: {len(files)}; requirements: {len(criteria)}; errors: {errors}')
raise SystemExit(bool(errors))
