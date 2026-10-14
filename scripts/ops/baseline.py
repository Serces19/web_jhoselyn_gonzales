"""Read-only inventory; never prints state attributes, credentials, or client records."""
import argparse
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--profile')
    args = parser.parse_args()
    state_path = ROOT / 'infrastructure/terraform.tfstate'
    state = json.loads(state_path.read_text(encoding='utf-8')) if state_path.exists() else {}
    counts = {}
    for resource in state.get('resources', []):
        counts[resource['type']] = counts.get(resource['type'], 0) + len(resource.get('instances', []))
    command = ['aws', 'sts', 'get-caller-identity', '--query', 'Account', '--output', 'text']
    if args.profile:
        command += ['--profile', args.profile]
    result = subprocess.run(command, capture_output=True, text=True, encoding='utf-8', errors='replace')
    # Error classes only; do not copy raw diagnostics that might include sensitive values.
    identity = 'available' if result.returncode == 0 else 'unavailable'
    print(json.dumps({'state_resource_counts': counts, 'aws_identity': identity, 'aws_exit_code': result.returncode}, indent=2))

if __name__ == '__main__':
    main()
