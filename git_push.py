import subprocess
import sys

commands = [
    ["git", "init"],
    ["git", "add", "."],
    ["git", "commit", "-m", "Initial commit from assistant"],
    ["git", "branch", "-M", "main"],
    ["git", "remote", "add", "origin", "https://github.com/Serces19/web_jhoselyn_gonzales.git"],
    ["git", "push", "-u", "origin", "main"]
]

for cmd in commands:
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error executing {' '.join(cmd)}: {result.stderr}")
        # Ignore errors for remote add if it already exists
        if "remote" not in cmd:
            sys.exit(1)
    else:
        print(result.stdout)
print("Finished!")
