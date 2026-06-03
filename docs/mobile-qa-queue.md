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
  - Residual: legacy jank counter still reported 35.73%, so visual polish can continue later, but the blocking freeze/jitter regression is no longer reproduced.

- [ ] **Auth/session state after login or registration** `(login state verified on device, registration path still pending)`
  - Symptom: user logs in/registers, but the app can still show the logged-out UI.
  - Code fix: the home screen now reads `useSession()`, shows "Профиль" when `user` exists, and routes to `/profile`.
  - Device status on 2026-06-03: current phone session is logged in as `Test_mob` / `79781234567`; home top button shows profile state, and profile screen shows the same user. The old "logged in but shown as logged out" state is not reproduced.
  - Need: test registration flow and app restart/token persistence.

- [ ] **Mobile order notifications in Telegram** `(site branch fixed, production/server verification pending)`
  - Symptom from user screenshots: mobile order `SH-00047` still arrived in English and without status buttons.
  - Expected: Russian Telegram text with the same inline status buttons as website orders.
  - Site branch `codex/mobile-notifications-russian` changes mobile notification formatting and preserves `CURLOPT_RESOLVE`.
  - Verification gap: local PHP CLI is unavailable; `tests/manager_notify_test.php` exists but was not executed locally. Needs server/PHP verification before deploy.

- [ ] **Mobile order email duplicate** `(site branch fixed, production/server verification pending)`
  - Symptom: Telegram receives mobile order, email does not arrive.
  - Site branch `codex/mobile-notifications-russian` adds email duplicate for mobile orders through `EMAIL_TO`.
  - Need: PHP test or server smoke test after deploy.

## P1

- [x] **Cart/product added indication** `(fixed and APK-verified)`
  - Symptom: after tapping add/order there was no persistent indication on product card or cart tab.
  - Fix: cart tab badge shows total item count; catalog and product detail buttons show "В заявке · N" for products already added.
  - Device verification on fresh APK: after tapping "Заказать", XML shows product button "В заявке · 1"; cart tab badge was visible as count `2` on the profile XML.

- [ ] **Order submit indication** `(device reproduced, code fixed, fresh APK verification pending)`
  - Symptom: after submitting an order, the user needed clearer confirmation and visible order status.
  - Device status on 2026-06-03: logged-in checkout created real order `SH-00051`; alert and green banner appeared, but the first orders refresh could still be stale and omit the newly created order until manual refresh.
  - Code fix: cart now routes with both created order id and total; orders screen prepends the just-created order locally when the server list is stale.
  - Local verification: `order-submit-indication` test covers the stale-refresh case and passes.
  - Need: install fresh APK and repeat logged-in checkout.

- [ ] **Order form visual parity**
  - Symptom: current app form does not yet match the Telegram-approved/site-designed order form closely enough.
  - Need: compare against provided screenshots after auth/checkout path is verified.

- [ ] **Persistent bottom navigation on catalog stack routes** `(device-visible, stack cart badge code fixed, fresh APK verification pending)`
  - Fix: added stack bottom navigation with "Главная", "Корзина", "Заказы", "Профиль" to catalog and product detail screens.
  - Device verification on fresh APK: full catalog XML/screenshot shows the bottom navigation entries.
  - Device status on 2026-06-03: product detail route keeps the stack bottom navigation, but cart tab did not show the count there.
  - Code fix: stack bottom tabs now read `useCart()` and show the cart badge.
  - Need: install fresh APK and confirm the badge appears on catalog/product stack routes.

- [ ] **Direct price-list download from the app** `(code prepared, server deploy pending)`
  - User request: tapping "Загрузить прайс" should start a server download instead of opening the website.
  - Site code prepared: new isolated endpoint `api/mobile_pricelist.php` reads `products.js` and returns a UTF-8 CSV file with `Content-Disposition: attachment`.
  - App code prepared: `appConfig.priceListUrl` now points to `https://splithub.ru/api/mobile_pricelist.php`.
  - Safety: does not touch `send.php`, `index.html`, `products.js`, `products.json`, `config.php`, Telegram curl options, or storefront order intake.
  - Need: deploy the new endpoint to the site, then tap the app price button on device and confirm Android starts downloading the file.

## P2

- [ ] **Top/bottom safe-area polish**
  - First fix committed in `5851f96`; continue visual polish after the P0/P1 functional bugs are closed.

- [ ] **Replace modal add-to-cart alerts**
  - Earlier implementation still used a blocking "Добавлено в заявку" modal on some paths.
  - Current priority is persistent counters/badges; replace remaining modal alerts with non-blocking feedback in the next polish pass.
