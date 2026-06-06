# Mobile Handoff Memory

Updated: 2026-06-06 17:30 +03:00

This file is the working memory for continuing the SplitHub mobile app safely after a reboot or a new Codex session.

---

## 2026-06-06 — Local Android build WORKING + full push trace

### TL;DR
- A release APK now builds **locally on Windows** (no EAS, no quota): `android/app/build/outputs/apk/release/app-release.apk` (~48 MB). Local copies: `artifacts/SplitHub-local-fcm.apk`, `artifacts/SplitHub-local-fcm-dbg.apk`.
- The whole push chain was traced end to end. Everything in the app is correct. The only remaining blockers are **operational**: deploy one backend SQL fix, and Russian users need VPN for Expo Push (geo-block).

### Local build — exact command
```
cd .../mobile-native-parity
export JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-17.0.19.10-hotspot"
export ANDROID_HOME="/c/Users/user/AppData/Local/Android/Sdk"
export CMAKE_VERSION="3.31.6"
bash android/gradlew -p android :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --no-watch-fs --no-daemon
```
Release buildType is signed with the **debug keystore** (Expo default) — installable, fine for testing. Needs an active **VPN** while resolving dependencies (Google Maven is blocked from RU — see below).

### Build problems solved (took 22 build attempts)
1. **ninja `build.ninja still dirty after 100 tries`** (CMake `CONFIGURE_DEPENDS` loop on Windows): added `-DCMAKE_SUPPRESS_REGENERATION=ON` to the CMake args of **all 4 native modules** (`react-native-screens`, `react-native-worklets`, `react-native-reanimated`, `expo-modules-core`) and the `:app` module.
2. **`Filename longer than 260 characters` / `mkdir ... No such file or directory`** (Windows MAX_PATH): forced **CMake 3.31.6** (long-path-aware ninja; `LongPathsEnabled=1` already set in registry) for every native module. `worklets`/`reanimated` read `CMAKE_VERSION` env; `screens`/`expo-modules-core` were pinned via `version "3.31.6"` in their `build.gradle`; `:app` via an override appended to `android/app/build.gradle`.
3. **`androidx.collection:collection:1.0.0` has no jar** (404 everywhere): `resolutionStrategy { force 'androidx.collection:collection:1.5.0' }` in `android/build.gradle` allprojects.
4. **Google Maven (`dl.google.com`) blocked from Russia (404)** on androidx + AGP: solved by the user's **VPN** → official google works. (A local mirror / Aliyun mirror were explored but VPN is the clean answer. `--refresh-dependencies` POISONS the cache when google is blocked — do NOT use it without VPN.)

### ⚠️ These build fixes live in GITIGNORED / ephemeral locations — they are LOST on `npm install` or `expo prebuild --clean`
- Patches in `node_modules/{react-native-screens,react-native-worklets,react-native-reanimated,expo-modules-core}/android/build.gradle` and `node_modules/expo-modules-autolinking/android/expo-gradle-plugin/*/build.gradle.kts`.
- Overrides in `android/build.gradle` (cmake version + suppress-regen + lint-disable + collection force) and `android/app/build.gradle` (long-path override). `/android` is gitignored.
- `~/.m2local` mirror + `~/.m2local-init.gradle` init-script — only needed when google is blocked; with VPN they are NOT needed.
- **Follow-up to make reproducible:** convert the node_modules patches to **patch-package**, and move the `android/` overrides into an Expo **config plugin** (so prebuild regenerates them).

### FCM / push setup (done)
- Firebase project **`splithub-mobile-61da2`** (Spark/free), Android app `ru.splithub.mobile`, App ID `1:304156935628:android:3740b5c75d157a0cb78969`.
- `google-services.json` is in the project (gitignored) and `app.json` has `android.googleServicesFile`. `expo prebuild` copied it into `android/app/` and applied the `com.google.gms.google-services` plugin.
- **FCM V1 service account key already uploaded to Expo** (project @alextsarev/splithub, uploaded Jun 6 14:20). Key file in project (gitignored): `splithub-mobile-61da2-firebase-adminsdk-fbsvc-2ffd99bc0c.json`.

### Push chain — traced on device (TECNO BG6, local APK)
1. FCM device token — ✅ (Firebase inits, permission granted).
2. Expo push token (`exp.host/--/api/v2/push/getExpoPushToken`) — ✅ **only with VPN on the PHONE**. Without phone VPN it returns **403 Forbidden** (Expo runs on Google Cloud → geo-blocks RU IPs). Phone ping to Google/exp.host works (ICMP), but the HTTPS POST is WAF-blocked.
3. Server `register_device` — **was failing**: `SQLSTATE[HY000]: General error: 1 near "ON": syntax error`. Root cause: `api/lib/push.php` used `INSERT ... ON CONFLICT(expo_token) DO UPDATE` (SQLite UPSERT, needs SQLite ≥ 3.24); the SprintHost shared SQLite is older. **FIXED** in `api/lib/push.php` (backend repo `codex/mobile-notifications-russian`): rewrote as `INSERT OR IGNORE` + `UPDATE`. **Needs deploy to splithub.ru** (safe process: `php -l` on server, backup, upload only `api/lib/push.php`, storefront smoke `send.php` → `{"ok":true}`).

### ⚠️ Product conclusion (RU) — defer to a separate task
**Expo Push Service is geo-blocked in Russia (403).** Even after the backend fix, real RU users without VPN will not register for push via Expo. For production push to a Russian audience, plan **RuStore Push (VK)** or a direct FCM server-send path, not Expo Push. (The design doc already anticipated a second Android push provider.)

### Sound notifications (done, global)
- `~/.claude/settings.json` hooks: `Notification`→attention beep, `Stop`→done beep, `StopFailure`→error double-beep, via `~/.claude/claude-notify.ps1`. Toggle with `sound on|off|test` (added `~/.claude` to PATH; `~/.claude/sound.cmd`). Mute flag file: `~/.claude/sound-disabled`.

### Next steps (agreed order)
1. (this) write handoff + commit/push both repos.
2. Deploy `api/lib/push.php` fix to splithub.ru.
3. Re-test push end to end on device (VPN on phone) — the installed `*-dbg.apk` still surfaces the raw error if needed.
4. Then address the RU push-provider product decision.

## Repositories

- Mobile app workspace: `C:\Users\user\Documents\GitHub\VSCode\splithub_mobile_app\mobile-native-parity`
- Mobile branch: `codex/native-site-parity`
- Mobile HEAD before this handoff docs update: `c6e0096 feat: refresh home and update app icon`
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
- Home refresh, icon, and push routing follow-up on 2026-06-05:
  - Commit `c6e0096 feat: refresh home and update app icon`.
  - App icon assets were rebuilt from `C:\Users\user\Desktop\клод скрины\сплитхом\Фавикон_Логотип splithub.png`.
  - Generated assets: `assets/images/icon.png`, `assets/images/android-icon-foreground.png`, `assets/images/android-icon-monochrome.png`, `assets/images/favicon.png`, `assets/images/splash-icon.png`.
  - Icon verification before build: outer corners are dark `#061226`; adaptive foreground corners are transparent, so the centered favicon should not show white external corners.
  - Home screen now supports pull-to-refresh through `useCatalog().refresh`.
  - Orders screen refresh text is now a real button state: `Обновить статусы` / `Обновляем...`.
  - Promotion push routing now supports `product_id`, e.g. `{ type: "promotion", product_id: "mdv-09" }` opens `/product/mdv-09`.
  - No site files or production storefront files were changed.
- Diagnostic hardening on 2026-06-06:
  - Based on `docs/diagnostic-report-2026-06-06.md`.
  - Mobile-only files changed; no `send.php`, `index.html`, site catalog files, or Telegram curl settings were touched.
  - `src/lib/api.ts` now has a default 15s timeout, maps non-JSON server responses to stable `HTTP_<status>` errors, maps `401` to `SESSION_EXPIRED`, and clears the stored token on expired sessions.
  - `src/features/session/session-errors.ts` now shows `Сессия истекла. Войдите заново.` for expired sessions.
  - Push registration moved into session restore/login/register through `SessionProvider`; it is fire-and-forget so auth is not blocked if push permissions/network fail.
  - `src/features/notifications/register-device.ts` now exports shared defaults, persists the Expo push token in AsyncStorage, can ensure/remove the registered device, and loads notification preferences with a safe default fallback.
  - `src/app/_layout.tsx` now sets a foreground notification handler with `shouldShowBanner` and `shouldShowList`.
  - `src/app/(tabs)/profile.tsx` now uses the shared/persisted push token and removes the registered device on logout.
  - `src/features/notifications/notification-router.ts` now allowlists external manager message URLs to `https://t.me/*` and `https://splithub.ru/*`; untrusted URLs fall back to `https://t.me/Byttehnikaopt`.
  - `src/lib/storage.ts` now stores catalog cache in a schema envelope with 24h TTL and ignores malformed/expired catalog cache or malformed cart cache instead of throwing.
  - `.env` is now ignored.
  - Expo SDK patch packages were aligned with `npx expo install --fix`, and `app.json` now includes the `expo-image` config plugin added by Expo.
  - New/updated tests: `__tests__/api.test.ts`, `__tests__/storage.test.ts`, `__tests__/session-push-registration.test.tsx`, `__tests__/notification-router.test.ts`, `__tests__/session-errors.test.ts`.

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

Local checks on 2026-06-05 after the app icon/home refresh/promotion routing follow-up:
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd test -- --runInBand`: passed, 22 suites / 57 tests.

Local checks on 2026-06-06 after diagnostic hardening:
- RED targeted tests failed first for missing API timeout/non-JSON/401 handling, unsafe manager URL routing, missing expired-session message, unsafe cache parsing, and no session-level push registration.
- `npm.cmd test -- --runInBand --runTestsByPath __tests__\api.test.ts __tests__\notification-router.test.ts __tests__\session-errors.test.ts __tests__\storage.test.ts __tests__\session-push-registration.test.tsx`: passed, 5 suites / 16 tests.
- `npm.cmd test -- --runInBand --ci`: passed, 24 suites / 67 tests.
- `npm.cmd run typecheck`: passed.
- `npm.cmd run lint`: passed.
- `npx.cmd expo-doctor`: passed, 21/21 checks.
- `npm.cmd audit --omit=dev`: still reports 11 moderate vulnerabilities in Expo build/prebuild tooling through `uuid`/`xcode`; `npm audit fix --force` would install incompatible/breaking Expo packages, so it was not run.

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

Latest EAS/APK status on 2026-06-05:
- Correct preview build for `c6e0096 feat: refresh home and update app icon`:
  - Build id: `444ef799-a489-4233-b981-6ae4a84d713f`
  - Commit: `c6e009626e060c7ecb7cda7dadacf2f7789e0bb9`
  - Status: `FINISHED`
  - Logs: `https://expo.dev/accounts/alextsarev/projects/splithub/builds/444ef799-a489-4233-b981-6ae4a84d713f`
  - APK URL: `https://expo.dev/artifacts/eas/9repJfsxU7VgHtHob3Ksgr.apk`
  - Local APK: `artifacts\SplitHub-preview-c6e0096.apk`
  - Size: `102.92 MB`
  - SHA256: `56EE888E488BED7ECABF0A4D336F97C1390FBC493293424B17BADC067D3EB04B`
  - Installed on TECNO BG6 `11000373CD011362` with `adb install -r`: `Success`.
  - Package: `ru.splithub.mobile`, `versionName=1.0.0`, `versionCode=1`, `targetSdk=36`, `lastUpdateTime=2026-06-05 23:37:34`.
  - ADB launch check: app process `ru.splithub.mobile` was foreground/resumed. `logcat` showed `ReactNativeJS: Running "main"` and `Displayed ru.splithub.mobile/.MainActivity`; no `FATAL EXCEPTION` for `ru.splithub.mobile` was present in the captured logs.
  - Caveat: `adb shell monkey` printed native tombstone notices on TECNO BG6 during launch. Current evidence points to system/monkey noise rather than an app crash because the app stayed resumed, but keep this in mind during manual visual testing.
- Public release / iOS / security planning:
  - User asked for a plan for Google Play, App Store/iOS, RuStore, iOS builds, and a serious security review.
  - Official-source research was started but not finalized in the user-facing answer yet. Continue from official Google Play, Apple Developer, Expo EAS, RuStore, and OWASP MASVS sources before giving store/security recommendations.

## Open Work

- Auth/session follow-up: the user-reported "logged in but still shows logged out" state was not reproduced on APK `2127be7`; keep watching for it on other accounts or older installed APKs.
- Device verification after diagnostic hardening: build/install a fresh APK before claiming push/session/cache hardening is device-verified.
- Full catalog performance follow-up: latest APK from `c6e0096` is installed; run ADB `gfxinfo` scroll profiling and manual visual checks after the phone is unlocked and the user is ready.
- Home UX/status polish and pull-to-refresh: latest APK from `c6e0096` is installed; visually verify home bottom gap, order status badges, auth `+7`, pull-to-refresh in home/cart/orders, and the updated launcher icon.
- Public publication/security follow-up: finish the official-source plan for Google Play, App Store/iOS builds, RuStore, push notification architecture, and mobile/backend security hardening.
- Mobile Telegram/email server deploy: isolated site files are deployed and mobile API order smoke passed. Still needs human visual confirmation that Telegram message `SH-00054` is Russian, has inline buttons, and email arrived in the mailbox.
- Direct price-list download: old CSV app-cache flow was deployed and APK-verified on TECNO BG6. New PDF/Excel phone-folder flow is committed, pushed, and installed from build `df38324a-bf39-4476-902f-5beae80fc7e0`; PDF/Excel phone-folder verification needs the phone unlocked.
- Storefront smoke test after any site deploy: `send.php` must still accept a live-site-style order with no item ids and return `{"ok":true}`.

## Do Not Commit

- Local APKs, screenshots, XML dumps, and ADB artifacts under `artifacts/`.
- Any accidental files from the outer workspace or user home directory.
