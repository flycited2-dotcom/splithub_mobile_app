# Mobile Handoff Memory

Updated: 2026-06-04 17:53 +03:00

This file is the working memory for continuing the SplitHub mobile app safely after a reboot or a new Codex session.

## Repositories

- Mobile app workspace: `C:\Users\user\Documents\GitHub\VSCode\splithub_mobile_app\mobile-native-parity`
- Mobile branch: `codex/native-site-parity`
- Mobile HEAD before this handoff docs update: `4e902e6 feat: add pull to refresh for cart and orders`
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
- Full catalog performance follow-up on 2026-06-04:
  - User reported that tapping the home full-catalog button still scrolls severely janky.
  - Evidence from live catalog: 275 products; flat grid is about 138 rows; grouped path is about 302 rows (`5` sections, `41` brand rows, `84` series rows, `172` product rows).
  - Code fix: home full-catalog entry, cart "continue shopping", and promotion notifications without category route to `/catalog` with `mode=flat`.
  - Code fix: product cards now use `expo-image` with memory/disk cache and `recyclingKey`, and catalog render callbacks are stabilized with `useCallback`.
  - Tests: `__tests__/home-auth-button.test.tsx`, `__tests__/order-submit-indication.test.tsx`, `__tests__/notification-router.test.ts`, and `__tests__/product-card-cart-state.test.tsx`.
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
- Price-list PDF export was fixed again on 2026-06-04:
  - Android `expo-print` hung on TECNO BG6 after choosing `PDF`; the app stayed on `Готовим прайс...` and no PDF file appeared.
  - Commit `1bd0777` replaces `expo-print` with JS-side `pdf-lib` generation and embedded Roboto fonts for Cyrillic.
  - Excel generation and Android Storage Access Framework saving are unchanged.
  - No site files were changed for this fix.
- Home quick filters now hide empty sections after the catalog snapshot is loaded. If "Полупром" or "Чёрные сплиты" has no matching products, the button is removed; while loading, configured buttons remain visible to avoid flicker.
- Home UX polish on 2026-06-04:
  - Commit `a926490 fix: polish home and order status UX`.
  - Home safe-area now uses an outer fixed container, so scrolling the home content no longer slides under the Android status bar.
  - Home scroll overshoot/bounce is disabled to avoid the white/empty pull window.
  - Closed "Полупром" modal was moved outside the home `ScrollView`, removing the extra scrollable tail after "Полупром" / "Чёрные сплиты".
  - Quick filter color polish:
    - `Медная труба`: translucent copper tone.
    - `On/Off 7–9` and `On/Off 12`: translucent turquoise.
    - `On/Off 18` and `On/Off 24–36`: translucent green-turquoise.
    - `Расходники`: light silver.
    - `Полупром` remains white, `Чёрные сплиты` remains dark.
  - Auth login/register phone fields now start with `+7`.
  - Orders now show status badges: `Новый` light blue, `Подтверждён` / `В работе` / `Отгружен` orange, `Выполнен` saturated green, `Отменён` red.
- Pull-to-refresh on 2026-06-04:
  - Commit `4e902e6 feat: add pull to refresh for cart and orders`.
  - Orders screen supports swipe down to reload server order statuses.
  - Cart screen supports swipe down to refresh the catalog data used by prices and installer-kit upsells.
  - No site files or production storefront files were changed.

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

Local checks on 2026-06-04 after replacing Android `expo-print` PDF generation:
- `npm.cmd test -- --runTestsByPath __tests__\price-list-download.test.tsx`: passed, 1 suite / 4 tests
- `npm.cmd test -- --runInBand`: passed, 21 suites / 43 tests
- `npm.cmd run typecheck`: passed
- `npm.cmd run lint`: passed
- `npx.cmd expo install --check`: passed

Local checks on 2026-06-04 after the full-catalog flat-route / image-cache performance fix:
- RED checks before the fix:
  - `npm.cmd test -- --runTestsByPath __tests__\home-auth-button.test.tsx __tests__\notification-router.test.ts`: failed because home and no-category promotion still routed to `/catalog`.
  - `npm.cmd test -- --runTestsByPath __tests__\product-card-cart-state.test.tsx`: failed because product images had no `cachePolicy`.
- Green checks after the fix:
  - `npm.cmd test -- --runTestsByPath __tests__\home-auth-button.test.tsx __tests__\notification-router.test.ts __tests__\product-card-cart-state.test.tsx __tests__\catalog-rows.test.ts __tests__\stack-catalog-navigation.test.tsx`: passed, 5 suites / 13 tests
  - `npm.cmd test -- --runInBand`: passed, 21 suites / 45 tests
  - `npm.cmd run typecheck`: passed
  - `npm.cmd run lint`: passed

Local checks on 2026-06-04 after home UX/status polish and pull-to-refresh:
- RED checks before implementation:
  - `npm.cmd test -- --runTestsByPath __tests__\home-auth-button.test.tsx __tests__\auth-phone-prefix.test.tsx __tests__\order-submit-indication.test.tsx`: failed because home had no scroll overshoot control / fixed safe-area, auth phone fields were empty, and order statuses were plain green text.
  - `npm.cmd test -- --runTestsByPath __tests__\home-auth-button.test.tsx`: failed again until the closed `Полупром` modal was moved outside the home `ScrollView`.
  - `npm.cmd test -- --runTestsByPath __tests__\order-submit-indication.test.tsx`: failed because orders/cart had no `RefreshControl`.
- Green checks after implementation:
  - `npm.cmd test -- --runTestsByPath __tests__\home-auth-button.test.tsx`: passed, 6 tests.
  - `npm.cmd test -- --runTestsByPath __tests__\order-submit-indication.test.tsx`: passed, 7 tests.
  - `npm.cmd test`: passed, 22 suites / 54 tests.
  - `npm.cmd run typecheck`: passed.
  - `npm.cmd run lint`: passed.
  - `npx.cmd expo install --check`: passed
  - `npx.cmd expo-doctor`: passed, 21/21 checks
  - `npm.cmd run doctor`: not a valid signal in this project because the script calls missing `expo-doctor`; use `npx.cmd expo-doctor` instead.
- Additional RED/GREEN on 2026-06-04:
  - `npm.cmd test -- --runTestsByPath __tests__\order-submit-indication.test.tsx`: failed before the cart "continue shopping" route fix because it pushed `/catalog`.
  - `npm.cmd test -- --runTestsByPath __tests__\order-submit-indication.test.tsx __tests__\home-auth-button.test.tsx __tests__\notification-router.test.ts __tests__\product-card-cart-state.test.tsx`: passed after the cart route fix, 4 suites / 13 tests.
  - `npm.cmd run typecheck`: passed
  - `npm.cmd run lint`: passed

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
- New full-catalog performance fix on 2026-06-04 has not yet been APK/device-verified because ADB shows the phone is locked (`mDreamingLockscreen=true`, `mInputRestricted=true`). Do not enter the user's PIN; ask the user to unlock, then install the fresh APK and run repeated full-catalog scroll profiling.

Fresh EAS build caveat:
- Build `acdec81f-3d7c-42d1-863b-f2e0be935428` finished on EAS but was built from old commit `b95d3b8`, so do not install it as the fixed APK.
- Build `af6018bc-a67a-4d74-a657-cf6e5b4651e0` was started by mistake from commit `568ebc6` and canceled.
- Correct EAS preview build for PDF/Excel update:
  - Build id: `6f80cd5a-4af9-4be8-93d4-4fc94f602f25`
  - Commit: `f2c3487ba7100cf18c2bc312d66aae218c2c4b64`
  - Status at handoff: in queue
  - Logs: `https://expo.dev/accounts/alextsarev/projects/splithub/builds/6f80cd5a-4af9-4be8-93d4-4fc94f602f25`
  - After it finishes, download the APK, save it under `artifacts/`, install on device `11000373CD011362`, and verify both PDF and Excel save into a phone folder.

Latest EAS/APK status on 2026-06-04:
- Correct preview build for the `pdf-lib` fix:
  - Build id: `df38324a-bf39-4476-902f-5beae80fc7e0`
  - Commit: `1bd0777f564de0d717ff2eb83e5cb231aec7627b`
  - APK URL: `https://expo.dev/artifacts/eas/tyHCdJj3vGLR977Q9DMEtj.apk`
  - Local APK: `artifacts\SplitHub-preview-1bd0777.apk`
  - Size: `106397121`
  - SHA256: `8CD167437397920DF0DB6E0C2C66841D677BC30A1B366E7E0159402C2AB18FFA`
  - Installed on device `11000373CD011362` with `adb install -r -d`: `Success`
- Device verification is paused because the phone relocked and shows `Введите пароль`; do not enter the user's PIN. Ask the user to unlock, then launch `ru.splithub.mobile` and verify PDF saving.
- Correct preview build for the full-catalog performance follow-up:
  - Build id: `863be1cc-68e6-4907-abf7-f7cbdea2e949`
  - Commit: `b2f35a2d7e16f0da70d43947f6c9c85194319cc3`
  - APK URL: `https://expo.dev/artifacts/eas/hzoUNGePVn4SLhWK2VQsur.apk`
  - Local APK: `artifacts\SplitHub-preview-b2f35a2.apk`
  - Size: `106416157`
  - SHA256: `17A990323071A70923707BD589D89AA9BB3F1394B7EE00DEE0BB1A849F9F859A`
  - Installed on device `11000373CD011362` with `adb install -r -d`: `Success`
  - Package `lastUpdateTime`: `2026-06-04 10:20:43`
  - Device scroll verification is blocked until the user unlocks the phone; ADB still shows `mDreamingLockscreen=true`, `mInputRestricted=true`.
- UX polish preview build:
  - Build id: `0f8e97d8-50fe-46a1-b4b8-e528c155c06f`
  - Commit: `a926490bae03bfdde437631e338eb41b4d9b3798`
  - APK URL: `https://expo.dev/artifacts/eas/2VqoYHGbh4f2K9xdrcGaZR.apk`
  - Status: finished.
  - Caveat: this build does not include later pull-to-refresh commit `4e902e6`.
- Pull-to-refresh build status:
  - Latest local commit: `4e902e6 feat: add pull to refresh for cart and orders`.
  - `npx.cmd eas build --platform android --profile preview --non-interactive --wait` exited with code `1073807364` and no output before enqueueing a visible build.
  - Latest EAS list still shows `a926490` as the newest finished build, so create a fresh EAS preview build from `4e902e6` after push if a device APK is needed.

## Open Work

- Auth/session follow-up: the user-reported "logged in but still shows logged out" state was not reproduced on APK `2127be7`; keep watching for it on other accounts or older installed APKs.
- Full catalog performance follow-up: code fix is local and tested; needs fresh EAS APK, install on TECNO BG6, and ADB `gfxinfo` scroll profile after the user unlocks the phone.
- Home UX/status polish and pull-to-refresh: code is committed locally and fully verified by Jest/typecheck/lint; after push, start a fresh EAS preview build from `4e902e6`, install it on TECNO BG6, then visually verify home bottom gap, order status badges, auth `+7`, and pull-to-refresh in cart/orders.
- Mobile Telegram/email server deploy: isolated site files are deployed and mobile API order smoke passed. Still needs human visual confirmation that Telegram message `SH-00054` is Russian, has inline buttons, and email arrived in the mailbox.
- Direct price-list download: old CSV app-cache flow was deployed and APK-verified on TECNO BG6. New PDF/Excel phone-folder flow is committed, pushed, and installed from build `df38324a-bf39-4476-902f-5beae80fc7e0`; PDF/Excel phone-folder verification needs the phone unlocked.
- Storefront smoke test after any site deploy: `send.php` must still accept a live-site-style order with no item ids and return `{"ok":true}`.

## Do Not Commit

- Local APKs, screenshots, XML dumps, and ADB artifacts under `artifacts/`.
- Any accidental files from the outer workspace or user home directory.
