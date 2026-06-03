# Mobile Handoff Memory

Updated: 2026-06-03

This file is the working memory for continuing the SplitHub mobile app safely after a reboot or a new Codex session.

## Repositories

- Mobile app workspace: `C:\Users\user\Documents\GitHub\VSCode\splithub_mobile_app\mobile-native-parity`
- Mobile branch: `codex/native-site-parity`
- Mobile HEAD before this handoff docs update: `f2c3487 feat: save price list as pdf or excel`
- Target GitHub repository requested by user: `https://github.com/flycited2-dotcom/splithub_mobile_app.git`
- Site workspace: `C:\Users\user\Documents\GitHub\splithub`
- Site branch with mobile notification changes: `codex/mobile-notifications-russian`
- Site commits to remember: `87abd96 fix: escape mobile telegram notifications`, `ef94403 fix: localize mobile order notifications`, `959d06a feat: add mobile price-list download endpoint`

## Safety Contract

- Do not change the storefront order flow in `send.php` or `index.html`.
- Keep `send.php` fail-open for catalog validation unless a fully compatible frontend/backend rollout is done together.
- Keep Telegram `TG_FORCE_IP` and `CURLOPT_RESOLVE` for curl calls to `api.telegram.org`.
- Mobile app work should use isolated endpoints only: `api/mobile.php`, `api/lib/*`, `api/push*.php`.
- Catalog source of truth on the site side is `products.js`: 275 active items with owner prices. Do not regenerate from all 678 inactive/source items.
- Do not unpack a full `deploy.zip` over production.
- After any site deploy, smoke-test storefront intake with a POST to `send.php` shaped like live `index.html` sends it, with products without `id`; expected response is `{"ok":true}`.

## Mobile Changes Already Implemented

- Full catalog rendering was virtualized:
  - `src/features/catalog/catalog-rows.ts`
  - `src/features/catalog/group-products.ts`
  - `src/app/catalog.tsx`
  - test: `__tests__/catalog-rows.test.ts`
- Home auth state now follows `useSession()`:
  - `src/app/(tabs)/index.tsx`
  - test: `__tests__/home-auth-button.test.tsx`
- Cart counters and product "already in request" state were added:
  - `src/features/cart/cart-reducer.ts`
  - `src/features/cart/cart-context.tsx`
  - `src/app/(tabs)/_layout.tsx`
  - `src/components/product-card.tsx`
  - `src/app/product/[id].tsx`
  - tests: cart reducer and product-card cart-state tests
- Order submit feedback was added:
  - `src/app/(tabs)/cart.tsx`
  - `src/app/(tabs)/orders.tsx`
  - test: `__tests__/order-submit-indication.test.tsx`
- Stack bottom navigation was added:
  - `src/components/stack-bottom-tabs.tsx`
  - used by catalog/product detail screens
  - test: `__tests__/stack-catalog-navigation.test.tsx`
- Direct price-list download was prepared:
  - app points to `https://splithub.ru/api/mobile_pricelist.php`
  - app downloads through `expo-file-system` instead of opening a browser link
  - site branch has isolated endpoint `api/mobile_pricelist.php`
  - production endpoint was deployed on 2026-06-03 and now returns CSV successfully
- Price-list export was upgraded on 2026-06-03:
  - home/profile now ask for `PDF` or `Excel`
  - Excel is generated as an `.xls` HTML table from the loaded mobile catalog
  - PDF is generated through `expo-print`
  - both formats are saved through Android Storage Access Framework into a user-selected phone folder, not only the app cache
  - the old "Файл скачан в приложение" message was replaced with "сохранён в выбранную папку телефона"
  - `expo-print` was added, so a fresh APK is required before device testing this feature
- Home quick filters now hide empty sections after the catalog snapshot is loaded. If "Полупром" or "Чёрные сплиты" has no matching products, the button is removed; while loading, configured buttons remain visible to avoid flicker.

## Last Known Verification

Local checks before the fresh APK build:
- `npm.cmd test -- --runInBand`: passed, 20 suites / 37 tests
- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npx.cmd expo-doctor`: passed, 21/21 checks

Local checks on 2026-06-03 after the stale-order, stack badge, and price-link fixes:
- `npm.cmd test -- --runInBand`: passed, 20 suites / 37 tests
- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- Site catalog parser check: `products.js` parses as 275 items; first item `1244`, price `22390`.

Local checks on 2026-06-03 after the in-app price-list download fix:
- `npm.cmd test -- --runInBand`: passed, 21 suites / 40 tests
- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed

Local checks on 2026-06-03 after the PDF/Excel phone-save update:
- `npm.cmd test -- --runTestsByPath __tests__\price-list-download.test.tsx __tests__\quick-filters.test.ts`: passed, 2 suites / 9 tests
- `npm.cmd test -- --runInBand`: passed, 21 suites / 43 tests
- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npx.cmd expo-doctor`: not a valid success signal in this run; local checks passed, but Expo API checks timed out against `exp.host:443`.

Fresh APK:
- EAS build id: `c657c6ce-6e45-4533-bc30-beaabedacfc7`
- APK URL: `https://expo.dev/artifacts/eas/quxQPHjAiGbConbM7rrD1t.apk`
- Installed package: `ru.splithub.mobile`
- Device: TECNO BG6, ADB id `11000373CD011362`
- Install command used: `adb install -r -d artifacts\SplitHub-preview-1ade685.apk`
- Install result: `Success`
- Package `lastUpdateTime`: `2026-06-03 18:43:21`

Device performance verification:
- Old APK baseline after tapping "Весь каталог": 111/111 janky frames, p90 113ms, p99 400ms, 3096 attached views, slow bitmap uploads 111.
- Fresh APK after opening "Весь каталог" and scrolling: 487 total frames, 32 janky frames (6.57%), p50 16ms, p90 24ms, p95 29ms, p99 73ms, 73 attached views, slow bitmap uploads 0.
- Latest APK `2127be7` after opening "Весь каталог" and scrolling on TECNO BG6: 58 total frames, 7 janky frames (12.07%), p50 10ms, p90 25ms, p95 150ms, p99 300ms, slow bitmap uploads 0. The previous blocking freeze/jitter regression was not reproduced.

Device UI verification:
- Full catalog screen shows bottom navigation entries: "Главная", "Корзина", "Заказы", "Профиль".
- After tapping a catalog "Заказать" button, product button changed to "В заявке · 1".
- Latest APK `2127be7`: stack bottom cart tab badge is visible as content-desc `1, Корзина`; opening cart shows the item and total.
- Current phone profile is logged in as `CodexReg1606` / `79780001606`; profile shows `Telegram: codex_test`.
- Latest APK `2127be7`: registration for `CodexReg1606` changed the home top button to "Профиль"; after a cold app restart, home still showed "Профиль".
- Latest APK `2127be7`: after logout, login with `79780001606` / `Test1234` returned to the same profile, home showed "Профиль", and a second cold restart kept the logged-in home state.
- Earlier checkout `SH-00051` reproduced the stale first orders refresh. The code now injects the newly created order locally when server data is stale.
- Latest APK `2127be7`: real checkout created `SH-00053`; alert showed "Заявка отправлена" and "Номер заявки: SH-00053"; orders screen immediately showed `SH-00053`, `31 990 ₽`, status `Новый`; cart badge cleared after submit.
- Latest APK `1ade685`: home still showed logged-in "Профиль"; tapping "Загрузить прайс" stayed inside `ru.splithub.mobile` and showed app alert "Прайс не скачался" / "Не удалось скачать прайс: сервер вернул HTTP 404". This verifies the app no longer opens the browser for the price list; server deploy is still needed for a successful download.
- Site deploy on 2026-06-03 uploaded only isolated mobile files with backups: `api/mobile.php`, `api/lib/manager_notify.php`, `api/mobile_pricelist.php`. Before replacement, server temp copies passed `php -l`, `tests/manager_notify_test.php`, and a remote CSV generation check.
- Production price endpoint check after deploy: `https://splithub.ru/api/mobile_pricelist.php` returns `HTTP 200`, `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="splithub-price-2026-06-03.csv"`, 39377 bytes, first product `1244;MDV;...;22390`.
- Storefront smoke test after deploy: `POST https://splithub.ru/send.php` with a live-site-style order body and no item `id` returned `HTTP 200` / `{"ok":true,"email":"sent","tg":"sent"}`.
- Mobile API smoke after deploy: registered test user `797819050001`, created order `SH-00054` via `api/mobile.php?action=create_order`, response `ok=true`, `total=22390`; `orders` endpoint returned the same order with status `new`.
- Latest APK `1ade685` after site deploy: tapping "Загрузить прайс" stayed inside `ru.splithub.mobile` and showed app alert "Прайс загружен" / "Файл splithub-price-2026-06-03.csv скачан в приложение."
- Latest APK `1ade685` catalog spot check after deploy: opened "Весь каталог", performed six ADB scrolls, app stayed focused in `ru.splithub.mobile`, and UI dump contained product cards.

Fresh EAS build caveat:
- Build `acdec81f-3d7c-42d1-863b-f2e0be935428` finished on EAS but was built from old commit `b95d3b8`, so do not install it as the fixed APK.
- Build `af6018bc-a67a-4d74-a657-cf6e5b4651e0` was started by mistake from commit `568ebc6` and canceled.
- Correct EAS preview build for PDF/Excel update:
  - Build id: `6f80cd5a-4af9-4be8-93d4-4fc94f602f25`
  - Commit: `f2c3487ba7100cf18c2bc312d66aae218c2c4b64`
  - Status at handoff: in queue
  - Logs: `https://expo.dev/accounts/alextsarev/projects/splithub/builds/6f80cd5a-4af9-4be8-93d4-4fc94f602f25`
  - After it finishes, download the APK, save it under `artifacts/`, install on device `11000373CD011362`, and verify both PDF and Excel save into a phone folder.

## Open Work

- Auth/session follow-up: the user-reported "logged in but still shows logged out" state was not reproduced on APK `2127be7`; keep watching for it on other accounts or older installed APKs.
- Mobile Telegram/email server deploy: isolated site files are deployed and mobile API order smoke passed. Still needs human visual confirmation that Telegram message `SH-00054` is Russian, has inline buttons, and email arrived in the mailbox.
- Direct price-list download: old CSV app-cache flow was deployed and APK-verified on TECNO BG6. New PDF/Excel phone-folder flow is committed and pushed, but still needs the fresh APK from EAS build `6f80cd5a-4af9-4be8-93d4-4fc94f602f25` before device verification.
- Storefront smoke test after any site deploy: `send.php` must still accept a live-site-style order with no item ids and return `{"ok":true}`.

## Do Not Commit

- Local APKs, screenshots, XML dumps, and ADB artifacts under `artifacts/`.
- Any accidental files from the outer workspace or user home directory.
