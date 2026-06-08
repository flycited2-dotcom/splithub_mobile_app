#!/usr/bin/env python3
"""Залить tmp/index.html как preview.html (noindex) для утверждения дизайна.
Боевой index.html НЕ трогается. Креды как обычно."""
import os, sys, json, io
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import paramiko, urllib.request

REPO = Path(__file__).resolve().parents[1]
html = (REPO / "tmp/index.html").read_text(encoding="utf-8")
# вставляем noindex сразу после <head ...>
import re
html = re.sub(r"(<head[^>]*>)", r'\1\n<meta name="robots" content="noindex, nofollow">', html, count=1)

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
sftp.putfo(io.BytesIO(html.encode("utf-8")), f"{base}/preview.html")
print(f"залит preview.html ({len(html)} символов)")
sftp.close(); c.close()

req = urllib.request.Request("https://splithub.ru/preview.html", headers={"User-Agent":"Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=30) as r:
    print(f"https://splithub.ru/preview.html -> {r.status} {r.headers.get('Content-Type')}")
