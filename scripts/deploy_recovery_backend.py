#!/usr/bin/env python3
"""Безопасный деплой бэкенда восстановления пароля на splithub.ru.
Email при регистрации опционален (флаг email_required='0') — ничего не ломается.
Бэкап каждого файла (cp -p), php -l, дымовой тест, чистка тест-юзеров.
Креды: ~/.splithub-deploy.json."""
import json, sys, time, posixpath, urllib.request
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import paramiko

REPO = Path(__file__).resolve().parents[1]
SRC = REPO / "server-src"
FILES = [
    "db/init.php",
    "api/lib/password_reset.php",
    "api/lib/mobile_auth.php",
    "api/mobile.php",
    "api/auth.php",
]
cfg = json.loads((Path.home() / ".splithub-deploy.json").read_text(encoding="utf-8"))
base = cfg["base"]
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(cfg["host"], username=cfg["user"], password=cfg["password"], timeout=30)
sftp = c.open_sftp()
def run(cmd):
    _i, o, e = c.exec_command(cmd); return (o.read() + e.read()).decode(errors="replace")

stamp = time.strftime("%Y%m%d-%H%M%S")
print("=== бэкап + деплой ===")
for rel in FILES:
    remote = posixpath.join(base, rel)
    exists = run(f"[ -f '{remote}' ] && echo yes || echo no").strip()
    if exists == "yes":
        print(rel, "backup:", run(f"cp -p '{remote}' '{remote}.bak-recovery-{stamp}' && echo ok").strip())
    else:
        print(rel, "(новый файл, бэкап не нужен)")
    sftp.put(str(SRC / rel), remote)
    lint = run(f"php -l '{remote}' 2>&1").strip().splitlines()[-1]
    print("  deploy +", lint)
sftp.close()

print("\n=== дымовой тест (HTTP) ===")
def post(path, payload):
    req = urllib.request.Request(f"https://splithub.ru/{path}", data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "User-Agent": "deploy/1.0"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r: return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode())
        except Exception: return e.code, {}
    except Exception as e: return None, {"err": str(e)}

ts = str(int(time.time()))[-6:]
no_email_phone = "+79008" + ts
st1, b1 = post("api/mobile.php?action=register", {"name": "СМОУК НОЕМАИЛ", "phone": no_email_phone, "password": "test1234"})
print(f"register БЕЗ email -> {st1} ok={b1.get('ok')} (ожидаем ok=True: email опционален)")
with_email_phone = "+79009" + ts
st2, b2 = post("api/mobile.php?action=register", {"name": "СМОУК ЕМАИЛ", "phone": with_email_phone, "password": "test1234", "email": "smoke@example.com"})
print(f"register С email -> {st2} ok={b2.get('ok')}")
st3, b3 = post("api/mobile.php?action=request_password_reset", {"identifier": with_email_phone})
print(f"request_password_reset -> {st3} state={b3.get('state')} masked={b3.get('email_masked')}")
st4, b4 = post("api/mobile.php?action=reset_password", {"identifier": with_email_phone, "code": "000000", "password": "newpass1"})
print(f"reset_password неверный код -> {st4} code={b4.get('code')} (ожидаем INVALID_CODE)")

# чистка: удалить ровно созданных тестовых юзеров по id
ids = [str(b.get("user", {}).get("id")) for b in (b1, b2) if b.get("user", {}).get("id")]
if ids:
    idlist = ",".join(ids)
    db = run(f"ls {base}/db/*.sqlite 2>/dev/null").strip().split("\n")[0]
    sql = f"DELETE FROM password_resets WHERE user_id IN ({idlist}); DELETE FROM mobile_sessions WHERE user_id IN ({idlist}); DELETE FROM users WHERE id IN ({idlist});"
    out = run(f"sqlite3 {db} \"{sql}\" 2>&1")
    print(f"\nчистка тест-юзеров id={idlist}: {'ok' if not out.strip() else out.strip()}")
c.close()
print("\nГотово. Бэкап-суффикс:", f".bak-recovery-{stamp}")
