import subprocess
import os
import sys

infra_dir = os.path.join(os.path.dirname(__file__), 'infrastructure')
print(f"Running terraform in: {infra_dir}", flush=True)

p = subprocess.Popen(
    ["terraform", "apply", "-auto-approve", "-no-color"],
    cwd=infra_dir,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    bufsize=1
)

for line in p.stdout:
    print(line, end='', flush=True)

p.wait()
print(f"\nFinished with code: {p.returncode}", flush=True)
sys.exit(p.returncode)
