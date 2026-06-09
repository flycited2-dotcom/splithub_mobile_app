#!/usr/bin/env python3
"""Скачать серверные обработчики авторизации/регистрации в tmp/ для чтения."""
import os, sys, json
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import paramiko

REPO = Path(__file__).resolve().parents[1]
out = REPO / "tmp" / "server-api"; out.mkdir(parents=True, exist_ok=True)
cfg = {}
p = Path.home() / ".splithub-deploy.json"
if p.exists(): cfg = json.loads(p.read_text(encoding="utf-8"))
host = cfg.get("host", "splithub.ru"); user = cfg.get("user"); pw = cfg.get("password")
base = cfg.get("base")

c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(host, username=user, password=pw, timeout=30)
sftp = c.open_sftp()
def run(cmd):
    _i,o,e=c.exec_command(cmd); return (o.read()+e.read()).decode(errors="replace").strip()
print("=== файлы api/lib ===")
print(run(f"ls -la {base}/api {base}/api/lib 2>/dev/null"))
for rel in ("api/mobile.php", "api/lib/mobile_auth.php"):
    try:
        dst = out / Path(rel).name
        sftp.get(f"{base}/{rel}", str(dst))
        print(f"скачан {rel} -> {dst} ({dst.stat().st_size} б)")
    except Exception as ex:
        print(f"НЕ скачан {rel}: {ex}")
sftp.close(); c.close()
