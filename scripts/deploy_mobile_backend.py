#!/usr/bin/env python3
"""Deploy the mobile API: admin overrides in the app catalog + guest checkout.

Only mobile files are touched (AGENTS.md "isolation"): send.php, index.html,
products.json and api/lib/catalog.php are NOT uploaded.

Steps: back up the live files -> upload to *.new -> `php -l` on the server ->
swap in -> smoke-test the live API -> roll back automatically if anything fails.

Run: python scripts/deploy_mobile_backend.py            (deploy)
     python scripts/deploy_mobile_backend.py --check    (read-only: diff live vs local)
"""
import difflib
import json
import subprocess
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, str(Path(__file__).resolve().parent))
from deploy_config import REPO, connect  # noqa: E402

SRC = REPO / "server-src"
FILES = ["api/lib/catalog_overrides.php", "api/lib/guest_order.php", "api/lib/account.php", "api/mobile.php"]
# Must already exist on the server (mobile.php requires them); checked, never uploaded.
REQUIRED_LIVE = ["api/lib/catalog.php", "api/lib/mobile_auth.php", "api/lib/order_service.php",
                 "api/lib/manager_notify.php", "api/lib/push.php", "api/lib/password_reset.php", "db/init.php"]
API = "https://splithub.ru/api/mobile.php"

# curl, not urllib: on this PC Python's HTTP client stalls on the ~1 MB chunked catalog
# behind the VPN (system proxy / tunnel), which made a healthy deploy look broken and
# triggered a needless rollback. curl reads the same response in ~1 s.
def http(method, url, body=None):
    cmd = ["curl", "-s", "--noproxy", "*", "--max-time", "60", "-X", method,
           "-H", "Content-Type: application/json", "-w", "\n%{http_code}", url]
    data = None
    if body is not None:
        cmd[1:1] = ["--data-binary", "@-"]
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    out = subprocess.run(cmd, input=data, capture_output=True, timeout=90).stdout.decode("utf-8", "replace")
    text, _, status = out.rpartition("\n")
    try:
        payload = json.loads(text or "{}")
    except json.JSONDecodeError:
        payload = {"raw": text[:200]}
    return int(status or 0), payload


def wait_for_code(new_code_live, limit=300):
    """opcache re-reads files only every revalidate_freq seconds, so right after a swap the
    old code keeps answering (and after a rollback, the new one). Poll until the switch is
    visible: create_guest_order exists only in the new mobile.php."""
    started = time.time()
    while time.time() - started < limit:
        status, res = http("POST", f"{API}?action=create_guest_order", {"name": "", "phone": "", "items": []})
        live = status == 422 and res.get("code") == "INVALID_GUEST"
        old = status == 404 and res.get("code") == "UNKNOWN_ACTION"
        if (new_code_live and live) or (not new_code_live and old):
            print(f"  {'new' if new_code_live else 'previous'} code is live after {time.time() - started:.0f}s")
            return True
        time.sleep(5)
    return False


def smoke():
    status, cat = http("GET", f"{API}?action=catalog&t={int(time.time())}")
    assert status == 200 and cat.get("ok"), f"catalog: {status}"
    products = cat["products"]
    assert len(products) >= 900, f"catalog too small: {len(products)}"
    assert not any("active" in p or "_active" in p for p in products), "internal flags leaked"
    _, ov = http("GET", "https://splithub.ru/api/admin.php?action=products_overrides_public")
    by_sku = {p["sku"]: p for p in products}
    for sku, o in (ov.get("overrides") or {}).items():
        if str(o.get("active")) == "0":
            assert sku not in by_sku, f"hidden product still served: {sku}"
        elif sku in by_sku and "price" in o:
            assert by_sku[sku]["price"] == int(o["price"] or 0), f"override price not applied: {sku}"
    print(f"  catalog: {len(products)} products, admin overrides applied ✅")

    status, res = http("POST", f"{API}?action=create_guest_order", {"name": "", "phone": "", "items": []})
    assert status == 422 and res.get("code") == "INVALID_GUEST", f"guest endpoint: {status} {res}"
    print("  create_guest_order: present, rejects empty input ✅ (no order created)")

    status, res = http("POST", f"{API}?action=create_order", {"items": []})
    assert status == 401, f"create_order without auth: {status} {res}"
    print("  create_order: still requires login ✅")

    status, res = http("POST", f"{API}?action=update_requisites", {"inn": "1"})
    assert status == 401, f"update_requisites without auth: {status} {res}"
    status, res = http("GET", f"{API}?action=orders&status=new")
    assert status == 401, f"orders without auth: {status} {res}"
    print("  update_requisites / orders: require login ✅")

    status, _ = http("POST", f"{API}?action=request_password_reset", {"phone": "+70000000000"})
    assert status == 200, f"password reset endpoint: {status}"
    print("  existing endpoints (password reset) respond ✅")


def main():
    check_only = "--check" in sys.argv
    cli, base = connect()

    def run(cmd):
        _i, out, err = cli.exec_command(cmd)
        return (out.read() + err.read()).decode(errors="replace").strip()

    sftp = cli.open_sftp()
    missing = [f for f in REQUIRED_LIVE if run(f"[ -f {base}/{f} ] && echo yes") != "yes"]
    if missing:
        raise SystemExit(f"Server lacks required files, aborting: {missing}")

    print("=== live vs local ===")
    for rel in FILES:
        local = (SRC / rel).read_text(encoding="utf-8").splitlines()
        try:
            with sftp.open(f"{base}/{rel}") as fh:
                live = fh.read().decode("utf-8").splitlines()
        except IOError:
            live = []
        diff = list(difflib.unified_diff(live, local, f"live/{rel}", f"local/{rel}", lineterm="", n=0))
        print(f"-- {rel}: {'new file' if not live else f'{len(diff)} diff lines'}")
        for line in diff[:80]:
            print("   " + line)
    if check_only:
        cli.close()
        return

    stamp = time.strftime("%Y%m%d-%H%M%S")
    backups = {}
    for rel in FILES:
        remote = f"{base}/{rel}"
        if run(f"[ -f {remote} ] && echo yes") == "yes":
            backups[rel] = f"{remote}.bak-{stamp}"
            run(f"cp -p {remote} {backups[rel]}")
    print(f"\nBackups: {list(backups.values()) or 'none'}")

    for rel in FILES:
        sftp.put(str(SRC / rel), f"{base}/{rel}.new")
        lint = run(f"php -l {base}/{rel}.new")
        if "No syntax errors" not in lint:
            run(f"rm -f " + " ".join(f"{base}/{r}.new" for r in FILES))
            raise SystemExit(f"php -l failed for {rel}, nothing changed:\n{lint}")
    # Libraries first, mobile.php last, so the live entry point never requires a missing file.
    for rel in FILES:
        run(f"mv -f {base}/{rel}.new {base}/{rel}")
    # opcache revalidates by mtime: make sure every swapped file looks new.
    run("touch " + " ".join(f"{base}/{rel}" for rel in FILES))
    print("Uploaded:", FILES)

    try:
        print("\n=== smoke test (live) ===")
        if not wait_for_code(new_code_live=True):
            raise AssertionError("new code did not become live within 5 minutes")
        smoke()
    except Exception as exc:  # roll back on any failure
        print(f"\nSMOKE TEST FAILED: {exc}\nRolling back…")
        # Plain cp (not -p) + touch: a restored file keeping its old mtime is not
        # re-read by opcache, which then runs the cached new code against deleted libs (HTTP 500).
        for rel, bak in backups.items():
            run(f"cp {bak} {base}/{rel} && touch {base}/{rel}")
        for rel in FILES:
            if rel not in backups:
                run(f"rm -f {base}/{rel}")
        wait_for_code(new_code_live=False)
        status, _ = http("GET", f"{API}?action=catalog&t={int(time.time())}")
        print(f"Rolled back to the previous version; live catalog after rollback: HTTP {status}")
        if status != 200:
            print("!!! API is not healthy after rollback — check the server now")
        cli.close()
        sys.exit(1)

    cli.close()
    print("\nDone. Rollback if needed: copy the .bak-%s files back." % stamp)


if __name__ == "__main__":
    main()
