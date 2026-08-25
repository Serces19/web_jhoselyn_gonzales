import subprocess
import os
import sys

infra_dir = os.path.join(os.path.dirname(__file__), 'infrastructure')
print(f"Executing terraform apply in: {infra_dir}")

result = subprocess.run(
    ["terraform", "apply", "-auto-approve"],
    cwd=infra_dir,
    capture_output=True,
    text=True
)

print("--- STDOUT ---")
print(result.stdout)

if result.stderr:
    print("--- STDERR ---")
    print(result.stderr)

print(f"Exit code: {result.returncode}")
sys.exit(result.returncode)
