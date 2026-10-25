"""Server credentials for deploy scripts. Never stored in this repo.

Looked up in order:
  1) env SPLITHUB_SSH_HOST / SPLITHUB_SSH_USER / SPLITHUB_SSH_PASS / SPLITHUB_BASE
  2) ~/.splithub-deploy.json  {"host", "user", "password", "base"}
  3) the site converter config  ../splithub/converter/config/deploy.json
     {"host", "port", "username", "password", "remote_path"}
"""
import json
import os
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
CANDIDATES = [
    Path.home() / ".splithub-deploy.json",
    REPO.parent / "splithub" / "converter" / "config" / "deploy.json",
]


def load():
    cfg = {}
    for path in CANDIDATES:
        if path.exists():
            raw = json.loads(path.read_text(encoding="utf-8"))
            cfg = {
                "host": raw.get("host"),
                "port": int(raw.get("port") or 22),
                "user": raw.get("user") or raw.get("username"),
                "password": raw.get("password"),
                "base": raw.get("base") or raw.get("remote_path"),
            }
            break
    cfg["host"] = os.environ.get("SPLITHUB_SSH_HOST") or cfg.get("host") or "splithub.ru"
    cfg["user"] = os.environ.get("SPLITHUB_SSH_USER") or cfg.get("user")
    cfg["password"] = os.environ.get("SPLITHUB_SSH_PASS") or cfg.get("password")
    cfg["base"] = os.environ.get("SPLITHUB_BASE") or cfg.get("base")
    cfg.setdefault("port", 22)
    missing = [k for k in ("user", "password", "base") if not cfg.get(k)]
    if missing:
        raise SystemExit(f"No deploy credentials ({', '.join(missing)}): see scripts/deploy_config.py")
    return cfg


def connect():
    import paramiko

    cfg = load()
    cli = paramiko.SSHClient()
    cli.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    cli.connect(cfg["host"], port=cfg["port"], username=cfg["user"], password=cfg["password"], timeout=30)
    return cli, cfg["base"]
