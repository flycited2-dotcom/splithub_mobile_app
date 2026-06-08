#!/usr/bin/env python3
"""Залить страницу privacy + обновлённую страницу установки. Креды как в deploy_apk."""
import os, sys, json
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import paramiko, urllib.request

REPO = Path(__file__).resolve().parents[1]
cfg = {}
p = Path.home() / ".splithub-deploy.json"
if p.exists(): cfg = json.loads(p.read_text(encoding="utf-8"))
host = os.environ.get("SPLITHUB_SSH_HOST") or cfg.get("host", "splithub.ru")
user = os.environ.get("SPLITHUB_SSH_USER") or cfg.get("user")
pw = os.environ.get("SPLITHUB_SSH_PASS") or cfg.get("password")
base = os.environ.get("SPLITHUB_BASE") or cfg.get("base")

c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(host, username=user, password=pw, timeout=30)
sftp = c.open_sftp()
c.exec_command(f"mkdir -p {base}/privacy")[1].channel.recv_exit_status()
jobs = [
    (REPO / "web/privacy/index.html", f"{base}/privacy/index.html"),
    (REPO / "web/app/index.html",     f"{base}/app/index.html"),
]
for local, remote in jobs:
    sftp.put(str(local), remote)
    print(f"залит {remote}  ({local.stat().st_size} байт)")
sftp.close(); c.close()

print("\n=== HTTP-проверка ===")
for u in ("https://splithub.ru/privacy/", "https://splithub.ru/app/"):
    req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print(f"{u} -> {r.status}  {r.headers.get('Content-Type')}")
    except Exception as ex:
        print(f"{u} -> ОШИБКА {ex}")
