#!/usr/bin/env python3
"""Keep the answer-key sources in the PUBLIC repo only in encrypted form.
  DECK_PASSWORD=... python3 keys/vault.py pack     # keys/parts/*.html  -> keys/src.enc  (commit this file)
  DECK_PASSWORD=... python3 keys/vault.py unpack   # keys/src.enc       -> keys/parts/   (to edit; never commit parts)
AES-256-GCM, key from PBKDF2-SHA256 (600,000 rounds), the same scheme as the published locked deck.
The password is never stored in the repo; the owner keeps it."""
import os, sys, io, json, base64, hashlib, tarfile
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

HERE = Path(__file__).parent
PARTS, BOX = HERE / 'parts', HERE / 'src.enc'
pw = os.environ.get('DECK_PASSWORD', '')
if len(pw) < 10: sys.exit('set DECK_PASSWORD (10+ characters)')
b, ub = (lambda x: base64.b64encode(x).decode()), base64.b64decode

def key(salt, n): return hashlib.pbkdf2_hmac('sha256', pw.encode(), salt, n, 32)

if sys.argv[1:] == ['pack']:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode='w:gz') as t:
        for f in sorted(PARTS.glob('*.html')): t.add(f, arcname=f.name)
    salt, iv, n = os.urandom(16), os.urandom(12), 600000
    BOX.write_text(json.dumps({'s': b(salt), 'i': b(iv), 'n': n, 'c': b(AESGCM(key(salt, n)).encrypt(iv, buf.getvalue(), None))}))
    print('packed', len(list(PARTS.glob('*.html'))), 'parts ->', BOX.name)
elif sys.argv[1:] == ['unpack']:
    d = json.loads(BOX.read_text())
    data = AESGCM(key(ub(d['s']), d['n'])).decrypt(ub(d['i']), ub(d['c']), None)
    PARTS.mkdir(exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as t:
        for m in t.getmembers():
            if m.isfile() and '/' not in m.name and m.name.endswith('.html'):
                (PARTS / m.name).write_bytes(t.extractfile(m).read())
    print('unpacked into', PARTS)
else:
    sys.exit(__doc__)
