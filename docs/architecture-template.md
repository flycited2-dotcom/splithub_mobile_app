# Шаблон архитектуры: мобильное приложение поверх существующего сайта

Полный скелет архитектуры проекта SplitHub, вычищенный от специфики ниши. По этому
документу можно «под копирку» собрать приложение для любого похожего сайта
(каталог → корзина → заказы → личный кабинет → push). Здесь — **что** копировать и
**какие места параметризуются** под новый бренд/сайт. Как собирать и релизить —
в `mobile-app-playbook.md` (сборка, keystore, сторы, грабли).

---

## 0. Идея в одном абзаце

Приложение — это **тонкий RN-клиент поверх бэкенда уже работающего сайта**. Один
источник данных (общая БД сайта), один новый файл-роутер `api/mobile.php` на сервере,
bearer-токены вместо PHP-сессий. Клиент — Expo (bare) + expo-router + React Context,
без Redux/RTK/react-query: доменная логика лежит в чистых функциях, контексты только
склеивают их с React. Всё, что может работать офлайн (каталог, корзина, избранное),
кэшируется в AsyncStorage; всё секретное (токен) — в SecureStore.

```
┌─────────────────────────── Клиент (React Native / Expo bare) ───────────────────────────┐
│  src/app (expo-router: экраны)                                                          │
│      ↓ использует                                                                       │
│  src/features/* (домены: context + repository + чистые функции + types)                 │
│      ↓ использует                                                                       │
│  src/lib (api, token-storage, storage, theme)   src/components, src/hooks, constants    │
└──────────────────────────────────────┬──────────────────────────────────────────────────┘
                                       │ HTTPS: GET/POST  ?action=... + Bearer token
┌──────────────────────────────────────▼──────────────────────────────────────────────────┐
│  Сервер (тот же хостинг, что и сайт): api/mobile.php (роутер) → api/lib/* (общая        │
│  логика с сайтом) → SQLite (общая БД). Push: сервер → Expo Push API → FCM/APNs.         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Стек (фиксированные решения)

| Слой | Выбор | Почему |
|---|---|---|
| Клиент | React Native + Expo **bare workflow**, TypeScript | `android/`+`ios/` в репо → воспроизводимая сборка; удобства Expo остаются |
| Навигация | expo-router (file-based) + typedRoutes | Экран = файл, deep-links бесплатно |
| Состояние | React Context + useReducer + чистые функции | Один разработчик, мало глобального состояния; вся логика тестируется без React |
| Хранение | SecureStore (токен) + AsyncStorage (кэши) | Секреты отдельно от кэшей |
| Бэкенд | PHP + SQLite существующего сайта + новый роутер | Не плодить второй бэкенд; общие users/orders с сайтом |
| Push | expo-notifications → Expo Push API → FCM/APNs | Один канал для Android и iOS |
| Тесты | jest-expo + @testing-library/react-native, `tsc --noEmit` | Логика в чистых функциях → дешёвые unit-тесты |
| Патчи | patch-package (postinstall) | Фиксы node_modules коммитятся и воспроизводятся |

---

## 2. Структура репозитория (скелет)

Копируется 1:1; `<brand>` — имя нового проекта.

```
<brand>_mobile_app/
├── app.json                  # ПАРАМЕТРЫ: name, slug, scheme, bundle id, package, иконки, projectId
├── package.json              # копировать как есть (main: expo-router/entry)
├── tsconfig.json, eslint.config.js, jest.setup.js
├── .env.example              # EXPO_PUBLIC_API_URL=https://staging.<brand>.ru/api/mobile.php
├── patches/                  # patch-package фиксы (переносить как есть, пока версии RN совпадают)
├── android/  ios/            # bare-проекты (генерятся `npx expo prebuild`, потом коммитятся)
├── assets/
│   ├── images/               # icon, splash, favicon, adaptive-icon — ЗАМЕНИТЬ на бренд
│   └── brand/                # исходники (svg) иконок
├── src/
│   ├── app/                  # === РОУТЫ (expo-router) ===
│   │   ├── _layout.tsx       # корень: провайдеры + Stack + push-навигация
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx   # нижние табы
│   │   │   ├── index.tsx     # Главная
│   │   │   ├── catalog.tsx   # Каталог
│   │   │   ├── cart.tsx      # Корзина
│   │   │   ├── orders.tsx    # Заказы
│   │   │   └── profile.tsx   # Профиль
│   │   ├── auth/             # login / register / reset (email-код)
│   │   ├── product/[id].tsx  # карточка товара
│   │   ├── order/[id].tsx    # детали заказа
│   │   ├── favorites.tsx
│   │   └── notifications.tsx
│   ├── features/             # === ДОМЕНЫ (см. §4) ===
│   │   ├── session/          # auth: context + errors
│   │   ├── catalog/          # каталог: repository, фильтры, группировка, карточка
│   │   ├── cart/             # корзина: reducer, checkout-payload, upsell
│   │   ├── orders/           # заказы: repository, статусы
│   │   ├── favorites/        # избранное: storage + context
│   │   ├── notifications/    # push: register-device, router, storage, context
│   │   └── home/             # главная: app-config, прайс-лист
│   ├── lib/                  # === ЯДРО (см. §3) ===
│   │   ├── api.ts            # единственная точка HTTP
│   │   ├── token-storage.ts  # (+ .web.ts) SecureStore/localStorage
│   │   ├── storage.ts        # AsyncStorage-обёртки с версией схемы
│   │   ├── theme.ts  safe-area.ts
│   │   ├── components/  hooks/  constants/theme.ts   # UI-кит, тема
│   │   └── global.css        # web-стили
├── __tests__/                # unit-тесты (плоская папка, jest-expo)
├── server-src/               # === РАБОЧАЯ КОПИЯ СЕРВЕРНОГО PHP (см. §6) ===
│   ├── api/mobile.php        # роутер приложения
│   ├── api/auth.php          # роутер сайта (переиспользуется)
│   ├── api/lib/              # общая логика: mobile_auth, password_reset, push, ...
│   ├── db/init.php           # getDB() + идемпотентные миграции
│   └── tests/                # PHP-тесты (гоняются на сервере на temp SQLite)
├── web/                      # статика сайта: страница установки APK, privacy, robots
├── scripts/                  # деплой (Python+paramiko), креды из ~/.<brand>-deploy.json
└── docs/                     # START-HERE, playbook, этот шаблон, спеки/планы
```

**Правило зависимостей:** `app → features → lib`. Features не импортируют друг из
друга ничего, кроме `types` и чистых функций (пример: cart использует
`catalog/product-title`). `lib` не знает ни о features, ни об экранах.

---

## 3. Ядро `src/lib` — копировать без изменений

### 3.1 `api.ts` — единственная точка HTTP

Весь сетевой код приложения — одна функция. Контракт:

```ts
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://<brand>.ru/api/mobile.php';

export async function api<T>(
  action: string,                       // ?action=... — имя эндпоинта
  init: RequestInit = {},               // method/body
  query: Record<string, string> = {},   // доп. query-параметры
  options: { timeoutMs?: number } = {}, // таймаут (деф. 15с, AbortController)
): Promise<T>
```

Обязанности (в этом порядке, всё уже реализовано в `src/lib/api.ts`):
1. Подставляет `Authorization: Bearer <token>` из tokenStorage.
2. Таймаут через AbortController + поддержка внешнего `signal`.
3. Ошибки нормализует в `Error` с `data.code`:
   `REQUEST_TIMEOUT` / `NETWORK_ERROR` / `HTTP_<status>` / серверный `code`.
4. **HTTP 401 → код `SESSION_EXPIRED` + автоматически чистит токен.** Это единственное
   место, где сессия «умирает»; features просто ловят этот код.
5. Терпит не-JSON ответы (упавший PHP отдаёт HTML) — не бросает исключение парсера.

### 3.2 Хранилища

- `token-storage.ts` — SecureStore, три метода `get/set/clear`. `.web.ts` — вариант
  на localStorage (Metro сам подставит по платформе).
- `storage.ts` — AsyncStorage-обёртки. Кэш каталога заворачивается в конверт
  `{ savedAt, schemaVersion, snapshot }` + type-guard при чтении: битый/старый кэш
  молча отбрасывается, не роняя приложение. **Ключи с префиксом бренда**
  (`<brand>.catalog-cache`, `<brand>.cart`, `<brand>.mobile-token`).

### 3.3 Тема

`constants/theme.ts`: объект `Colors.light/dark` + системные шрифты через
`Platform.select`. Компоненты `themed-text` / `themed-view` + хук `use-theme`.
**Это главная точка ребрендинга** — палитра меняется в одном файле.

---

## 4. Feature-модуль: анатомия (главный паттерн)

Каждый домен в `src/features/<name>/` собирается из четырёх видов файлов:

```
features/catalog/
├── types.ts                 # 1. Типы домена (Product, CatalogSnapshot)
├── catalog-repository.ts    # 2. Repository: загрузка с offline-fallback (DI для тестов)
├── filter-products.ts       # 3. Чистые функции: фильтры, группировка, заголовки,
│   group-products.ts        #    quick-filters, stock-badge... (ни одного импорта React)
├── catalog-context.tsx      # 4. Context/Provider: склеивает 1–3 с React-состоянием
└── ProductCard.tsx          #    (опц.) компоненты, специфичные для домена
```

**Repository с инъекцией зависимостей** — образец офлайн-стратегии:

```ts
type Dependencies = {
  fetchRemote: () => Promise<CatalogSnapshot>;
  readCache: () => Promise<CatalogSnapshot | null>;
  writeCache: (snapshot: CatalogSnapshot) => Promise<unknown>;
};

export async function loadCatalog(deps: Dependencies = defaults) {
  try {
    const snapshot = await deps.fetchRemote();
    await deps.writeCache(snapshot);
    return { snapshot, offline: false };        // сеть есть → обновили кэш
  } catch (error) {
    const snapshot = await deps.readCache();
    if (!snapshot) throw error;                 // ни сети, ни кэша → ошибка на экран
    return { snapshot, offline: true };         // офлайн → показываем кэш + баннер
  }
}
```

**Context-провайдер** — тонкий: хранит state, вызывает repository/чистые функции,
экспортирует хук с guard'ом:

```ts
export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('useCatalog must be used inside CatalogProvider');
  return value;
}
```

**Корзина** — вариация того же паттерна: `cart-reducer.ts` (чистый reducer +
селекторы `cartItemsCount`, `cartQuantityByProductId`), контекст на `useReducer`,
гидрация из AsyncStorage при старте (`hydrated`-флаг, чтобы не перезаписать
хранилище пустым состоянием), автосохранение по `useEffect [items]`.

**Session** — эталон auth-потока (`session-context.tsx`):
- при старте и при возврате из фона (AppState) → `refreshProfile()`;
- **сеть упала ≠ разлогин**: токен чистится ТОЛЬКО на `SESSION_EXPIRED`;
- `login/register/resetPassword` → сохранить токен → setUser → фоново
  зарегистрировать девайс для push (ошибки push глотаются — не блокируют вход);
- `logout/deleteAccount` → `try { api } finally { очистить токен + user }` —
  локальный выход происходит даже без сети.

---

## 5. Корневой layout и порядок провайдеров

`src/app/_layout.tsx` — копировать структуру как есть:

```tsx
<SafeAreaProvider>
  <SessionProvider>          {/* 1. auth — нужен всем ниже */}
    <CatalogProvider>        {/* 2. каталог — нужен корзине (цены/наличие) */}
      <CartProvider>
        <FavoritesProvider>
          <NotificationsProvider>
            <StatusBar />
            <NotificationNavigation />   {/* тап по push → router.push(target) */}
            <Stack>…</Stack>
          </NotificationsProvider>
        </FavoritesProvider>
      </CartProvider>
    </CatalogProvider>
  </SessionProvider>
</SafeAreaProvider>
```

Push-навигация: `notification-router.ts` — чистая функция `notificationTarget(data)`,
маппит payload уведомления на внутренний роут (`/order/[id]`) или внешний URL.

**Платформенные ветки** — через суффиксы файлов, не через `if (Platform.OS)`:
`token-storage.ts` / `token-storage.web.ts`, `app-tabs.tsx` / `app-tabs.web.tsx`,
`price-list-download.ts` / `.web.ts`. Компоненты импортируют путь без суффикса.

---

## 6. Контракт клиент ↔ сервер (переносится дословно)

Один endpoint: `https://<brand>.ru/api/mobile.php?action=<name>`.

**Конверт ответа:** успех `{ ok: true, ...data }`, ошибка
`{ ok: false, code: 'МАШИННЫЙ_КОД' }` + честный HTTP-статус. Клиент показывает
тексты сам по `code` — сервер человеческих сообщений не шлёт (i18n на клиенте).

**Базовый набор actions** (ядро одинаково для любого магазина/каталога):

| action | метод | auth | назначение |
|---|---|---|---|
| `catalog` | GET | — | снапшот каталога: `{version: sha256, updated_at, products[]}` |
| `register` / `login` / `logout` | POST | —/—/✓ | `{token, user}`; телефон нормализуется на сервере |
| `profile` | GET | ✓ | `{user}` — используется как проверка живости токена |
| `create_order` | POST | ✓ | сервер ре-валидирует цены/наличие → `CATALOG_CHANGED` / `PRODUCT_UNAVAILABLE` |
| `orders` / `order` | GET | ✓ | список / детали |
| `repeat_order` / `cancel_order` | POST | ✓ | действия над заказом |
| `register_device` / `notification_preferences` / `remove_device` | POST/GET | ✓ | push-девайсы и настройки |
| `request_password_reset` / `reset_password` | POST | — | email-код (см. playbook §6) |
| `update_email` / `delete_account` | POST | ✓ | профиль; delete_account обязателен для App Store (5.1.1(v)) |

**Ключевые коды ошибок**, на которые завязан клиент: `SESSION_EXPIRED` (только он
разлогинивает), `AUTH_REQUIRED`, `INVALID_CREDENTIALS`, `INVALID_REGISTRATION`,
`CATALOG_CHANGED`, `PRODUCT_UNAVAILABLE`, `REQUEST_TIMEOUT`, `NETWORK_ERROR`.

---

## 7. Серверный скелет (PHP + SQLite)

### 7.1 Роутер `api/mobile.php`

Плоский однофайловый роутер (~250 строк): CORS-заголовки, три хелпера
(`body()` — JSON из php://input, `ok()` / `fail()` — конверт), цепочка
`if ($action === '...')`. Вся переиспользуемая логика — в `api/lib/*`, общих
с роутером сайта `auth.php`.

### 7.2 Bearer-авторизация `api/lib/mobile_auth.php` (копировать как есть)

- Токен: `bin2hex(random_bytes(32))`, в БД **только sha256-хэш**, срок 90 дней,
  таблица `mobile_sessions(user_id, token_hash, expires_at)`.
- `bearerToken()` — достаёт из `Authorization` (с fallback на `getallheaders()` —
  Apache иногда прячет заголовок).
- `requireMobileUser()` — бросает `AUTH_REQUIRED`; `revokeMobileToken()` — logout.
- Пароли: `password_hash` / `password_verify` (bcrypt). Сайт продолжает жить на
  PHP-сессиях — механизмы не смешиваются, users общие.

### 7.3 БД: базовая схема + идемпотентные миграции

`db/init.php`: `getDB()` (PDO, `getenv('DB_PATH')` для подмены в тестах) + миграции,
безопасные для существующих данных: `CREATE TABLE IF NOT EXISTS`,
`PRAGMA table_info()` + `ALTER TABLE ADD COLUMN` в `try{}` — выполняются на каждом
старте.

Базовые таблицы шаблона:

```
users(id, name, phone UNIQUE, email, telegram, role, password_hash, created_at)
mobile_sessions(id, user_id, token_hash, expires_at)
orders(id, user_id, status, total, comment, created_at)  + order_items(...)
devices(id, user_id, expo_token UNIQUE, platform, *_enabled флаги настроек)
password_resets(id, user_id, code_hash, expires_at, attempts, used_at)
app_settings(key, value)          -- флаги поэтапного выката (email_required и т.п.)
push_campaigns / push_deliveries  -- лог рассылок
```

### 7.4 Push-конвейер

```
событие на сервере (смена статуса заказа / кампания из админки)
  → api/lib/push.php → POST https://exp.host/--/api/v2/push/send
  → Expo Push → FCM (Android) / APNs (iOS)
  → клиент: notification-router.ts → router.push('/order/123')
```

Фильтрация получателей — по флагам настроек в `devices`. Доставки логируются.

---

## 8. Тестирование (три уровня)

1. **Чистые функции** (`__tests__/*.test.ts`) — основная масса: reducer'ы, фильтры,
   репозитории с подменёнными Dependencies, notification-router, api-обёртка
   (fetch мокается). Именно ради этого логика вынесена из компонентов.
2. **Компонентные** (`*.test.tsx`, @testing-library/react-native) — экраны с
   замоканными контекстами. Новый метод в контексте → обновить мок, иначе tsc красный.
3. **Серверные PHP** (`server-src/tests/`) — гоняются по SSH на сервере против
   временной SQLite (`DB_PATH=/tmp/...`), прод не трогают.

Гейт перед коммитом: `npm run typecheck && npm test`; перед деплоем PHP: `php -l`
всех файлов + дымовой тест реальными HTTP-запросами (потом удалить тест-данные).

---

## 9. Чеклист клонирования под новый сайт

### Шаг A. Что меняется (параметры шаблона)

| Что | Где |
|---|---|
| Имя, slug, scheme, bundleIdentifier, package, versionCode | `app.json` (+ `android/app/build.gradle`) |
| EAS projectId, owner | `app.json → extra.eas` (новый `eas init`) |
| Иконки, splash, favicon, цвет adaptiveIcon | `assets/images/`, `assets/brand/` |
| Палитра и шрифты | `src/constants/theme.ts`, `src/global.css` |
| API URL (prod + staging) | `src/lib/api.ts` (дефолт) + `.env.example` |
| Префиксы ключей хранилищ | `src/lib/storage.ts`, `token-storage*.ts`, `register-device.ts` |
| `google-services.json` (FCM) + APNs-ключ | новый Firebase-проект / Apple Developer |
| Тексты: названия табов, ошибки, пустые состояния | экраны в `src/app/`, `errorMessage()` в cart |
| Домен в web-статике (privacy, страница установки, robots) | `web/` |
| Деплой-креды | `~/.<brand>-deploy.json` (вне репо!) |

### Шаг B. Что адаптируется под предметную область

- `features/catalog/types.ts` — поля Product под новый сайт; следом фильтры/группировка.
- Серверный `lib/catalog.php` — откуда сайт берёт товары (файл/таблица).
- Статусы заказов (`features/orders/order-status.ts` + сервер).
- Набор actions: ядро из §6 оставить, нишевые (прайс-лист, upsell) — по необходимости.

### Шаг C. Что НЕ трогать (несущие стены)

- `lib/api.ts` — конверт, таймауты, обработка 401.
- `mobile_auth.php`, схема сессий, идемпотентные миграции.
- Паттерн feature-модуля и порядок провайдеров в `_layout.tsx`.
- Офлайн-стратегия (repository с fallback на кэш, конверт с schemaVersion).
- Session-логика «сеть упала ≠ разлогин».
- patch-package-патчи и `.gitattributes` (пока не обновлён RN).

### Шаг D. Порядок работ (проверенный)

1. Скопировать репо-скелет, выполнить шаг A (бренд/идентификаторы/ключи).
2. На сервере нового сайта: залить `db/init.php`-миграции + `mobile.php` с ядром
   actions (§6), проверить `catalog` и `login` curl'ом.
3. Клиент: обновить типы каталога → каталог отображается → корзина/checkout →
   заказы → auth-экраны → push. После каждого шага `typecheck + jest`.
4. Сборка/подпись/выкладка — строго по `mobile-app-playbook.md`
   (VPN, keystore + офлайн-бэкап, страница установки, RuStore, iOS через EAS).
5. Завести `docs/START-HERE.md` нового проекта с первого дня.
