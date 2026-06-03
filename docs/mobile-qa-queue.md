# Mobile QA Queue

Updated: 2026-06-03

Safety rules:
- Do not change the storefront flow in `send.php` or `index.html`.
- Server fixes for the app must stay isolated in mobile endpoints and `api/lib/*`.
- Keep `TG_FORCE_IP`, Telegram `CURLOPT_RESOLVE`, and fail-open storefront order intake intact.
- Catalog truth for Splithub is `products.js` on the site side: 275 active items with owner prices.

## P0

- [x] **Full catalog performance** `(fixed and APK-verified on TECNO BG6)`
  - Symptom: tapping "Весь каталог" opened a very heavy catalog and scrolling became jerky.
  - Old installed APK baseline on 2026-06-03: 111/111 janky frames, p90 113ms, p99 400ms, 3096 attached views, slow bitmap uploads 111.
  - Fix: replaced grouped full-catalog `ScrollView` with virtualized `FlatList` rows in branch `codex/native-site-parity`.
  - Fresh APK `9325c2e`, EAS build `93cd4541-2969-42b6-a48c-473f428c758a`: 487 total frames, 32 janky frames (6.57%), p50 16ms, p90 24ms, p95 29ms, p99 73ms, 73 attached views, slow bitmap uploads 0.
  - Latest APK `2127be7`, EAS build `7d53924f-6c70-4ac3-9b61-43a820582904`: full catalog opens and scrolls on TECNO BG6; measured 58 frames, 7 janky frames (12.07%), p50 10ms, p90 25ms, p95 150ms, p99 300ms, slow bitmap uploads 0.
  - Residual: legacy jank counter still reported 35.73%, so visual polish can continue later, but the blocking freeze/jitter regression is no longer reproduced.

- [x] **Auth/session state after login or registration** `(fixed and APK-verified on TECNO BG6)`
  - Symptom: user logs in/registers, but the app can still show the logged-out UI.
  - Code fix: the home screen now reads `useSession()`, shows "Профиль" when `user` exists, and routes to `/profile`.
  - Latest APK `2127be7`: registration for `CodexReg1606` / `79780001606` succeeded, profile showed `Telegram: codex_test`, and home switched to "Профиль".
  - Latest APK `2127be7`: after force-stop/cold start, home still showed "Профиль".
  - Latest APK `2127be7`: after logout, login with the same credentials returned to `CodexReg1606`; home showed "Профиль", and a second cold start preserved the logged-in state.
  - Residual: keep watching for the user-reported old state on other accounts or older installed APKs; it was not reproduced on the current APK.

- [ ] **Mobile order notifications in Telegram** `(deployed and server-smoke-verified, human visual confirmation pending)`
  - Symptom from user screenshots: mobile order `SH-00047` still arrived in English and without status buttons.
  - Expected: Russian Telegram text with the same inline status buttons as website orders.
  - Deployed on 2026-06-03: `api/mobile.php` and `api/lib/manager_notify.php` only; `send.php`, `index.html`, catalog files, and Telegram resolve settings were not changed.
  - Server verification before deploy: temp copies passed `php -l`; `tests/manager_notify_test.php` passed on the server; Telegram curl keeps `CURLOPT_RESOLVE`.
  - Production smoke: mobile API test order `SH-00054` was created successfully and returned through the `orders` endpoint with status `new`.
  - Remaining check: user should visually confirm that the Telegram message for `SH-00054` is Russian and has inline status buttons.

- [ ] **Mobile order email duplicate** `(deployed and API-smoke-verified, mailbox confirmation pending)`
  - Symptom: Telegram receives mobile order, email does not arrive.
  - Deployed on 2026-06-03: `api/lib/manager_notify.php` now sends the mobile order duplicate through `EMAIL_TO`.
  - Server verification: email HTML generation is covered by `tests/manager_notify_test.php`, which passed on the server.
  - Production smoke: mobile order `SH-00054` triggered the deployed notification path.
  - Remaining check: actual mailbox delivery must be confirmed in email inbox; accessible server logs did not expose the notification result.

## P1

- [x] **Cart/product added indication** `(fixed and APK-verified)`
  - Symptom: after tapping add/order there was no persistent indication on product card or cart tab.
  - Fix: cart tab badge shows total item count; catalog and product detail buttons show "В заявке · N" for products already added.
  - Device verification on fresh APK: after tapping "Заказать", XML shows product button "В заявке · 1"; cart tab badge was visible as count `2` on the profile XML.

- [x] **Order submit indication** `(fixed and APK-verified)`
  - Symptom: after submitting an order, the user needed clearer confirmation and visible order status.
  - Device status on 2026-06-03: logged-in checkout created real order `SH-00051`; alert and green banner appeared, but the first orders refresh could still be stale and omit the newly created order until manual refresh.
  - Code fix: cart now routes with both created order id and total; orders screen prepends the just-created order locally when the server list is stale.
  - Local verification: `order-submit-indication` test covers the stale-refresh case and passes.
  - Fresh APK `2127be7` device verification: logged-in checkout created real test order `SH-00053`; alert showed "Заявка отправлена" / "Номер заявки: SH-00053"; orders screen immediately showed `SH-00053`, `31 990 ₽`, status `Новый`, and the cart badge was cleared.

- [ ] **Order form visual parity**
  - Symptom: current app form does not yet match the Telegram-approved/site-designed order form closely enough.
  - Need: compare against provided screenshots after auth/checkout path is verified.

- [x] **Persistent bottom navigation on catalog stack routes** `(fixed and APK-verified)`
  - Fix: added stack bottom navigation with "Главная", "Корзина", "Заказы", "Профиль" to catalog and product detail screens.
  - Device verification on fresh APK: full catalog XML/screenshot shows the bottom navigation entries.
  - Device status on 2026-06-03: product detail route keeps the stack bottom navigation, but cart tab did not show the count there.
  - Code fix: stack bottom tabs now read `useCart()` and show the cart badge.
  - Fresh APK `2127be7` device verification: after adding a product from the catalog/product stack, XML shows cart tab content-desc `1, Корзина`; opening the cart shows the item and total.

- [x] **Direct price-list download from the app** `(deployed and APK-verified on TECNO BG6)`
  - User request: tapping "Загрузить прайс" should start a server download instead of opening the website.
  - Site code prepared: new isolated endpoint `api/mobile_pricelist.php` reads `products.js` and returns a UTF-8 CSV file with `Content-Disposition: attachment`.
  - App code fixed: `appConfig.priceListUrl` points to `https://splithub.ru/api/mobile_pricelist.php`, and the button calls `downloadPriceList()` via `expo-file-system` instead of `Linking.openURL`.
  - Local verification: `price-list-download` test covers no browser link, dated cache file name, and HTTP 404 server errors.
  - Latest APK `1ade685`, EAS build `c657c6ce-6e45-4533-bc30-beaabedacfc7`: installed on TECNO BG6; tapping "Загрузить прайс" stayed inside the app and showed "Прайс не скачался" / "Не удалось скачать прайс: сервер вернул HTTP 404".
  - Safety: does not touch `send.php`, `index.html`, `products.js`, `products.json`, `config.php`, Telegram curl options, or storefront order intake.
  - Site deploy on 2026-06-03 uploaded only `api/mobile_pricelist.php`; production check returns `HTTP 200`, CSV 39377 bytes, filename `splithub-price-2026-06-03.csv`.
  - Storefront smoke after deploy: `send.php` still accepts a no-id live-site-style order and returned `{"ok":true,"email":"sent","tg":"sent"}`.
  - Device verification after deploy: tapping "Загрузить прайс" stayed inside `ru.splithub.mobile` and showed "Прайс загружен" / "Файл splithub-price-2026-06-03.csv скачан в приложение."

## P2

- [ ] **Top/bottom safe-area polish**
  - First fix committed in `5851f96`; continue visual polish after the P0/P1 functional bugs are closed.

- [ ] **Replace modal add-to-cart alerts**
  - Earlier implementation still used a blocking "Добавлено в заявку" modal on some paths.
  - Current priority is persistent counters/badges; replace remaining modal alerts with non-blocking feedback in the next polish pass.
