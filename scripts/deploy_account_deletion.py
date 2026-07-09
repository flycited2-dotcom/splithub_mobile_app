#!/usr/bin/env python3
"""Безопасный деплой удаления аккаунта (Apple 5.1.1(v)) на splithub.ru.
Бэкап каждого файла (cp -p), php -l, дымовой тест полного цикла
(register -> delete_account -> login должен упасть), чистка тестовой строки.
Креды: ~/.splithub-deploy.json."""
import json, sys, time, posixpath, urllib.request
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import paramiko

REPO = Path(__file__).resolve().parents[1]
SRC = REPO / "server-src"
FILES = [
    "db/init.php",
    "api/mobile.php",
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
        print(rel, "backup:", run(f"cp -p '{remote}' '{remote}.bak-delacct-{stamp}' && echo ok").strip())
    else:
        print(rel, "(новый файл, бэкап не нужен)")
    sftp.put(str(SRC / rel), remote)
    lint = run(f"php -l '{remote}' 2>&1").strip().splitlines()[-1]
    print("  deploy +", lint)
sftp.close()

print("\n=== дымовой тест (HTTP) ===")
def call(path, payload, token=None):
    headers = {"Content-Type": "application/json", "User-Agent": "deploy/1.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"https://splithub.ru/{path}", data=json.dumps(payload).encode(),
        headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=20) as r: return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode())
        except Exception: return e.code, {}
    except Exception as e: return None, {"err": str(e)}

ts = str(int(time.time()))[-6:]
phone = "+79007" + ts
email = f"smoke-delacct-{ts}@example.com"
st1, b1 = call("api/mobile.php?action=register", {"name": "СМОУК УДАЛЕНИЕ", "phone": phone, "password": "test1234", "email": email})
print(f"register -> {st1} ok={b1.get('ok')} {b1 if not b1.get('ok') else ''}")
token = b1.get("token")
uid = b1.get("user", {}).get("id")

st2, b2 = call("api/mobile.php?action=delete_account", {}, token=token)
print(f"delete_account -> {st2} ok={b2.get('ok')} (ожидаем ok=True)")

st3, b3 = call("api/mobile.php?action=login", {"phone": phone, "password": "test1234"})
print(f"login старым паролем/телефоном после удаления -> {st3} ok={b3.get('ok')} (ожидаем ok=False)")

st4, b4 = call("api/mobile.php?action=register", {"name": "ПОВТОР", "phone": phone, "password": "test5678", "email": f"smoke-delacct2-{ts}@example.com"})
print(f"повторная регистрация на тот же номер -> {st4} ok={b4.get('ok')} (ожидаем ok=True: номер освободился)")

# чистка: удалить обе тестовые строки (анонимизированную и новую) по id
ids = [str(uid)] if uid else []
if b4.get("user", {}).get("id"):
    ids.append(str(b4["user"]["id"]))
if ids:
    idlist = ",".join(ids)
    db = run(f"ls {base}/db/*.sqlite 2>/dev/null").strip().split("\n")[0]
    sql = f"DELETE FROM mobile_sessions WHERE user_id IN ({idlist}); DELETE FROM mobile_devices WHERE user_id IN ({idlist}); DELETE FROM users WHERE id IN ({idlist});"
    out = run(f"sqlite3 {db} \"{sql}\" 2>&1")
    print(f"\nчистка тест-юзеров id={idlist}: {'ok' if not out.strip() else out.strip()}")
c.close()
print("\nГотово. Бэкап-суффикс:", f".bak-delacct-{stamp}")
