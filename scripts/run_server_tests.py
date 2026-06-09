#!/usr/bin/env python3
"""Залить песочницу сервера (tmp/server-api/) во временную папку на сервере и
прогнать PHP-тесты там (прод-БД и прод-файлы НЕ трогаются).

Креды: ~/.splithub-deploy.json. Запуск: python scripts/run_server_tests.py
"""
import os, sys, json, posixpath
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import paramiko

REPO = Path(__file__).resolve().parents[1]
SRC = REPO / "server-src"
REMOTE = "pr-dev"  # относительно домашней папки пользователя

cfg = json.loads((Path.home() / ".splithub-deploy.json").read_text(encoding="utf-8"))
c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(cfg["host"], username=cfg["user"], password=cfg["password"], timeout=30)
sftp = c.open_sftp()
def run(cmd):
    _i, o, e = c.exec_command(cmd)
    return (o.read() + e.read()).decode(errors="replace")

# очистить и пересоздать удалённую папку
run(f"rm -rf ~/{REMOTE} && mkdir -p ~/{REMOTE}")
home = run("echo -n $HOME").strip()
base_remote = posixpath.join(home, REMOTE)

# рекурсивно залить дерево
for path in sorted(SRC.rglob("*")):
    rel = path.relative_to(SRC).as_posix()
    rpath = posixpath.join(base_remote, rel)
    if path.is_dir():
        run(f"mkdir -p '{rpath}'")
    else:
        sftp.put(str(path), rpath)
sftp.close()

# синтаксис-линт всех php-файлов (кроме тестов)
lint_ok = True
for path in sorted(SRC.rglob("*.php")):
    if "tests" in path.relative_to(SRC).parts:
        continue
    rel = path.relative_to(SRC).as_posix()
    out = run(f"cd {base_remote} && php -l '{rel}' 2>&1")
    if "No syntax errors" not in out:
        lint_ok = False
        print(f"LINT FAIL {rel}:\n{out.strip()}")
print("php -l:", "все ОК" if lint_ok else "ЕСТЬ ОШИБКИ СИНТАКСИСА")

# прогнать тесты
tests = sorted((SRC / "tests").glob("*.php"))
flags = "-d zend.assertions=1 -d assert.exception=1"
all_ok = True
for t in tests:
    name = t.name
    out = run(f"cd {base_remote} && php {flags} tests/{name} 2>&1; echo EXIT=$?")
    ok = "EXIT=0" in out and "OK " in out
    all_ok = all_ok and ok
    print(f"\n=== {name} -> {'PASS' if ok else 'FAIL'} ===")
    print(out.strip())
c.close()
sys.exit(0 if all_ok else 1)
