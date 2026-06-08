#!/usr/bin/env python3
"""Сгенерировать и залить robots.txt + sitemap.xml для splithub.ru.

- Открывает публичный контент всем ботам, включая поисковики и AI-краулеры.
- Закрывает приватное (admin, api, db, converter, tmp, config) одинаково для всех.
- Кладёт копии в dist/ для истории и заливает в корень сайта.
- Проверяет по HTTP (статус + content-type).

Креды: env SPLITHUB_SSH_USER/PASS или ~/.splithub-deploy.json.
"""
import os, sys, json, io, urllib.request
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import paramiko

SITE = "https://splithub.ru"
REPO = Path(__file__).resolve().parents[1]
DIST = REPO / "web"; DIST.mkdir(exist_ok=True)

# Приватные/служебные пути — закрыты для индексации у ВСЕХ агентов
DISALLOW = ["/admin.html", "/api/", "/db/", "/converter/", "/tmp_uploads/", "/config.php"]

# Явно приветствуем поисковые и AI-краулеры (полный доступ к публичному контенту).
# Каждому даём тот же набор Disallow, чтобы именованный блок не открыл приватное.
AGENTS = [
    "Googlebot", "Googlebot-Image", "Google-Extended",
    "Yandex", "YandexBot",
    "Bingbot", "Applebot", "Applebot-Extended",
    "DuckDuckBot", "Mail.RU_Bot",
    # AI / LLM краулеры
    "GPTBot", "OAI-SearchBot", "ChatGPT-User",
    "ClaudeBot", "anthropic-ai", "Claude-Web", "Claude-SearchBot",
    "PerplexityBot", "Perplexity-User",
    "CCBot", "Amazonbot", "Bytespider", "Google-CloudVertexBot",
]

def block(agent):
    lines = [f"User-agent: {agent}", "Allow: /"]
    lines += [f"Disallow: {p}" for p in DISALLOW]
    return "\n".join(lines)

robots = "\n".join([
    "# robots.txt — splithub.ru",
    "# Публичный контент открыт для всех поисковых систем и языковых моделей.",
    "# Машиночитаемая справка для LLM: https://splithub.ru/llms.txt",
    "",
    block("*"),
    "",
    "# Явное приглашение для поисковых и AI-краулеров",
    *sum(([block(a), ""] for a in AGENTS), []),
    f"Sitemap: {SITE}/sitemap.xml",
    "",
]) + "\n"

# Реальные даты последнего изменения публичных страниц
PAGES = [
    (f"{SITE}/",        "2026-06-02", "weekly",  "1.0"),
    (f"{SITE}/app/",    "2026-06-08", "monthly", "0.8"),
    (f"{SITE}/privacy/", "2026-06-08", "yearly",  "0.3"),
]
urls = "\n".join(
    "  <url>\n"
    f"    <loc>{loc}</loc>\n"
    f"    <lastmod>{mod}</lastmod>\n"
    f"    <changefreq>{cf}</changefreq>\n"
    f"    <priority>{pr}</priority>\n"
    "  </url>"
    for loc, mod, cf, pr in PAGES
)
sitemap = (
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    f"{urls}\n"
    "</urlset>\n"
)

(DIST / "robots.txt").write_text(robots, encoding="utf-8")
(DIST / "sitemap.xml").write_text(sitemap, encoding="utf-8")
print(f"robots.txt: {len(robots)} байт, {len(AGENTS)+1} блоков агентов")
print(f"sitemap.xml: {len(PAGES)} URL")

# --- заливка ---
cfg = {}
p = Path.home() / ".splithub-deploy.json"
if p.exists(): cfg = json.loads(p.read_text(encoding="utf-8"))
host = os.environ.get("SPLITHUB_SSH_HOST") or cfg.get("host", "splithub.ru")
user = os.environ.get("SPLITHUB_SSH_USER") or cfg.get("user")
pw = os.environ.get("SPLITHUB_SSH_PASS") or cfg.get("password")
base = os.environ.get("SPLITHUB_BASE") or cfg.get("base")

c = paramiko.SSHClient(); c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect(host, username=user, password=pw, timeout=30)
sftp = c.open_sftp()
for name, content in (("robots.txt", robots), ("sitemap.xml", sitemap)):
    sftp.putfo(io.BytesIO(content.encode("utf-8")), f"{base}/{name}")
    print(f"залит {name}")
sftp.close(); c.close()

# --- HTTP-проверка ---
print("\n=== HTTP-проверка ===")
def http(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.headers.get("Content-Type"), r.read(80).decode("utf-8", "replace")
    except Exception as ex:
        return None, None, str(ex)
for u in (f"{SITE}/robots.txt", f"{SITE}/sitemap.xml"):
    st, ct, head = http(u)
    print(f"{u} -> {st}  {ct}\n    {head!r}")
