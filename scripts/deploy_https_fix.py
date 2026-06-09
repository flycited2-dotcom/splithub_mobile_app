#!/usr/bin/env python3
"""1) Обновить /app/index.html (абсолютная https-ссылка на APK).
2) Добавить в .htaccess loop-safe редирект HTTP->HTTPS, с бэкапом и АВТО-ОТКАТОМ,
   если https перестанет отдавать 200 (защита от петли на proxy-SSL).
Креды: ~/.splithub-deploy.json."""
import json, sys, time, io, posixpath, urllib.request
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import paramiko

REDIRECT = (
    "# Force HTTPS (loop-safe for proxied SSL via X-Forwarded-Proto)\n"
    "<IfModule mod_rewrite.c>\n"
    "RewriteEngine On\n"
    "RewriteCond %{HTTPS} off\n"
    "RewriteCond %{HTTP:X-Forwarded-Proto} !https\n"
    "RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\n"
    "</IfModule>\n\n"
)
MARK = "# Force HTTPS (loop-safe"

cfg = json.loads((Path.home() / ".splithub-deploy.json").read_text(encoding="utf-8"))
base = cfg["base"]
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(cfg["host"], username=cfg["user"], password=cfg["password"], timeout=30)
def run(cmd):
    _i, o, e = c.exec_command(cmd); return (o.read() + e.read()).decode(errors="replace")
sftp = c.open_sftp()
stamp = time.strftime("%Y%m%d-%H%M%S")

# 1) install page
remote_page = posixpath.join(base, "app/index.html")
run(f"cp -p '{remote_page}' '{remote_page}.bak-https-{stamp}'")
sftp.put(str(Path("web/app/index.html")), remote_page)
print("обновлён /app/index.html (абсолютная https-ссылка)")

# 2) .htaccess
hpath = posixpath.join(base, ".htaccess")
buf = io.BytesIO();
try: sftp.getfo(hpath, buf); current = buf.getvalue().decode("utf-8", "replace")
except Exception: current = ""
if MARK in current:
    print(".htaccess уже содержит редирект — пропускаю")
else:
    run(f"cp -p '{hpath}' '{hpath}.bak-https-{stamp}'")
    new = REDIRECT + current
    sftp.putfo(io.BytesIO(new.encode("utf-8")), hpath)
    print(".htaccess обновлён, проверяю...")
    time.sleep(2)
    def get(url, follow=True):
        op = urllib.request.build_opener() if follow else urllib.request.build_opener(type("N",(urllib.request.HTTPRedirectHandler,),{"redirect_request":lambda *a,**k:None})())
        try:
            with op.open(urllib.request.Request(url, headers={"User-Agent":"Mozilla/5.0"}), timeout=15) as r:
                return r.status, r.headers.get("Location")
        except urllib.error.HTTPError as e: return e.code, e.headers.get("Location")
        except Exception as e: return None, str(e)
    s_https, _ = get("https://splithub.ru/")
    s_http, loc = get("http://splithub.ru/", follow=False)
    print(f"  https:// -> {s_https} (нужно 200)")
    print(f"  http://  -> {s_http} Location={loc} (нужно 301 на https)")
    if s_https != 200:
        run(f"cp -p '{hpath}.bak-https-{stamp}' '{hpath}'")
        print("  ⚠️ https сломался — ОТКАТил .htaccess из бэкапа")
    else:
        print("  ✅ редирект работает, https цел")
sftp.close(); c.close()
