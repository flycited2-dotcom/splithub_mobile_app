#!/usr/bin/env python3
"""Скачать схему БД и почтовый код для дизайна восстановления пароля."""
import os, sys, json
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import paramiko
REPO = Path(__file__).resolve().parents[1]
out = REPO / "tmp" / "server-api"; out.mkdir(parents=True, exist_ok=True)
cfg = json.loads((Path.home()/".splithub-deploy.json").read_text(encoding="utf-8"))
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(cfg["host"], username=cfg["user"], password=cfg["password"], timeout=30)
def run(cmd):
    _i,o,e=c.exec_command(cmd); return (o.read()+e.read()).decode(errors="replace").strip()
base=cfg["base"]
print("=== users schema ===")
print(run(f"cd {base} && grep -niE 'email|users' db/init.php | head -40"))
print("\n=== как шлют email (mail/smtp/PHPMailer) ===")
print(run(f"cd {base} && grep -rilE 'PHPMailer|mail\\(|smtp' api lib *.php 2>/dev/null | head"))
print("\n=== normalizePhone ===")
print(run(f"cd {base} && grep -niA6 'function normalizePhone' db/init.php"))
sftp=c.open_sftp()
for rel in ("db/init.php","api/lib/manager_notify.php","api/auth.php"):
    try:
        dst=out/Path(rel).name; sftp.get(f"{base}/{rel}", str(dst)); print("скачан", rel, dst.stat().st_size)
    except Exception as ex: print("нет", rel, ex)
sftp.close(); c.close()
