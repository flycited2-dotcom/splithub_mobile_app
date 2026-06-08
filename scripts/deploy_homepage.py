#!/usr/bin/env python3
"""Применить tmp/index.html на боевой index.html: бэкап -> заливка -> удалить preview.
Креды как обычно."""
import os, sys, json, io, time
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import paramiko, urllib.request

REPO = Path(__file__).resolve().parents[1]
html = (REPO / "tmp/index.html").read_text(encoding="utf-8")
assert "hero-app-cta" in html, "в tmp/index.html нет правок CTA — стоп"

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

stamp = time.strftime("%Y%m%d-%H%M%S")
print("бэкап:", run(f"cp -p {base}/index.html {base}/index.html.bak-cta-{stamp} && echo OK {base}/index.html.bak-cta-{stamp}"))

sftp = c.open_sftp()
sftp.putfo(io.BytesIO(html.encode("utf-8")), f"{base}/index.html")
print("залит index.html")
# убрать превью
print("удаление preview:", run(f"rm -f {base}/preview.html && echo removed"))
sftp.close(); c.close()

print("\n=== HTTP-проверка боевой главной ===")
req = urllib.request.Request("https://splithub.ru/", headers={"User-Agent":"Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=30) as r:
    body = r.read().decode("utf-8","replace")
    print(f"GET / -> {r.status} {r.headers.get('Content-Type')}")
    print("CTA-баннер на странице:", "ДА ✅" if "hero-app-cta" in body else "НЕТ ⚠️")
    print("кнопка в шапке:", "ДА ✅" if "nav-app-btn" in body else "НЕТ ⚠️")
req2 = urllib.request.Request("https://splithub.ru/preview.html", headers={"User-Agent":"Mozilla/5.0"})
try:
    urllib.request.urlopen(req2, timeout=15); print("preview.html: всё ещё доступна ⚠️")
except urllib.error.HTTPError as e:
    print(f"preview.html: удалена ✅ ({e.code})")
