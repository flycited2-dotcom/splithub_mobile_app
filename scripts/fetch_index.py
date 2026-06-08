#!/usr/bin/env python3
"""Скачать боевой index.html в tmp/ для точечной правки. Креды как обычно."""
import os, sys, json
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import paramiko

REPO = Path(__file__).resolve().parents[1]
out = REPO / "tmp"; out.mkdir(exist_ok=True)
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
local = out / "index.html"
sftp.get(f"{base}/index.html", str(local))
print(f"скачан {local} ({local.stat().st_size} байт)")
sftp.close(); c.close()
