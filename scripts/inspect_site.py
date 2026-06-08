#!/usr/bin/env python3
"""Осмотреть структуру сайта splithub.ru, чтобы собрать корректный sitemap.
Креды: env SPLITHUB_SSH_USER/PASS или ~/.splithub-deploy.json. Только чтение."""
import os, sys, json
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import paramiko

cfg = {}
p = Path.home() / ".splithub-deploy.json"
if p.exists(): cfg = json.loads(p.read_text(encoding="utf-8"))
host = os.environ.get("SPLITHUB_SSH_HOST") or cfg.get("host", "splithub.ru")
user = os.environ.get("SPLITHUB_SSH_USER") or cfg.get("user")
pw = os.environ.get("SPLITHUB_SSH_PASS") or cfg.get("password")
base = os.environ.get("SPLITHUB_BASE") or cfg.get("base")

c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(host, username=user, password=pw, timeout=30)
def run(cmd):
    _i, o, e = c.exec_command(cmd); return (o.read()+e.read()).decode(errors="replace").strip()

print("=== .html в корне (с датой) ===")
print(run(f"cd {base} && ls -la --time-style=+%Y-%m-%d *.html 2>/dev/null || echo none"))
print("\n=== каталоги верхнего уровня ===")
print(run(f"cd {base} && find . -maxdepth 1 -type d | sort"))
print("\n=== index.html главной: <title> и заголовки разделов ===")
print(run(f"cd {base} && grep -o -i '<title>[^<]*</title>' index.html 2>/dev/null | head -1"))
print(run(f"cd {base} && grep -o -i 'id=\"[a-z-]*\"' index.html 2>/dev/null | sort -u | head -40"))
print("\n=== существующие robots/sitemap ===")
print(run(f"cd {base} && ls -la robots.txt sitemap.xml 2>/dev/null || echo 'нет'"))
print("\n=== ссылки/якоря в навигации главной (href) ===")
print(run(f"cd {base} && grep -o -i 'href=\"[^\"]*\"' index.html 2>/dev/null | sort -u | head -40"))
c.close()
