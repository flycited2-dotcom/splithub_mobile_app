#!/usr/bin/env python3
"""Проверить выкладку APK без повторной заливки + осмотреть корень сайта.

Креды: env SPLITHUB_SSH_USER/PASS или ~/.splithub-deploy.json (как в deploy_apk.py).
"""
import os, sys, json, urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import paramiko

cfg = {}
p = Path.home() / ".splithub-deploy.json"
if p.exists():
    cfg = json.loads(p.read_text(encoding="utf-8"))
host = os.environ.get("SPLITHUB_SSH_HOST") or cfg.get("host", "splithub.ru")
user = os.environ.get("SPLITHUB_SSH_USER") or cfg.get("user")
pw = os.environ.get("SPLITHUB_SSH_PASS") or cfg.get("password")
base = os.environ.get("SPLITHUB_BASE") or cfg.get("base")

c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(host, username=user, password=pw, timeout=30)
def run(cmd):
    _i, o, e = c.exec_command(cmd); return (o.read() + e.read()).decode(errors="replace").strip()

print("=== файлы в app/ ===")
print(run(f"ls -la {base}/app"))
print("\n=== корень сайта ===")
for f in ("llms.txt", "robots.txt", "sitemap.xml"):
    print(f"-- {f} --")
    print(run(f"[ -f {base}/{f} ] && head -40 {base}/{f} || echo '(нет файла)'"))
print("-- privacy-файлы в корне --")
print(run(f"ls -1 {base} | grep -i -E 'privac|polic|conf' || echo '(нет)'"))
c.close()

print("\n=== HTTP-проверка (как увидит клиент) ===")
def http(url, method="GET"):
    req = urllib.request.Request(url, method=method, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, dict(r.headers)
    except Exception as ex:
        return None, {"error": str(ex)}

st, h = http("https://splithub.ru/app/")
print(f"GET /app/  -> {st}  content-type={h.get('Content-Type')}")
st, h = http("https://splithub.ru/app/splithub.apk", method="HEAD")
print(f"HEAD /app/splithub.apk -> {st}  type={h.get('Content-Type')}  length={h.get('Content-Length')}")
