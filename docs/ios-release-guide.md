# SplitHub для iPhone (iOS) — инструкция

Код приложения общий (React Native), отдельно переписывать под iOS не нужно. Но у
iOS свои жёсткие правила — главное понять их заранее.

## ГЛАВНОЕ, что отличается от Android

1. **Собрать iOS можно ТОЛЬКО на macOS (Xcode) или в облаке.** На Windows-ноуте
   (где мы собираем Android) iOS не собрать. Варианты без Mac — облачная сборка
   (EAS / Codemagic).
2. **На iPhone НЕТ установки по ссылке (sideload).** Никаких «скачать файл и
   поставить». Приложение на iPhone ставится ТОЛЬКО через Apple:
   **TestFlight** (бета) или **App Store**. Модель раздачи APK по ссылке на iOS
   невозможна в принципе.
3. **Нужен Apple Developer account — $99/год** (оплата иностранной картой).
4. **Push на iOS — отдельно:** нужен ключ **APNs** от Apple (Android использует FCM,
   iOS — APNs).

## Что уже готово / чего нет

- ✅ Код приложения работает и на iOS.
- ✅ В `app.json` есть iOS-конфиг: `bundleIdentifier = ru.splithub.mobile`, иконка.
- ✅ `eas.json` присутствует — облачная сборка Expo доступна.
- ❌ Нет папки `ios/` (генерируется командой `npx expo prebuild --platform ios`).
- ❌ Нет Apple Developer account, сертификатов, APNs-ключа.

## Пошаговый путь (рекомендуемый — без Mac, через облако EAS)

1. **Apple Developer account** ($99/год) — developer.apple.com. На ИП Гуриненко
   (Organization) или как физлицо (Individual). Из РФ — оплата иностранной картой.
2. **Аккаунт Expo** (бесплатный) — для облачной сборки EAS.
3. **Сгенерировать iOS-проект и собрать в облаке:**
   ```
   npx expo prebuild --platform ios     # создаст ios/
   npx eas login
   npm run ios:build:safe
   ```
   EAS сам создаст и подпишет сертификаты/provisioning (можно довериться
   автоматическому управлению ключами). Сборка идёт на их Mac, скачивается .ipa.
   - Альтернатива: **Codemagic** (CI с Mac-агентами, есть бесплатные минуты) или
     одолжить/арендовать Mac и собрать в Xcode.
4. **Push (APNs):** запускать настройку через `npm run ios:credentials:safe`.
   В Apple Developer создать **APNs Auth Key (.p8)**, загрузить в
   Expo (EAS credentials) — тогда push заработает и на iOS. Серверная отправка
   (`api/lib/push.php` через Expo) уже совместима — Expo сам маршрутизирует в APNs.

## Защита от лимита Apple 2FA

Apple может временно блокировать вход в Developer Portal, если EAS несколько раз
подряд просит проверку аккаунта. Поэтому не запускайте напрямую
`npx eas credentials --platform ios` и `npx eas build --platform ios` во время
настройки Apple credentials. Используйте guard-команды:

```powershell
npm run ios:apple-auth-status
npm run ios:apple-auth-cooldown
npm run ios:credentials:safe
npm run ios:build:safe
```

Guard-скрипт хранит локальный cooldown в `%LOCALAPPDATA%\SplitHubMobileApp`,
не хранит пароль/2FA и не даёт случайно запустить несколько Apple-login попыток
параллельно.
Если Apple уже показал `Too many verification codes`, сначала выполните
`npm run ios:apple-auth-cooldown`, подождите 24 часа и только потом делайте одну
новую попытку через safe-команду.

## App Store Connect API Key без Apple ID/2FA

Для загрузки iOS-сборки в TestFlight/App Store настроен App Store Connect API Key
в `eas.json`:

- `ascApiKeyPath`: `./secrets/apple/AuthKey_79JNYJRUN9.p8`
- `ascApiKeyIssuerId`: `09ff797e-f79b-42d0-99f1-0a5f823e2cc6`
- `ascApiKeyId`: `79JNYJRUN9`
- `appleTeamId`: `4VJL58Y8J4`

Файл `.p8` хранится локально и не коммитится (`*.p8` в `.gitignore`). Этот ключ
используется без Apple ID/2FA:

```powershell
npm run ios:asc:check
npm run ios:build:asc
npm run ios:submit:asc
```

`ios:build:asc` передаёт EAS переменные `EXPO_ASC_API_KEY_PATH`,
`EXPO_ASC_KEY_ID`, `EXPO_ASC_ISSUER_ID`, `EXPO_APPLE_TEAM_ID`,
`EXPO_APPLE_TEAM_TYPE` и запускает `eas build --non-interactive`. Если EAS сможет
создать Distribution Certificate + Provisioning Profile через Admin API key,
сборка стартует без Apple ID. Если Apple/EAS не покрывает какую-то операцию этим
ключом, команда должна завершиться ошибкой без интерактивного Apple login; тогда
cert/profile создаются вручную в Apple Developer Portal и загружаются в EAS.
5. **Распространение:**
   - **TestFlight** — бета для клиентов (до 10 000 тестеров), быстрая проверка Apple
     (Beta App Review). Оптимально для B2B-клиентов на старте.
   - **App Store** — полная публикация, строже модерация (нужны privacy, описание,
     скриншоты — privacy уже есть `https://splithub.ru/privacy/`).

## РФ-реалии (честно)

- $99 Apple Developer — нужна иностранная карта.
- App Store в РФ — ограничения по оплатам/доступности; **бесплатное** приложение
  публиковать можно.
- Apple-проверки строже, чем у Android-сторов.

## Прагматичная альтернатива прямо сейчас

**Сайт splithub.ru уже полностью работает на iPhone в Safari** — каталог, заказы,
регистрация с email и восстановление пароля. Клиент с айфона может пользоваться
SplitHub через браузер **без всякого приложения**. Можно добавить «На экран
"Домой"» (PWA-ярлык) — иконка как у приложения, открывается на весь экран.

**Рекомендация по приоритетам:** сначала Android (RuStore) + сайт (готов), а нативный
iOS-апп — позже, когда будет смысл и решён вопрос с Apple Developer / оплатой. Для
iPhone-клиентов сайт закрывает потребность уже сегодня.
