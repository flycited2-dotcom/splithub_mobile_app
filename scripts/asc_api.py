#!/usr/bin/env python3
"""Тонкий клиент App Store Connect API: ES256-JWT через cryptography (без PyJWT).
Ключ/ID берутся из eas.json (submit.production.ios) + secrets/apple/*.p8.
Использование:  from asc_api import asc ;  asc("GET","/v1/apps/<id>")
CLI:  python scripts/asc_api.py GET /v1/apps/6785234307
"""
import base64, json, time, sys, urllib.request, urllib.error
from pathlib import Path
from cryptography.hazmat.primitives.serialization import load_pem_private_key
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature

ROOT = Path(__file__).resolve().parents[1]
CFG = json.loads((ROOT / "eas.json").read_text(encoding="utf-8"))["submit"]["production"]["ios"]
KEY_ID = CFG["ascApiKeyId"]
ISSUER_ID = CFG["ascApiKeyIssuerId"]
KEY_PATH = ROOT / CFG["ascApiKeyPath"]
BASE = "https://api.appstoreconnect.apple.com"

def _b64(b: bytes) -> bytes:
    return base64.urlsafe_b64encode(b).rstrip(b"=")

def _token() -> str:
    key = load_pem_private_key(KEY_PATH.read_bytes(), password=None)
    header = {"alg": "ES256", "kid": KEY_ID, "typ": "JWT"}
    now = int(time.time())
    payload = {"iss": ISSUER_ID, "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"}
    si = _b64(json.dumps(header, separators=(",", ":")).encode()) + b"." + _b64(json.dumps(payload, separators=(",", ":")).encode())
    der = key.sign(si, ec.ECDSA(hashes.SHA256()))
    r, s = decode_dss_signature(der)
    raw = r.to_bytes(32, "big") + s.to_bytes(32, "big")
    return (si + b"." + _b64(raw)).decode()

def asc(method: str, path: str, body=None):
    url = BASE + path if path.startswith("/") else path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method,
        headers={"Authorization": "Bearer " + _token(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            txt = r.read().decode()
            return r.status, (json.loads(txt) if txt else {})
    except urllib.error.HTTPError as e:
        txt = e.read().decode()
        try: return e.code, json.loads(txt)
        except Exception: return e.code, {"raw": txt}

if __name__ == "__main__":
    m = sys.argv[1] if len(sys.argv) > 1 else "GET"
    p = sys.argv[2] if len(sys.argv) > 2 else "/v1/apps"
    b = json.loads(sys.argv[3]) if len(sys.argv) > 3 else None
    st, resp = asc(m, p, b)
    print("HTTP", st)
    print(json.dumps(resp, indent=2, ensure_ascii=False)[:3000])
