# Handoff для Codex: собрать и опубликовать iOS-версию SplitHub

Это бриф для агента (Codex с iOS-скиллом). Код приложения уже кросс-платформенный —
**заново писать не надо**, нужно сгенерировать iOS-проект, собрать в облаке (Mac),
подписать и отправить в TestFlight/App Store.

## Что это за проект (факты)
- Репозиторий: `flycited2-dotcom/splithub_mobile_app`, рабочая ветка `codex/native-site-parity`.
  Корень приложения — `mobile-native-parity/` (Expo **bare** workflow, RN + TypeScript).
- App name: **SplitHub**; slug `splithub`; version **1.1.0**.
- Bundle ID (iOS): **`ru.splithub.mobile`**; scheme `splithub`.
- Expo: owner **`alextsarev`**, projectId **`1d57a8c8-642d-4441-8149-b62393ef9a09`** (EAS уже привязан).
- `eas.json` уже есть (профили development/preview/production/rustore + submit.production).
- Backend (общий с сайтом): API `https://splithub.ru/api/mobile.php` (дефолт в `src/lib/api.ts`).
- Push: `expo-notifications`. Android — FCM; **iOS — нужен APNs-ключ** (см. шаги).
- Privacy policy (для App Store): `https://splithub.ru/privacy/`.
- Иконка: `assets/images/icon.png` (1024×1024). ⚠️ Для iOS/App Store икона должна быть
  **без альфа-канала** (opaque). Если есть прозрачность — сплющить на непрозрачный фон.

## ЖЁСТКИЕ ВНЕШНИЕ БАРЬЕРЫ (не обходятся кодом/агентом)
1. Сборка iOS — только на **macOS**. Без Mac → собирать в облаке (**EAS Build**,
   проект уже привязан) или Codemagic/Xcode Cloud.
2. **Apple Developer Program — $99/год** обязателен (платит человек, иностранная карта).
3. Раздача iOS — **только через Apple** (TestFlight/App Store). Sideload/MCP — невозможно.

## Что должен предоставить ЧЕЛОВЕК (агент не сделает сам)
- Активный **Apple Developer account** (Team ID) + Apple ID для входа.
- Доступ к **Expo-аккаунту `alextsarev`** (`eas login`).
- Решение по распространению: начать с **TestFlight** (бета), затем App Store.
- Платёжные/идентификационные данные для Apple (вне репозитория).

## Шаги для агента (EAS, облачный Mac)
1. `cd mobile-native-parity && npm ci`
2. Сгенерировать iOS-проект: `npx expo prebuild --platform ios` (создаст `ios/`).
   Проверить `ios/SplitHub/Info.plist`: `ITSAppUsesNonExemptEncryption=false` (уже
   `usesNonExemptEncryption:false` в app.json), push-capability (добавляет expo-notifications).
3. Вход в EAS: `npx eas login` (как `alextsarev`).
4. Сборка: `npx eas build --platform ios --profile production`.
   - EAS сам создаст/привяжет **Distribution Certificate + Provisioning Profile**
     (выбрать «let EAS manage credentials», вход в Apple Developer по запросу).
   - На выходе — `.ipa` (сборка на их Mac).
5. Push (APNs): `npx eas credentials` → платформа iOS → создать/привязать **APNs Key (.p8)**.
   Серверная отправка через Expo уже совместима (Expo маршрутизирует в APNs).
6. Публикация: `npx eas submit --platform ios --profile production`
   (загрузит в App Store Connect → TestFlight). Затем в App Store Connect заполнить
   карточку: описание (взять/адаптировать из `docs/rustore-listing.md`), категория,
   возрастной рейтинг, **privacy URL `https://splithub.ru/privacy/`**, скриншоты iPhone.
7. TestFlight: пройти Beta App Review, раздать тестерам. App Store — отдельная подача на ревью.

## Проверить/настроить под iOS
- Иконка App Store 1024×1024 **без alpha** (иначе авто-реджект).
- Версии: `app.json` version `1.1.0`; build number iOS — EAS `autoIncrement` (профиль production).
- Если используются нативные разрешения (камера/фото/уведомления) — добавить
  `NS...UsageDescription` в Info.plist (сейчас критично только push, его ставит плагин).
- Проверить, что JS бьёт в прод-API `https://splithub.ru/api/mobile.php` (без staging).

## Критерии приёмки
- [ ] `ios/` сгенерирован, проект собирается на EAS без ошибок, есть `.ipa`.
- [ ] Приложение установилось через TestFlight на реальный iPhone, экран входа/каталог открылись.
- [ ] Регистрация с email и восстановление пароля работают (тот же бэкенд, что у Android/сайта).
- [ ] Push приходит на iOS (APNs настроен).
- [ ] Карточка в App Store Connect заполнена (privacy URL, описание, скриншоты).

## Полезные файлы в репо
- `docs/ios-release-guide.md` — обзор пути iOS.
- `docs/rustore-listing.md` — тексты карточки (адаптировать для App Store).
- `docs/mobile-app-playbook.md` — общий рецепт; `docs/START-HERE.md` — обзор проекта.
- `app.json`, `eas.json` — конфиг Expo/EAS.
