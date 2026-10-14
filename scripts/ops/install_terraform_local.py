"""Workspace-only official Terraform amd64 download with vendor checksum verification."""
import hashlib
from pathlib import Path
import urllib.request
import zipfile

ROOT=Path(__file__).resolve().parents[2]
version='1.15.4'
base=f'https://releases.hashicorp.com/terraform/{version}/'
filename=f'terraform_{version}_windows_amd64.zip'
destination=ROOT/'.tools/terraform'
destination.mkdir(parents=True,exist_ok=True)
archive=destination/filename
urllib.request.urlretrieve(base+filename,archive)
checksums=urllib.request.urlopen(base+f'terraform_{version}_SHA256SUMS').read().decode()
expected=next(line.split()[0] for line in checksums.splitlines() if line.split()[-1]==filename)
assert hashlib.sha256(archive.read_bytes()).hexdigest()==expected,'Vendor checksum mismatch'
with zipfile.ZipFile(archive) as package:
    assert 'terraform.exe' in package.namelist()
    (destination/'terraform.exe').write_bytes(package.read('terraform.exe'))
print('Official Terraform windows_amd64 installed locally; SHA256 verified.')
