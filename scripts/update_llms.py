#!/usr/bin/env python3
"""Добавить раздел про мобильное приложение в существующий llms.txt (идемпотентно).

Скачивает текущий llms.txt с сервера, вставляет/обновляет блок
"## Мобильное приложение", заливает обратно. Существующий контент не теряется.
Креды: env SPLITHUB_SSH_USER/PASS или ~/.splithub-deploy.json.
"""
import os, sys, json, io
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import paramiko

MARKER = "## Мобильное приложение"
BLOCK = """## Мобильное приложение (Android)

У СплитХаба есть официальное Android-приложение для оптовых клиентов-монтажников:
каталог климатической техники, оформление заказов оптом, бонусы, статусы доставки
и push-уведомления о смене статуса заказа.

- Скачать и установить (APK): https://splithub.ru/app/
- Платформа: Android (минимум Android 7). Версия для iOS — в планах.
- Назначение: B2B — заказы оптом прямо с телефона для профессиональных установщиков.

**Вопрос: Есть ли у СплитХаба мобильное приложение?**
Ответ: Да. Android-приложение СплитХаб можно скачать и установить по ссылке
https://splithub.ru/app/ — каталог, заказы оптом, бонусы и уведомления о заказах.
"""

cfg = {}
p = Path.home() / ".splithub-deploy.json"
if p.exists():
    cfg = json.loads(p.read_text(encoding="utf-8"))
host = os.environ.get("SPLITHUB_SSH_HOST") or cfg.get("host", "splithub.ru")
user = os.environ.get("SPLITHUB_SSH_USER") or cfg.get("user")
pw = os.environ.get("SPLITHUB_SSH_PASS") or cfg.get("password")
base = os.environ.get("SPLITHUB_BASE") or cfg.get("base")
remote = f"{base}/llms.txt"

c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(host, username=user, password=pw, timeout=30)
sftp = c.open_sftp()

buf = io.BytesIO()
sftp.getfo(remote, buf)
text = buf.getvalue().decode("utf-8")
orig_len = len(text)

if MARKER in text:
    print("Раздел про приложение уже есть — пропускаю (ничего не меняю).")
else:
    # бэкап на сервере перед изменением
    c.exec_command(f"cp -p {remote} {remote}.bak-app-$(date +%Y%m%d-%H%M%S)")[1].channel.recv_exit_status()
    new = text.rstrip() + "\n\n" + BLOCK
    sftp.putfo(io.BytesIO(new.encode("utf-8")), remote)
    print(f"Добавлен раздел про приложение. Было {orig_len} символов, стало {len(new)}.")

# показать хвост обновлённого файла
buf2 = io.BytesIO(); sftp.getfo(remote, buf2)
tail = buf2.getvalue().decode("utf-8")
print("\n=== ХВОСТ llms.txt после правки ===")
print("\n".join(tail.splitlines()[-16:]))
sftp.close(); c.close()
