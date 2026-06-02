# Mobile QA Queue

Updated: 2026-06-03

Rules:
- Do not change the storefront flow in `send.php` or `index.html`.
- Server fixes for the app must stay isolated in mobile endpoints and `api/lib/*`.
- Keep `TG_FORCE_IP`, Telegram `CURLOPT_RESOLVE`, and fail-open storefront order intake intact.

## P0

- [ ] **Full catalog performance** `(fixed in branch, needs APK verification)`
  - Symptom: tapping "Весь каталог" opens a very heavy catalog and scrolling becomes jerky.
  - Confirmed on TECNO BG6 via ADB: 140/140 janky frames, 90th percentile 117ms, 99th percentile 450ms, 3252 views, ~439 MB PSS.
  - Root cause: grouped full catalog currently renders all product cards/images inside one `ScrollView`.
  - Fix: replaced full-catalog grouped `ScrollView` with virtualized `FlatList` rows in branch `codex/native-site-parity`.
  - Verification so far: unit tests, typecheck, and lint pass locally. Needs fresh APK install and ADB frame check.

- [ ] **Auth/session state after login or registration** `(partly fixed in branch, needs device/API verification)`
  - Symptom: user logs in/registers, but the app still shows the logged-out UI.
  - Confirmed code issue: the home screen button always showed "Войти" and ignored session state.
  - Fix: home screen now shows "Профиль" and routes to `/profile` when `user` exists.
  - Need to verify: real login/register API response, token persistence after app restart, and tab screens re-render on device.

- [ ] **Mobile order notifications** `(fixed in site branch, needs PHP/server verification)`
  - Symptom: mobile order notification in Telegram is English and lacks status buttons.
  - Expected: same Russian format and inline status buttons as normal website orders.
  - Scope: mobile order endpoint/order service only; do not modify storefront intake behavior.
  - Fix: site branch `codex/mobile-notifications-russian` rewrites `api/lib/manager_notify.php` to Russian Telegram text, inline status buttons, and Telegram `CURLOPT_RESOLVE`.
  - Verification gap: local PHP CLI is unavailable, so `tests/manager_notify_test.php` was added but not executed locally.

- [ ] **Mobile order email** `(fixed in site branch, needs PHP/server verification)`
  - Symptom: Telegram receives mobile order, email does not arrive.
  - Fix: site branch `codex/mobile-notifications-russian` adds email duplicate for mobile orders through `EMAIL_TO`.
  - Verification gap: needs PHP test or server smoke test after deploy.

## P1

- [ ] **Cart/product added indication**
  - Symptom: after tapping order/add there is no persistent indication on the product card or order/cart tab.
  - Expected: visible cart counter/badge and product/cart state feedback.

- [ ] **Order submit indication**
  - Symptom: after submitting an order, there should be clearer confirmation and visible order count/status.
  - Expected: user sees that order was created and can find it immediately.

- [ ] **Order form visual parity**
  - Symptom: current app form does not match the Telegram-approved/site-designed order form closely enough.
  - Need to compare against provided screenshots and approved design.

- [ ] **Persistent bottom navigation on catalog routes**
  - Symptom: filtered catalog/product routes do not have bottom tab navigation, which makes navigation less obvious.
  - Need to decide whether catalog/product should live inside tabs or keep stack navigation with clearer controls.

## P2

- [ ] **Top/bottom safe-area polish**
  - First fix committed in `5851f96`; needs verification on the new APK once EAS build finishes.

- [ ] **Replace modal add-to-cart alerts**
  - First fix committed in `5851f96`; needs verification on the new APK once EAS build finishes.
