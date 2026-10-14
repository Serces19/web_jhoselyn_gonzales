"""Report potential hardcoded secrets by location only, never values."""
import ast
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
for p in [*ROOT.glob('*.py'),*sorted((ROOT/'scripts').rglob('*.py'))]:
    if p.name==Path(__file__).name or 'experiments' in p.parts: continue
    tree=ast.parse(p.read_text(encoding='utf-8'))
    for node in ast.walk(tree):
        if isinstance(node,ast.keyword) and node.arg and any(k in node.arg.lower() for k in ('password','secret_access','access_key','token')) and isinstance(node.value,ast.Constant) and isinstance(node.value.value,str):
            print(f'{p.relative_to(ROOT)}:{node.lineno}: literal in {node.arg}')
        if isinstance(node,ast.Assign) and isinstance(node.value,ast.Constant) and isinstance(node.value.value,str):
            for target in node.targets:
                if isinstance(target,ast.Name) and any(k in target.id.lower() for k in ('password','secret','access_key','token')):
                    print(f'{p.relative_to(ROOT)}:{node.lineno}: literal in {target.id}')
