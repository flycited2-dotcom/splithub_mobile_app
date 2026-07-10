# START HERE — SplitHub Mobile (прочитай первым)

Одна страница, чтобы за минуту понять проект и продолжить работу.

## Что это
Мобильное приложение **SplitHub** (Android, React Native / Expo, bare workflow) для
B2B-клиентов-монтажников: каталог климатической техники, заказы оптом, бонусы,
push-уведомления о статусах. Бэкенд — PHP + SQLite на том же сервере, что и сайт
`splithub.ru`. iOS-приложения пока нет (см. `ios-release-guide.md`).

## Текущее состояние (2026-07-10)
- **Android v1.1.1** (versionCode 3) — собрано, подписано, выложено: https://splithub.ru/app/
  (⚠️ без UI удаления аккаунта — код в ветке, нужна пересборка APK).
- **iOS v1.1.1 build 10 — в очереди App Review (WAITING_FOR_REVIEW, 2026-07-10)**:
  пересабмит после реджекта 5.1.1(v), добавлено удаление аккаунта
  (Профиль → «Удалить аккаунт»; сервер `action=delete_account` задеплоен).
  TestFlight: https://testflight.apple.com/join/QxBBywEM
- **Восстановление пароля по email** — реализовано на сервере, сайте и в приложении.
  Email при регистрации обязателен (флаг `app_settings.email_required='1'`).
- **Менеджерский сброс пароля** + привязка email — в админке.
- HTTPS-редирект на сайте включён; страница установки отдаёт APK по https.
- **Осталось:** вердикт Apple → релиз; чистка тест-аккаунтов в проде (демо
  `+79000000099` — только после релиза); пересобрать Android APK с удалением
  аккаунта; RuStore (2-й план). Детали — `mobile-handoff-memory.md`.

## Ключевые ссылки
- Сайт: https://splithub.ru · Приложение (APK): https://splithub.ru/app/
- Privacy: https://splithub.ru/privacy/ · Админка: https://splithub.ru/admin.html
- LLM-справка сайта: https://splithub.ru/llms.txt
- GitHub приложения: `flycited2-dotcom/splithub_mobile_app`, ветка `codex/native-site-parity`
- GitHub сайта/сервера: `flycited2-dotcom/splithub`

## Где лежат секреты (НЕ в репозитории)
- **Деплой-креды сервера** (SSH/SFTP): `~/.splithub-deploy.json` (host/user/password/base).
- **Release keystore**: `android/app/release.jks` + `android/keystore.properties` (gitignored).
  Офлайн-бэкап: `C:/Users/user/Documents/Бэкап мобильное приложение SplitHub/`.
  ⚠️ Потеря keystore = невозможность обновлять приложение в сторах.
- Реквизиты ИП, пароль админки — в авто-памяти Claude (не в репо).

## Как собрать APK (локально, Windows)
Нужен **VPN** (Google Maven гео-блок из РФ). Команда:
```
CMAKE_VERSION=3.31.6 \
JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-17.0.19.10-hotspot" \
ANDROID_HOME="/c/Users/user/AppData/Local/Android/Sdk" \
bash android/gradlew -p android :app:assembleRelease --no-daemon
```
- Универсальная (все ABI) ~12 мин; для теста быстрее `-PreactNativeArchitectures=arm64-v8a`.
- Первый запуск упаковки иногда падает временным файловым локом — просто повторить.
- Выход: `android/app/build/outputs/apk/release/app-release.apk`.

## Деплой и проверки (скрипты в `scripts/`, креды из `~/.splithub-deploy.json`)
- `deploy_apk.py` — выложить APK + страницу установки.
- `deploy_recovery_backend.py` — сервер восстановления (бэкап + `php -l` + дымовой тест).
- `run_server_tests.py` — серверные PHP-тесты на временной SQLite (PHP локально нет → на сервере).
- `verify_deploy.py` / `deploy_seo.py` / `deploy_privacy.py` / `deploy_homepage.py` — прочее.
- Рабочая копия серверного PHP — папка `server-src/` (редактируем там, тестируем, деплоим).

## Карта проекта
- `src/` — React Native приложение (экраны, фичи, lib).
- `android/` — нативный Android-проект (закоммичен, bare workflow).
- `server-src/` — рабочая копия серверного PHP (mobile.php/auth.php/admin.php/lib/...).
- `web/` — статика для сайта (страница установки, privacy, robots/sitemap).
- `scripts/` — деплой и проверки (Python + paramiko).
- `docs/` — документация (этот файл, playbook, спеки/планы, гайды).

## Другие документы
- `mobile-app-playbook.md` — переиспользуемый рецепт «как сделать такое приложение».
- `mobile-handoff-memory.md` — детальный рабочий лог проекта.
- `ios-release-guide.md` — путь к iOS-версии.
- `rustore-listing.md` — материалы для публикации в RuStore.
- `superpowers/specs/` и `superpowers/plans/` — спека и план восстановления пароля.
