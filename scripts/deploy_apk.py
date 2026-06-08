#!/usr/bin/env python3
"""Залить подписанный release APK + страницу установки на splithub.ru.

Креды НЕ хранятся в коде. Берутся из (в порядке приоритета):
  1) env SPLITHUB_SSH_USER / SPLITHUB_SSH_PASS
  2) JSON-файл вне репозитория: ~/.splithub-deploy.json
     {"host":..., "user":..., "password":..., "base":...}

Заливает:
  <base>/app/splithub.apk   <- собранный app-release.apk
  <base>/app/index.html     <- dist/app/index.html (страница установки)

После заливки проверяет размер файла на сервере, осматривает корень сайта
(llms.txt / robots.txt / privacy) и печатает публичный URL.
"""
import os, sys, json, hashlib
from pathlib import Path

try:
    import paramiko
except ImportError:
    sys.exit("paramiko не установлен: pip install paramiko")

REPO = Path(__file__).resolve().parents[1]
APK = REPO / "android/app/build/outputs/apk/release/app-release.apk"
PAGE = REPO / "web/app/index.html"

cfg = {}
cfg_path = Path.home() / ".splithub-deploy.json"
if cfg_path.exists():
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))

host = os.environ.get("SPLITHUB_SSH_HOST") or cfg.get("host", "splithub.ru")
user = os.environ.get("SPLITHUB_SSH_USER") or cfg.get("user")
pw = os.environ.get("SPLITHUB_SSH_PASS") or cfg.get("password")
base = os.environ.get("SPLITHUB_BASE") or cfg.get("base")

if not user or not pw:
    sys.exit("Нет кредов: задай env SPLITHUB_SSH_USER/PASS или ~/.splithub-deploy.json")
if not APK.exists():
    sys.exit(f"APK не найден: {APK}")
if not PAGE.exists():
    sys.exit(f"Страница не найдена: {PAGE}")

apk_size = APK.stat().st_size
apk_sha = hashlib.sha256(APK.read_bytes()).hexdigest()
print(f"Локальный APK: {apk_size} байт, sha256={apk_sha[:16]}…")

cli = paramiko.SSHClient()
cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
cli.connect(host, username=user, password=pw, timeout=30)

def run(cmd):
    _i, o, e = cli.exec_command(cmd)
    return (o.read() + e.read()).decode(errors="replace").strip()

app_dir = f"{base}/app"
print("free space:", run("df -h ~ | tail -1"))
run(f"mkdir -p {app_dir}")

sftp = cli.open_sftp()
def put(local, remote):
    done = {"n": 0}
    def cb(t, total):
        pct = int(t * 100 / total) if total else 0
        if pct >= done["n"] + 10:
            done["n"] = pct
            print(f"  {remote.split('/')[-1]}: {pct}%", flush=True)
    sftp.put(str(local), remote, callback=cb)

print("Заливаю APK…")
put(APK, f"{app_dir}/splithub.apk")
print("Заливаю страницу установки…")
put(PAGE, f"{app_dir}/index.html")
sftp.close()

remote_size = run(f"stat -c %s {app_dir}/splithub.apk 2>/dev/null || wc -c < {app_dir}/splithub.apk")
print(f"\nРазмер на сервере: {remote_size} (локально {apk_size})")
ok = remote_size.strip() == str(apk_size)
print("Размер совпал ✅" if ok else "⚠️ РАЗМЕР НЕ СОВПАЛ — заливка неполная")

print("\n=== осмотр корня сайта (чтобы ничего не затереть) ===")
for f in ("llms.txt", "robots.txt", "sitemap.xml"):
    print(f"-- {f} --")
    print(run(f"[ -f {base}/{f} ] && head -40 {base}/{f} || echo '(нет файла)'"))
print("-- privacy страницы --")
print(run(f"ls -1 {base} | grep -i -E 'privac|polic|conf' || echo '(нет privacy-файлов в корне)'"))
cli.close()

print("\nГотово. Ссылки:")
print("  Страница установки: https://splithub.ru/app/")
print("  Прямой APK:         https://splithub.ru/app/splithub.apk")
sys.exit(0 if ok else 1)
