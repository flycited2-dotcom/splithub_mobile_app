#!/usr/bin/env python3
"""Залить подписанный release APK + страницу установки + version.json на splithub.ru.

Креды НЕ хранятся в коде — см. scripts/deploy_config.py.

Заливает:
  <base>/app/splithub.apk   <- собранный app-release.apk
  <base>/app/index.html     <- web/app/index.html (страница установки)
  <base>/app/version.json   <- номер версии для автообновления в приложении

Отказывается заливать APK, подписанный debug-ключом: такой APK не встанет
поверх версий, подписанных release.jks, и автообновление у пользователей сломается.

Запуск: python scripts/deploy_apk.py --notes "Что нового" [--optional]
"""
import argparse
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, str(Path(__file__).resolve().parent))
from deploy_config import REPO, connect  # noqa: E402

APK = REPO / "android/app/build/outputs/apk/release/app-release.apk"
PAGE = REPO / "web/app/index.html"
GRADLE = REPO / "android/app/build.gradle"
APK_URL = "https://splithub.ru/app/splithub.apk"


def build_version():
    text = GRADLE.read_text(encoding="utf-8")
    code = int(re.search(r"versionCode\s+(\d+)", text).group(1))
    name = re.search(r'versionName\s+"([^"]+)"', text).group(1)
    return code, name


def signer_subject():
    sdk = Path.home() / "AppData/Local/Android/Sdk/build-tools"
    tools = sorted(sdk.glob("*/apksigner.bat")) or sorted(sdk.glob("*/apksigner"))
    if not tools:
        sys.exit("apksigner не найден — не могу проверить подпись APK")
    out = subprocess.run([str(tools[-1]), "verify", "--print-certs", str(APK)],
                         capture_output=True, text=True, shell=str(tools[-1]).endswith(".bat"))
    if out.returncode != 0:
        sys.exit(f"APK не прошёл проверку подписи:\n{out.stderr}")
    match = re.search(r"certificate DN: (.+)", out.stdout)
    return match.group(1).strip() if match else ""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--notes", default="", help="текст «Что нового» в окне обновления")
    parser.add_argument("--optional", action="store_true",
                        help="обновление необязательное (по умолчанию все старые версии обязаны обновиться)")
    args = parser.parse_args()

    for path in (APK, PAGE):
        if not path.exists():
            sys.exit(f"Не найден: {path}")
    subject = signer_subject()
    print("Подпись APK:", subject)
    if "Android Debug" in subject:
        sys.exit("APK подписан debug-ключом. Положите android/app/release.jks и android/keystore.properties "
                 "и пересоберите — иначе обновление не встанет поверх установленной версии.")

    code, name = build_version()
    # Mandatory by default: every build older than this one must update (no "Later" button).
    manifest = {"versionCode": code, "versionName": name, "url": APK_URL,
                "notes": args.notes, "minVersionCode": 0 if args.optional else code}
    apk_size = APK.stat().st_size
    print(f"Версия {name} (code {code}), APK {apk_size} байт, sha256={hashlib.sha256(APK.read_bytes()).hexdigest()[:16]}…")

    cli, base = connect()

    def run(cmd):
        _i, out, err = cli.exec_command(cmd)
        return (out.read() + err.read()).decode(errors="replace").strip()

    app_dir = f"{base}/app"
    run(f"mkdir -p {app_dir}")
    sftp = cli.open_sftp()
    print("Заливаю APK…")
    sftp.put(str(APK), f"{app_dir}/splithub.apk.new")
    remote_size = run(f"stat -c %s {app_dir}/splithub.apk.new")
    if remote_size != str(apk_size):
        run(f"rm -f {app_dir}/splithub.apk.new")
        sys.exit(f"Размер на сервере {remote_size} ≠ {apk_size} — заливка неполная, ничего не заменено")
    run(f"mv -f {app_dir}/splithub.apk.new {app_dir}/splithub.apk")
    sftp.put(str(PAGE), f"{app_dir}/index.html")
    # version.json last: apps are told about the update only once the APK is in place.
    with sftp.open(f"{app_dir}/version.json", "w") as fh:
        fh.write(json.dumps(manifest, ensure_ascii=False, indent=2).encode("utf-8"))
    sftp.close()
    cli.close()

    print("\nГотово:")
    print("  Страница установки: https://splithub.ru/app/")
    print(f"  Прямой APK:         {APK_URL}")
    print("  Автообновление:     https://splithub.ru/app/version.json →", json.dumps(manifest, ensure_ascii=False))


if __name__ == "__main__":
    main()
