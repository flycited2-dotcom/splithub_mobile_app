# Mobile QA Queue

Updated: 2026-06-05 23:57 +03:00

Safety rules:
- Do not change the storefront flow in `send.php` or `index.html`.
- Server fixes for the app must stay isolated in mobile endpoints and `api/lib/*`.
- Keep `TG_FORCE_IP`, Telegram `CURLOPT_RESOLVE`, and fail-open storefront order intake intact.
- Catalog truth for Splithub is `products.js` on the site side: 275 active items with owner prices.

## P0

- [ ] **Full catalog performance** `(latest APK installed; device retest pending)`
  - Symptom: tapping "Весь каталог" opened a very heavy catalog and scrolling became jerky.
  - Old installed APK baseline on 2026-06-03: 111/111 janky frames, p90 113ms, p99 400ms, 3096 attached views, slow bitmap uploads 111.
  - First fix: replaced grouped full-catalog `ScrollView` with virtualized `FlatList` rows in branch `codex/native-site-parity`.
  - Fresh APK `9325c2e`, EAS build `93cd4541-2969-42b6-a48c-473f428c758a`: 487 total frames, 32 janky frames (6.57%), p50 16ms, p90 24ms, p95 29ms, p99 73ms, 73 attached views, slow bitmap uploads 0.
  - Latest APK `2127be7`, EAS build `7d53924f-6c70-4ac3-9b61-43a820582904`: full catalog opens and scrolls on TECNO BG6; measured 58 frames, 7 janky frames (12.07%), p50 10ms, p90 25ms, p95 150ms, p99 300ms, slow bitmap uploads 0.
  - Reopened on 2026-06-04: user still reports severe jank when tapping the home full-catalog button.
  - New root-cause evidence: live catalog has 275 products; the flat grid needs about 138 rows, while the grouped full-catalog path still builds about 302 rows (`5` sections, `41` brand rows, `84` series rows, `172` product rows).
  - New code fix: home full-catalog button, cart "continue shopping", and promotion notifications without a category now open `/catalog` with `mode=flat`; `ProductCard` uses `expo-image` with `cachePolicy="memory-disk"` and `recyclingKey`; catalog render callbacks are memoized with `useCallback`.
  - Local verification: the new RED tests failed on the old path, then passed after the fix; full Jest/typecheck/lint, `expo install --check`, and `npx expo-doctor` passed.
  - Fresh APK for retest: commit `b2f35a2`, EAS build `863be1cc-68e6-4907-abf7-f7cbdea2e949`, local file `artifacts\SplitHub-preview-b2f35a2.apk`, installed on TECNO BG6 with `adb install -r -d`: `Success`.
  - Latest installed APK on 2026-06-05: commit `c6e0096`, EAS build `444ef799-a489-4233-b981-6ae4a84d713f`, local file `artifacts\SplitHub-preview-c6e0096.apk`, installed on TECNO BG6 with `adb install -r`: `Success`.
  - Remaining check: capture ADB `gfxinfo` after repeated full-catalog scrolls on the installed `c6e0096` APK and ask the user for a manual feel check.

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

- [x] **Home safe-area and quick-filter polish** `(code-fixed; final APK from pull-to-refresh commit still pending)`
  - User disliked that the home screen content scrolled under the Android/iOS system area and left a useless empty tail after "Полупром" / "Чёрные сплиты".
  - Code fix in `a926490`: home uses a fixed outer safe-area container, disables scroll overshoot/bounce, and keeps the closed "Полупром" modal outside the `ScrollView`.
  - Code fix in `a926490`: quick-filter colors now match the requested palette: copper, turquoise, green-turquoise, silver, white, and dark.
  - Local verification: `home-auth-button` tests cover safe-area/overshoot, filter colors, and modal placement; full Jest/typecheck/lint passed.

- [x] **Order status colors and auth phone prefix** `(code-fixed; final APK from pull-to-refresh commit still pending)`
  - Code fix in `a926490`: login/register phone fields start with `+7`.
  - Code fix in `a926490`: order status badges are distinct colors: `Новый` blue, `Подтверждён` orange, `Выполнен` green, `Отменён` red.
  - Local verification: `auth-phone-prefix` and `order-submit-indication` tests cover both changes; full Jest/typecheck/lint passed.

- [x] **Swipe down to refresh cart and orders** `(code-fixed; latest APK installed)`
  - User requested pull-to-refresh for order status and cart.
  - Code fix in `4e902e6`: orders `ScrollView` has `RefreshControl` and reloads `listOrders()` on swipe.
  - Code fix in `4e902e6`: cart `ScrollView` has `RefreshControl` and refreshes catalog data used by prices/upsells.
  - Local verification: `order-submit-indication` tests cover both refresh controls; full Jest/typecheck/lint passed, 22 suites / 54 tests.
  - Latest APK `c6e0096` includes this fix and is installed on TECNO BG6.
  - Remaining check: visual swipe verification on orders/cart in the installed APK.

- [x] **Swipe down to refresh home catalog data** `(code-fixed; latest APK installed)`
  - User requested pull-to-refresh on the home screen too.
  - Code fix in `c6e0096`: home `ScrollView` has `RefreshControl` tied to `useCatalog().refresh`.
  - Local verification: `home-auth-button` tests cover the home refresh control; full Jest/typecheck/lint passed, 22 suites / 57 tests.
  - Latest APK `c6e0096` is installed on TECNO BG6.
  - Remaining check: visual swipe verification on the home screen in the installed APK.

- [x] **Launcher icon from final favicon** `(code-fixed; latest APK installed)`
  - User rejected the previous app icon as off-axis/crooked.
  - Code fix in `c6e0096`: icon assets were rebuilt from `C:\Users\user\Desktop\клод скрины\сплитхом\Фавикон_Логотип splithub.png`.
  - Generated assets: `icon.png`, adaptive foreground/monochrome icons, favicon, and splash icon.
  - Verification before build: dark outer corners on the main icon and transparent adaptive foreground corners.
  - Latest APK `c6e0096` is installed on TECNO BG6.
  - Remaining check: visual confirmation from Android launcher that the icon is centered and looks good.

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

- [ ] **Price-list save as PDF or Excel into phone folder** `(new APK installed, PDF retest blocked by phone PIN)`
  - User correction: "скачан в приложение" is not enough; the file should be saved to the phone, with a choice between PDF and Excel.
  - Code fix in `f2c3487`: home/profile show a format picker with `PDF`, `Excel`, and cancel.
  - Code fix in `f2c3487`: Excel is generated as `.xls` from the loaded mobile catalog; PDF was originally generated through `expo-print`; both are saved through Android Storage Access Framework into a user-selected folder.
  - Device verification on old APK `f2c3487`: Excel saved successfully into `/sdcard/Download/SplitHub`; PDF stayed on `Готовим прайс...` and no PDF appeared.
  - Root cause: Android `expo-print`/WebView print callback did not complete on TECNO BG6.
  - Code fix in `1bd0777`: PDF is generated in JS with `pdf-lib` and embedded Roboto fonts for Cyrillic; `expo-print` was removed.
  - Local verification: `price-list-download` tests cover the format picker, Excel save, PDF save, folder-cancel error; full Jest/typecheck/lint passed.
  - EAS preview build for the fixed PDF path: `df38324a-bf39-4476-902f-5beae80fc7e0`, commit `1bd0777`, APK `artifacts\SplitHub-preview-1bd0777.apk`, installed on device `11000373CD011362`.
  - Remaining check: unlock the phone, tap "Загрузить прайс", save PDF into the already selected phone folder, and confirm the file exists and starts with `%PDF-`.

- [x] **Hide empty home quick sections**
  - User disliked the empty area/empty sections after "Полупром" and "Чёрные сплиты".
  - Code fix in `f2c3487`: quick-filter buttons are derived from the loaded catalog and hidden when no products match the filter.
  - Loading behavior: configured buttons stay visible while the catalog is still loading, to avoid a blank flicker.
  - Local verification: `quick-filters` tests cover hiding an empty section and keeping configured filters while loading.

## P2

- [x] **Top/bottom safe-area polish**
  - First fix committed in `5851f96`; home follow-up fixed in `a926490`.

- [ ] **Replace modal add-to-cart alerts**
  - Earlier implementation still used a blocking "Добавлено в заявку" modal on some paths.
  - Current priority is persistent counters/badges; replace remaining modal alerts with non-blocking feedback in the next polish pass.

- [ ] **Public release, iOS build, RuStore, and security plan**
  - User asked for a concrete public publishing plan for Google Play, App Store/iOS, and RuStore.
  - User also asked how to build for iPhone and to work through app/backend security seriously.
  - Next step: finish official-source research and produce a staged plan covering store accounts, signing, privacy/data forms, testing tracks, iOS EAS build requirements, push notifications, and OWASP MASVS-style hardening.
