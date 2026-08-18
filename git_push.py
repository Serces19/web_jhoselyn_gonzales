import subprocess

commands = [
    ["git", "add", "-A"],
    ["git", "commit", "-m", "Phase 1 and 2 complete: blog, contacto, probono, faq, interactive areas"],
    ["git", "push", "origin", "main"]
]

for cmd in commands:
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        break

print("Done!")
