# Mobile Handoff Memory

Updated: 2026-06-03

This file is the working memory for continuing the SplitHub mobile app safely after a reboot or a new Codex session.

## Repositories

- Mobile app workspace: `C:\Users\user\Documents\GitHub\VSCode\splithub_mobile_app\mobile-native-parity`
- Mobile branch: `codex/native-site-parity`
- Mobile HEAD before this handoff docs commit: `9325c2e fix: improve order feedback and stack navigation`
- Target GitHub repository requested by user: `https://github.com/flycited2-dotcom/splithub_mobile_app.git`
- Site workspace: `C:\Users\user\Documents\GitHub\splithub`
- Site branch with mobile notification changes: `codex/mobile-notifications-russian`
- Site commits to remember: `87abd96 fix: escape mobile telegram notifications`, `ef94403 fix: localize mobile order notifications`

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

## Last Known Verification

Local checks before the fresh APK build:
- `npm.cmd test -- --runInBand`: passed, 20 suites / 35 tests
- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npx.cmd expo-doctor`: passed, 21/21 checks

Fresh APK:
- EAS build id: `93cd4541-2969-42b6-a48c-473f428c758a`
- APK URL: `https://expo.dev/artifacts/eas/jfz3kTbFzbA4yoyvU1eCY3.apk`
- Installed package: `ru.splithub.mobile`
- Device: TECNO BG6, ADB id `11000373CD011362`
- Install command used: `adb install -r -d artifacts\SplitHub-preview-9325c2e.apk`
- Install result: `Success`
- Package `lastUpdateTime`: `2026-06-03 08:28:34`

Device performance verification:
- Old APK baseline after tapping "Весь каталог": 111/111 janky frames, p90 113ms, p99 400ms, 3096 attached views, slow bitmap uploads 111.
- Fresh APK after opening "Весь каталог" and scrolling: 487 total frames, 32 janky frames (6.57%), p50 16ms, p90 24ms, p95 29ms, p99 73ms, 73 attached views, slow bitmap uploads 0.

Device UI verification:
- Full catalog screen shows bottom navigation entries: "Главная", "Корзина", "Заказы", "Профиль".
- After tapping a catalog "Заказать" button, product button changed to "В заявке · 1".
- Cart tab badge became visible on device XML.
- Current phone profile is logged out; real login/register verification still needs valid credentials.

## Open Work

- Real auth test: login/register with valid credentials, confirm home button changes to "Профиль", restart app, confirm token persistence.
- Real checkout test: submit an order from the logged-in app, confirm orders banner and order list update.
- Product detail bottom nav: tap product detail route in the fresh APK and confirm bottom navigation remains visible.
- Mobile Telegram/email server deploy: verify PHP tests/server smoke first, then deploy isolated site branch changes, then check Telegram Russian text, inline status buttons, and email duplicate.
- Storefront smoke test after any site deploy: `send.php` must still accept a live-site-style order with no item ids and return `{"ok":true}`.

## Do Not Commit

- Local APKs, screenshots, XML dumps, and ADB artifacts under `artifacts/`.
- Any accidental files from the outer workspace or user home directory.
