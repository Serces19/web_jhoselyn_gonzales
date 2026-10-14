"""Local release checks: no AWS calls, no GitHub runner or cloud service."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]
sys.stdout.reconfigure(encoding='utf-8')


def main():
    if not os.environ.get('VIRTUAL_ENV'):
        raise SystemExit('Activa .venv\\Scripts\\activate antes de ejecutar uv run python scripts/ops/check_local.py')
    npm = shutil.which('npm.cmd' if os.name == 'nt' else 'npm')
    uv = shutil.which('uv')
    if not npm or not uv:
        raise SystemExit('npm y uv son necesarios')
    checks = [('documents', [uv, 'run', 'python', 'scripts/ops/check_docs.py'], ROOT),
              ('backend', [uv, 'run', 'pytest', '-q'], ROOT),
              ('frontend-lint', [npm, 'run', 'lint'], ROOT / 'frontend'),
              ('frontend-build', [npm, 'run', 'build'], ROOT / 'frontend')]
    report = {'checked_at_utc': datetime.now(timezone.utc).isoformat(), 'mode': 'local', 'checks': []}
    env = {**os.environ, 'UV_CACHE_DIR': str(ROOT / '.uv-cache')}
    for name, command, directory in checks:
        result = subprocess.run(command, cwd=directory, env=env, capture_output=True, text=True,
                                encoding='utf-8', errors='replace', timeout=600)
        print(name + ': ' + ('PASS' if result.returncode == 0 else 'FAIL'), flush=True)
        report['checks'].append({'name': name, 'passed': result.returncode == 0})
        log = ROOT / '.local-backups' / ('local-check-' + name + '.log')
        log.parent.mkdir(exist_ok=True)
        log.write_text(result.stdout + result.stderr, encoding='utf-8')
        if result.returncode:
            print(result.stdout[-2000:] + result.stderr[-1000:])
            break
    (ROOT / 'docs/operations/local-checks.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    raise SystemExit(0 if len(report['checks']) == len(checks) and all(x['passed'] for x in report['checks']) else 1)


if __name__ == '__main__':
    main()
