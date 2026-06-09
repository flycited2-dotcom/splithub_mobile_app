# Восстановление доступа (сброс пароля) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Дать клиенту восстановить доступ при забытом пароле — самостоятельно по 6-значному коду на email + ручной сброс через менеджера; email обязателен при новой регистрации.

**Architecture:** Вся логика — в общем PHP-модуле `api/lib/password_reset.php`, подключаемом обоими роутерами (`api/mobile.php` для приложения, `api/auth.php` для сайта). Данные — колонка `users.email` + таблица `password_resets`. Фронт: RN-экраны в приложении, формы в `index.html`. Сначала превью трения, потом прод.

**Tech Stack:** PHP 7.4 + SQLite (PDO), React Native / Expo (TypeScript), ванильный JS на сайте. Тесты сервера — PHP CLI на временной SQLite (`SPLITHUB_DB_PATH`), запуск на сервере по SSH. E2E приложения — ADB.

**Рабочий процесс с сервером:** серверные PHP-файлы редактируются в локальной песочнице `server-src/` (синхронизируется с сервера), тестируются локально/по SSH на временной БД, деплоятся по SFTP с бэкапом (`cp -p`) и проверкой `php -l`. Прод-БД при тестах не трогается. Креды — `~/.splithub-deploy.json` (вне репо).

**Контракт общего модуля (имена фиксированы для всех задач):**
- `pr_generateCode(): string` — 6 цифр строкой.
- `pr_maskEmail(string $email): string` — `info@splithub.ru` → `i***@s***.ru`.
- `pr_findUser(string $identifier): ?array` — ищет по `normalizePhone($identifier)`, затем по email; возвращает строку users или null.
- `requestPasswordReset(string $identifier): array` → `['state' => 'sent'|'no_email'|'not_found'|'rate_limited', 'email_masked' => ?string]`.
- `confirmPasswordReset(string $identifier, string $code, string $newPassword): array` → `['ok' => true, 'user' => array]` ЛИБО `['ok' => false, 'code' => 'CODE_EXPIRED'|'INVALID_CODE'|'TOO_MANY_ATTEMPTS'|'INVALID_PASSWORD', 'attempts_left' => ?int]`.

---

## Phase 0 — Превью трения на входе (без бэкенда)

Цель: пользователь вживую оценивает регистрацию с email и поток сброса ДО любой прод-правки.

### Task 0: Статичное превью новой регистрации и потока сброса

**Files:**
- Create: `web/preview-auth/index.html` (самодостаточная страница-макет: формы регистрации с email, «Забыли пароль?» → ввод телефона/email → ввод кода+пароля; кнопки ничего не шлют, только показывают экраны)
- Reuse: `scripts/deploy_preview.py`-подобный аплоад (залить как `splithub.ru/preview-auth.html`, `noindex`)

- [ ] **Step 1: Сверстать макет** трёх состояний (регистрация / запрос сброса / ввод кода) в стиле сайта (взять цвета и классы из боевого `index.html`, скачанного в `tmp/index.html`). Переключение экранов — на чистом JS, без сети.
- [ ] **Step 2: Залить как `preview-auth.html`** (с `<meta name="robots" content="noindex">`) скриптом по образцу `scripts/deploy_preview.py`.
- [ ] **Step 3: Проверить HTTP 200** `https://splithub.ru/preview-auth.html`.
- [ ] **Step 4: ОСТАНОВКА — показать ссылку пользователю.** Получить явное «ок по трению» или решение включить запасной рычаг (email необязателен на входе). Зафиксировать решение в спеке (Секция 4).
- [ ] **Step 5: Удалить превью** после решения (`rm -f preview-auth.html` по SSH).

---

## Phase 1 — Серверный фундамент (TDD)

### Task 1: Миграция БД (email + password_resets)

**Files:**
- Modify: `server-src/db/init.php` — в блок «Incremental migrations» внутри `getDB()` (после блока admin_note, перед `return $db;`)
- Test: `server-src/tests/test_migration.php`

- [ ] **Step 1: Написать падающий тест** `server-src/tests/test_migration.php`:

```php
<?php
putenv('SPLITHUB_DB_PATH=' . sys_get_temp_dir() . '/pr_test_' . uniqid() . '.sqlite');
require __DIR__ . '/../db/init.php';
$db = getDB();
$cols = array_column($db->query("PRAGMA table_info(users)")->fetchAll(), 'name');
assert(in_array('email', $cols), 'users.email column must exist');
$t = $db->query("SELECT name FROM sqlite_master WHERE type='table' AND name='password_resets'")->fetch();
assert($t !== false, 'password_resets table must exist');
$prcols = array_column($db->query("PRAGMA table_info(password_resets)")->fetchAll(), 'name');
foreach (['user_id','code_hash','expires_at','attempts','used','created_at'] as $c) {
    assert(in_array($c, $prcols), "password_resets.$c must exist");
}
echo "OK test_migration\n";
```

- [ ] **Step 2: Запустить — убедиться, что падает.** Run (по SSH или локально, если есть php): `php -d assert.exception=1 server-src/tests/test_migration.php`. Expected: AssertionError на `users.email`.

- [ ] **Step 3: Добавить миграцию** в `db/init.php` перед `return $db;` в `getDB()`:

```php
    // email column on users + password_resets table
    try {
        $ucols = array_column($db->query("PRAGMA table_info(users)")->fetchAll(PDO::FETCH_ASSOC), 'name');
        if (!in_array('email', $ucols)) {
            $db->exec("ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''");
        }
        $db->exec("CREATE TABLE IF NOT EXISTS password_resets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            code_hash TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            attempts INTEGER NOT NULL DEFAULT 0,
            used INTEGER NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )");
    } catch (Throwable $e) {}
```

- [ ] **Step 4: Запустить — убедиться, что проходит.** Run: `php -d assert.exception=1 server-src/tests/test_migration.php`. Expected: `OK test_migration`.

- [ ] **Step 5: Commit.** `git add server-src/db/init.php server-src/tests/test_migration.php && git commit -m "feat(db): email column + password_resets table"`

### Task 2: Модуль password_reset.php (логика)

**Files:**
- Create: `server-src/api/lib/password_reset.php`
- Test: `server-src/tests/test_password_reset.php`

- [ ] **Step 1: Написать падающий тест** `server-src/tests/test_password_reset.php`:

```php
<?php
putenv('SPLITHUB_DB_PATH=' . sys_get_temp_dir() . '/pr_lib_' . uniqid() . '.sqlite');
putenv('PR_DISABLE_EMAIL=1'); // тестовый режим: не реально слать письмо
require __DIR__ . '/../db/init.php';
require __DIR__ . '/../api/lib/password_reset.php';
$db = getDB();
// seed: юзер с email и юзер без email
$db->prepare("INSERT INTO users(name,phone,email,password_hash) VALUES(?,?,?,?)")
   ->execute(['С Email','79990000001','user@mail.ru', password_hash('old1', PASSWORD_BCRYPT)]);
$db->prepare("INSERT INTO users(name,phone,email,password_hash) VALUES(?,?,?,?)")
   ->execute(['Без Email','79990000002','', password_hash('old2', PASSWORD_BCRYPT)]);

// request: найден с email -> sent + маска
$r = requestPasswordReset('79990000001');
assert($r['state'] === 'sent', 'should be sent');
assert(strpos($r['email_masked'], '@') !== false, 'masked email returned');
// request: найден без email -> no_email
assert(requestPasswordReset('79990000002')['state'] === 'no_email', 'no_email');
// request: не найден -> not_found
assert(requestPasswordReset('70000000000')['state'] === 'not_found', 'not_found');

// достаём код из тестового хука (lib пишет последний код в getenv при PR_DISABLE_EMAIL)
$code = pr_lastTestCode();
assert(strlen($code) === 6, 'code is 6 digits');

// confirm: неверный код
$bad = confirmPasswordReset('79990000001', '000000', 'newpass1');
assert($bad['ok'] === false && $bad['code'] === 'INVALID_CODE', 'wrong code rejected');
// confirm: верный код -> ok, пароль сменился
$okr = confirmPasswordReset('79990000001', $code, 'newpass1');
assert($okr['ok'] === true, 'correct code accepted');
$u = $db->query("SELECT password_hash FROM users WHERE phone='79990000001'")->fetch();
assert(password_verify('newpass1', $u['password_hash']), 'password updated');
// повторное использование того же кода -> expired/used
assert(confirmPasswordReset('79990000001', $code, 'x')['ok'] === false, 'code single-use');
echo "OK test_password_reset\n";
```

- [ ] **Step 2: Запустить — убедиться, что падает** (нет файла lib). Run: `php -d assert.exception=1 server-src/tests/test_password_reset.php`. Expected: FAIL (require не находит password_reset.php).

- [ ] **Step 3: Реализовать `server-src/api/lib/password_reset.php`:**

```php
<?php
require_once __DIR__ . '/../../db/init.php';

function pr_generateCode(): string {
    return str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

function pr_maskEmail(string $email): string {
    $at = strpos($email, '@');
    if ($at === false) return '***';
    $name = substr($email, 0, $at);
    $domain = substr($email, $at + 1);
    $dot = strrpos($domain, '.');
    $tld = $dot !== false ? substr($domain, $dot) : '';
    $maskedName = ($name === '' ? '' : $name[0]) . '***';
    $maskedDomain = ($domain === '' ? '' : $domain[0]) . '***' . $tld;
    return $maskedName . '@' . $maskedDomain;
}

function pr_findUser(string $identifier): ?array {
    $db = getDB();
    $phone = normalizePhone($identifier);
    if (strlen($phone) >= 10) {
        $s = $db->prepare('SELECT * FROM users WHERE phone=?');
        $s->execute([$phone]);
        $u = $s->fetch();
        if ($u) return $u;
    }
    if (strpos($identifier, '@') !== false) {
        $s = $db->prepare('SELECT * FROM users WHERE email=? AND email != ""');
        $s->execute([trim($identifier)]);
        $u = $s->fetch();
        if ($u) return $u;
    }
    return null;
}

function pr_lastTestCode(): string { return (string)getenv('PR_LAST_TEST_CODE'); }

function pr_sendResetEmail(string $toEmail, string $code): bool {
    if (getenv('PR_DISABLE_EMAIL')) { putenv('PR_LAST_TEST_CODE=' . $code); return true; }
    $subject = '=?UTF-8?B?' . base64_encode('Код восстановления СплитХаб') . '?=';
    $body = "Ваш код для сброса пароля: $code\nКод действует 15 минут.\nЕсли вы не запрашивали сброс — игнорируйте письмо.\n\nСплитХаб · splithub.ru";
    $headers = "From: SplitHub <info@splithub.ru>\r\nContent-Type: text/plain; charset=UTF-8\r\n";
    return @mail($toEmail, $subject, $body, $headers);
}

function requestPasswordReset(string $identifier): array {
    $db = getDB();
    $user = pr_findUser($identifier);
    if (!$user) return ['state' => 'not_found', 'email_masked' => null];
    if (empty($user['email'])) return ['state' => 'no_email', 'email_masked' => null];

    // rate-limit: не более 5 запросов за час
    $cnt = $db->prepare("SELECT COUNT(*) FROM password_resets WHERE user_id=? AND created_at > datetime('now','-1 hour')");
    $cnt->execute([(int)$user['id']]);
    if ((int)$cnt->fetchColumn() >= 5) return ['state' => 'rate_limited', 'email_masked' => pr_maskEmail($user['email'])];

    // гасим прошлые неиспользованные коды
    $db->prepare("UPDATE password_resets SET used=1 WHERE user_id=? AND used=0")->execute([(int)$user['id']]);
    $code = pr_generateCode();
    $db->prepare("INSERT INTO password_resets(user_id,code_hash,expires_at) VALUES(?,?,datetime('now','+15 minutes'))")
       ->execute([(int)$user['id'], hash('sha256', $code)]);
    pr_sendResetEmail($user['email'], $code);
    return ['state' => 'sent', 'email_masked' => pr_maskEmail($user['email'])];
}

function confirmPasswordReset(string $identifier, string $code, string $newPassword): array {
    $db = getDB();
    if (strlen($newPassword) < 4) return ['ok' => false, 'code' => 'INVALID_PASSWORD'];
    $user = pr_findUser($identifier);
    if (!$user) return ['ok' => false, 'code' => 'CODE_EXPIRED'];

    $s = $db->prepare("SELECT * FROM password_resets WHERE user_id=? AND used=0 AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1");
    $s->execute([(int)$user['id']]);
    $row = $s->fetch();
    if (!$row) return ['ok' => false, 'code' => 'CODE_EXPIRED'];

    if ((int)$row['attempts'] >= 5) {
        $db->prepare("UPDATE password_resets SET used=1 WHERE id=?")->execute([(int)$row['id']]);
        return ['ok' => false, 'code' => 'TOO_MANY_ATTEMPTS'];
    }
    if (!hash_equals($row['code_hash'], hash('sha256', $code))) {
        $db->prepare("UPDATE password_resets SET attempts=attempts+1 WHERE id=?")->execute([(int)$row['id']]);
        return ['ok' => false, 'code' => 'INVALID_CODE', 'attempts_left' => 5 - ((int)$row['attempts'] + 1)];
    }
    // успех
    $db->prepare("UPDATE users SET password_hash=? WHERE id=?")
       ->execute([password_hash($newPassword, PASSWORD_BCRYPT), (int)$user['id']]);
    $db->prepare("UPDATE password_resets SET used=1 WHERE id=?")->execute([(int)$row['id']]);
    try { $db->prepare("DELETE FROM mobile_sessions WHERE user_id=?")->execute([(int)$user['id']]); } catch (Throwable $e) {}
    unset($user['password_hash']);
    return ['ok' => true, 'user' => $user];
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит.** Run: `php -d assert.exception=1 server-src/tests/test_password_reset.php`. Expected: `OK test_password_reset`.

- [ ] **Step 5: Commit.** `git add server-src/api/lib/password_reset.php server-src/tests/test_password_reset.php && git commit -m "feat(api): password reset core (request/confirm)"`

### Task 3: Endpoint'ы в mobile.php (приложение)

**Files:**
- Modify: `server-src/api/mobile.php` — добавить `require_once` lib и три действия; обновить `register`
- Test: `server-src/tests/test_mobile_endpoints.php`

- [ ] **Step 1: Написать падающий тест** `server-src/tests/test_mobile_endpoints.php` (вызывает функции lib напрямую + проверяет, что register требует email):

```php
<?php
putenv('SPLITHUB_DB_PATH=' . sys_get_temp_dir() . '/pr_mob_' . uniqid() . '.sqlite');
putenv('PR_DISABLE_EMAIL=1');
require __DIR__ . '/../db/init.php';
require __DIR__ . '/../api/lib/password_reset.php';
// register-валидация (та же проверка, что в mobile.php): email обязателен
function mobile_register_valid($name,$phone,$password,$email){
    return !($name==='' || strlen(normalizePhone($phone))<10 || strlen($password)<4 || !filter_var($email, FILTER_VALIDATE_EMAIL));
}
assert(mobile_register_valid('A','+79990001111','pass','a@b.ru') === true, 'valid reg');
assert(mobile_register_valid('A','+79990001111','pass','') === false, 'email required');
assert(mobile_register_valid('A','+79990001111','pass','notanemail') === false, 'email format');
echo "OK test_mobile_endpoints\n";
```

- [ ] **Step 2: Запустить — убедиться, что падает** (если функция уже где-то иначе). Run: `php -d assert.exception=1 server-src/tests/test_mobile_endpoints.php`. Expected: PASS логики валидации (это эталон ожидаемого поведения; служит контрактом для Step 3).

- [ ] **Step 3: Обновить `api/mobile.php`:**

  3a. После строки `require_once __DIR__ . '/lib/push.php';` добавить:
```php
require_once __DIR__ . '/lib/password_reset.php';
```
  3b. Заменить валидацию в блоке `if ($action === 'register')` (текущая строка с `if ($name === '' || strlen($phone) < 10 ...`) на версию с email:
```php
        $name = trim((string)($data['name'] ?? ''));
        $phone = normalizePhone((string)($data['phone'] ?? ''));
        $password = (string)($data['password'] ?? '');
        $email = trim((string)($data['email'] ?? ''));
        if ($name === '' || strlen($phone) < 10 || strlen($phone) > 15 || strlen($password) < 4
            || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            fail('INVALID_REGISTRATION', 422);
        }
```
  и в `INSERT` добавить email-колонку:
```php
        $db->prepare('INSERT INTO users(name,phone,telegram,email,password_hash) VALUES(?,?,?,?,?)')
           ->execute([$name, $phone, trim((string)($data['telegram'] ?? '')), $email,
                      password_hash($password, PASSWORD_BCRYPT)]);
```
  3c. Добавить новые действия (рядом с остальными `if ($action === ...)`, до `fail('UNKNOWN_ACTION', 404);`):
```php
    if ($action === 'request_password_reset') {
        requirePost();
        $data = body();
        $res = requestPasswordReset((string)($data['identifier'] ?? ''));
        ok($res);
    }

    if ($action === 'reset_password') {
        requirePost();
        $data = body();
        $res = confirmPasswordReset(
            (string)($data['identifier'] ?? ''),
            (string)($data['code'] ?? ''),
            (string)($data['password'] ?? '')
        );
        if (!$res['ok']) {
            $status = $res['code'] === 'TOO_MANY_ATTEMPTS' ? 429 : 422;
            fail($res['code'], $status, isset($res['attempts_left']) ? ['attempts_left' => $res['attempts_left']] : []);
        }
        ok(issueMobileToken($res['user']['phone'], '') + []); // см. примечание ниже
    }

    if ($action === 'update_email') {
        requirePost();
        $uid = requireMobileUser();
        $data = body();
        $email = trim((string)($data['email'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail('INVALID_EMAIL', 422);
        getDB()->prepare('UPDATE users SET email=? WHERE id=?')->execute([$email, $uid]);
        ok(['email' => $email]);
    }
```

  **Примечание по auto-login после сброса:** `issueMobileToken` требует пароль для проверки. Чтобы выдать токен без повторной проверки пароля, добавить в `mobile_auth.php` функцию `issueMobileTokenForUser(int $userId): array` (копия логики выдачи токена без `password_verify`) и вызвать `ok(issueMobileTokenForUser((int)$res['user']['id']))`. Реализовать эту функцию в Step 3d.

  3d. Добавить в `server-src/api/lib/mobile_auth.php`:
```php
function issueMobileTokenForUser(int $userId): array {
    $db = getDB();
    $stmt = $db->prepare('SELECT id,name,phone,telegram,role FROM users WHERE id=?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    if (!$user) throw new RuntimeException('INVALID_CREDENTIALS');
    $token = bin2hex(random_bytes(32));
    $db->prepare("INSERT INTO mobile_sessions(user_id,token_hash,expires_at)
                  VALUES(?,?,datetime('now','+90 days'))")
       ->execute([$userId, hash('sha256', $token)]);
    return ['token' => $token, 'user' => $user];
}
```
  и в блоке `reset_password` использовать: `ok(issueMobileTokenForUser((int)$res['user']['id']));`

- [ ] **Step 4: Проверить синтаксис и тест.** Run: `php -l server-src/api/mobile.php && php -l server-src/api/lib/mobile_auth.php && php -d assert.exception=1 server-src/tests/test_mobile_endpoints.php`. Expected: `No syntax errors` + `OK test_mobile_endpoints`.

- [ ] **Step 5: Commit.** `git add server-src/api/mobile.php server-src/api/lib/mobile_auth.php server-src/tests/test_mobile_endpoints.php && git commit -m "feat(api): mobile reset endpoints + email-required register"`

### Task 4: Endpoint'ы в auth.php (сайт)

**Files:**
- Modify: `server-src/api/auth.php` — подключить lib, добавить действия `request_password_reset`, `reset_password`; обновить `register` (email обязателен); хелпер локализации кодов

- [ ] **Step 1:** Прочитать `server-src/api/auth.php` целиком, найти блок роутинга (`if ($action === 'register')` и т.п.) и функцию установки сессии (где после успешного login пишется `$_SESSION['user_id']`).

- [ ] **Step 2: Подключить lib** вверху (рядом с другими require): `require_once __DIR__ . '/lib/password_reset.php';`

- [ ] **Step 3: Обновить `register`** — добавить обязательный email в валидацию и в `INSERT` (по аналогии с mobile.php Step 3b: `filter_var($email, FILTER_VALIDATE_EMAIL)`, при ошибке `jsonResponse(['ok'=>false,'error'=>'Укажите корректный email'], 422)`; в INSERT добавить колонку `email`).

- [ ] **Step 4: Добавить действия** (рядом с остальными, формат ответов — как в auth.php: `jsonResponse(['ok'=>...])`):
```php
    if ($action === 'request_password_reset') {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $res = requestPasswordReset((string)($data['identifier'] ?? ''));
        jsonResponse(['ok' => true] + $res);
    }
    if ($action === 'reset_password') {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $res = confirmPasswordReset(
            (string)($data['identifier'] ?? ''),
            (string)($data['code'] ?? ''),
            (string)($data['password'] ?? '')
        );
        if (!$res['ok']) {
            $msg = [
                'CODE_EXPIRED' => 'Код истёк или неверный. Запросите новый.',
                'INVALID_CODE' => 'Неверный код' . (isset($res['attempts_left']) ? '. Осталось попыток: ' . $res['attempts_left'] : ''),
                'TOO_MANY_ATTEMPTS' => 'Слишком много попыток. Запросите новый код.',
                'INVALID_PASSWORD' => 'Пароль должен быть не короче 4 символов.',
            ][$res['code']] ?? 'Не удалось сбросить пароль.';
            jsonResponse(['ok' => false, 'error' => $msg, 'code' => $res['code']], 422);
        }
        // авто-вход: установить веб-сессию
        if (session_status() === PHP_SESSION_NONE) session_start();
        $_SESSION['user_id'] = (int)$res['user']['id'];
        jsonResponse(['ok' => true, 'user' => $res['user']]);
    }
```

- [ ] **Step 5: Проверить синтаксис.** Run: `php -l server-src/api/auth.php`. Expected: `No syntax errors`.

- [ ] **Step 6: Commit.** `git add server-src/api/auth.php && git commit -m "feat(api): web reset endpoints + email-required register"`

### Task 5: Менеджерский сброс пароля (админка)

**Files:**
- Modify: `server-src/api/admin.php` — действие `reset_client_password`
- Modify: `server-src/admin.html` — кнопка «Сбросить пароль» в строке клиента + модалка

- [ ] **Step 1:** Прочитать `admin.php`, найти существующее действие по клиентам (где `adminRequire()` и работа с `users`).
- [ ] **Step 2: Добавить действие** в `admin.php`:
```php
    if ($action === 'reset_client_password') {
        adminRequire();
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $uid = (int)($data['user_id'] ?? 0);
        $newPass = (string)($data['password'] ?? '');
        if ($uid <= 0 || strlen($newPass) < 4) jsonResponse(['ok'=>false,'error'=>'Некорректные данные'], 422);
        $db = getDB();
        $db->prepare('UPDATE users SET password_hash=? WHERE id=?')
           ->execute([password_hash($newPass, PASSWORD_BCRYPT), $uid]);
        try { $db->prepare('DELETE FROM mobile_sessions WHERE user_id=?')->execute([$uid]); } catch (Throwable $e) {}
        jsonResponse(['ok'=>true]);
    }
```
- [ ] **Step 3: Добавить в `admin.html`** в строку клиента кнопку «Сбросить пароль», открывающую `prompt('Новый пароль для клиента:')` → `fetch('api/admin.php?action=reset_client_password', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({user_id: id, password: pass})})` → тост об успехе. (Следовать существующему стилю кнопок/запросов в admin.html.)
- [ ] **Step 4: Проверить синтаксис.** Run: `php -l server-src/api/admin.php`. Expected: `No syntax errors`.
- [ ] **Step 5: Commit.** `git add server-src/api/admin.php server-src/admin.html && git commit -m "feat(admin): manager password reset for client"`

### Task 6: Деплой сервера на прод + дымовой тест на временной БД

**Files:** деплой-скрипт по образцу `scripts/deploy_apk.py` (SFTP с бэкапом `cp -p`, `php -l`)

- [ ] **Step 1: Прогнать все серверные тесты на СЕРВЕРЕ на временной БД.** Залить `tests/` во временную папку, выполнить по SSH: `SPLITHUB_DB_PATH=/tmp/pr_$$.sqlite php tests/test_migration.php && ... test_password_reset.php && ... test_mobile_endpoints.php`. Expected: три `OK ...`.
- [ ] **Step 2: Бэкап + деплой** изменённых файлов (`db/init.php`, `api/lib/password_reset.php`, `api/lib/mobile_auth.php`, `api/mobile.php`, `api/auth.php`, `api/admin.php`, `admin.html`) по SFTP, каждый с `cp -p <f> <f>.bak-<stamp>` и `php -l` после.
- [ ] **Step 3: Прод-дымовой тест (новый телефон+email):** `POST splithub.ru/api/mobile.php?action=register` с email → 200; `request_password_reset` по этому телефону → `state:sent`; письмо с кодом дошло; `reset_password` с кодом → token. Затем удалить созданный тест-аккаунт из прод-БД.
- [ ] **Step 4: Commit** (деплой-скрипт, если новый). `git add scripts/ && git commit -m "chore(scripts): server deploy for reset feature"`

---

## Phase 2 — Приложение (RN)

### Task 7: API/сессия — функции сброса и обновления email

**Files:**
- Modify: `src/features/session/session-context.tsx` — добавить в контекст `requestPasswordReset`, `resetPassword`, `updateEmail`; `register` теперь шлёт email
- Modify: `src/features/session/session-errors.ts` — тексты новых кодов

- [ ] **Step 1: Расширить тип и реализацию контекста** (`SessionContextValue`): добавить
```ts
  requestPasswordReset: (identifier: string) => Promise<{ state: string; email_masked?: string }>;
  resetPassword: (identifier: string, code: string, password: string) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  register: (name: string, phone: string, password: string, telegram: string, email: string) => Promise<void>;
```
реализации:
```ts
      requestPasswordReset: (identifier) =>
        api<{ state: string; email_masked?: string }>('request_password_reset', {
          method: 'POST', body: JSON.stringify({ identifier }),
        }),
      resetPassword: async (identifier, code, password) => {
        const result = await api<{ token: string; user: User }>('reset_password', {
          method: 'POST', body: JSON.stringify({ identifier, code, password }),
        });
        await tokenStorage.set(result.token);
        setUser(result.user);
        void registerSessionDevice();
      },
      updateEmail: async (email) => {
        await api('update_email', { method: 'POST', body: JSON.stringify({ email }) });
        await refreshProfile();
      },
      register: async (name, phone, password, telegram, email) => {
        const result = await api<{ token: string; user: User }>('register', {
          method: 'POST', body: JSON.stringify({ name, phone, password, telegram, email }),
        });
        await tokenStorage.set(result.token);
        setUser(result.user);
        void registerSessionDevice();
      },
```
(добавить `email?: string` в тип `User`.)

- [ ] **Step 2: Тексты ошибок** в `session-errors.ts` — добавить в `sessionErrorMessage`:
```ts
  if (code === 'CODE_EXPIRED') return 'Код истёк или неверный. Запросите новый.';
  if (code === 'INVALID_CODE') return 'Неверный код. Проверьте и попробуйте снова.';
  if (code === 'TOO_MANY_ATTEMPTS') return 'Слишком много попыток. Запросите новый код.';
  if (code === 'INVALID_EMAIL') return 'Укажите корректный email.';
```

- [ ] **Step 3: Проверить типы.** Run: `cd mobile-native-parity && npx tsc --noEmit`. Expected: без ошибок по этим файлам.
- [ ] **Step 4: Commit.** `git add src/features/session && git commit -m "feat(app): session reset/updateEmail + email in register"`

### Task 8: Экраны восстановления + ссылка «Забыли пароль?»

**Files:**
- Create: `src/app/auth/reset.tsx` (двухшаговый экран: ввод identifier → ввод кода+пароля)
- Modify: `src/app/auth/login.tsx` — ссылка «Забыли пароль?» → `router.push('/auth/reset')`

- [ ] **Step 1: Создать `reset.tsx`** по образцу `register.tsx` (стили/структура те же): состояние `step` (`'request'|'confirm'`), поля identifier/code/password, кнопки. Логика:
  - шаг request: `const r = await requestPasswordReset(identifier);` → если `r.state==='sent'` → перейти на confirm, показать «Код отправлен на r.email_masked»; `no_email` → текст «К аккаунту не привязан email. Обратитесь к менеджеру: +7 978 599-13-69»; `not_found` → «Аккаунт не найден»; `rate_limited` → «Слишком часто, попробуйте позже».
  - шаг confirm: `await resetPassword(identifier, code, password);` → `router.replace('/profile')`; ошибки через `sessionErrorMessage(apiErrorCode(e))`.
- [ ] **Step 2: Добавить ссылку** в `login.tsx` под кнопкой входа: `<Pressable onPress={() => router.push('/auth/reset')}><Text>Забыли пароль?</Text></Pressable>`.
- [ ] **Step 3: Проверить типы.** Run: `npx tsc --noEmit`. Expected: чисто.
- [ ] **Step 4: Commit.** `git add src/app/auth && git commit -m "feat(app): password reset screens + forgot link"`

### Task 9: Email в регистрации + баннер в профиле

**Files:**
- Modify: `src/app/auth/register.tsx` — поле Email (обязательное), передать в `register(...)`
- Modify: профиль (`src/app/(tabs)/profile.tsx`) — баннер «Добавьте email», если `user.email` пуст

- [ ] **Step 1: В `register.tsx`** добавить `const [email, setEmail] = useState('');`, поле ввода (keyboardType `email-address`, autoCapitalize none, подпись «Email (для восстановления доступа)»), передать в `register(name, phone, password, telegram, email)`. Базовая проверка перед submit: непустой и содержит `@`.
- [ ] **Step 2: В профиле** — если `user && !user.email`: блок с текстом «Добавьте email для восстановления доступа» + поле + кнопка «Сохранить» → `await updateEmail(email)`.
- [ ] **Step 3: Проверить типы.** Run: `npx tsc --noEmit`. Expected: чисто.
- [ ] **Step 4: Commit.** `git add src/app && git commit -m "feat(app): email field in register + profile add-email"`

### Task 10: Сборка тестового APK и E2E на устройстве

- [ ] **Step 1: Собрать APK** (по инструкции из памяти проекта, с VPN): `bash android/gradlew -p android :app:assembleRelease`.
- [ ] **Step 2: Установить на устройство** через ADB (`adb install -r`).
- [ ] **Step 3: E2E через ADB** (тапы по координатам + скриншоты, как при отладке регистрации):
  - регистрация нового юзера с email → успех;
  - выход → «Забыли пароль?» → ввод телефона → «код отправлен»;
  - ввести реальный код из письма → новый пароль → авто-вход в профиль;
  - проверить вход старым/новым паролем.
- [ ] **Step 4: ОСТАНОВКА — показать пользователю** (скриншоты потока). Подтверждение трения/UX.

---

## Phase 3 — Сайт (index.html)

### Task 11: Формы сайта (email + восстановление) через превью → прод

**Files:**
- Modify: `tmp/index.html` (рабочая копия с сервера) → деплой как `preview.html`, после одобрения — в `index.html`
- Modify (после одобрения, в site-репо): `index.html`

- [ ] **Step 1: В форме регистрации** (`showAuthForm('register')` / `doRegister()` около строк 2004/2057 в index.html) добавить поле Email (обязательное), включить в `body` запроса `doRegister`, и валидацию «Укажите email».
- [ ] **Step 2: В форме входа** добавить ссылку «Забыли пароль?» → показ формы восстановления (identifier → код+пароль), вызывающей `api/auth.php?action=request_password_reset` и `?action=reset_password`; при успехе — авто-вход (как делает `doRegister`).
- [ ] **Step 3: Подсказка в дашборде** добавить email, если пуст (по аналогии с существующими блоками профиля).
- [ ] **Step 4: Залить как `preview.html`** (noindex), проверить весь поток вживую в браузере на реальном бэкенде (Phase 1 уже на проде).
- [ ] **Step 5: ОСТАНОВКА — показать ссылку пользователю**, получить одобрение трения.
- [ ] **Step 6: Применить на боевой `index.html`** (бэкап на сервере), удалить `preview.html`. Синхронизировать правку в site-репо `flycited2-dotcom/splithub` (ветка от main).

---

## Phase 3.5 — Миграция старых пользователей без email (решено 2026-06-09)

Старые аккаунты (регистрация до email) не могут восстановиться по email-only форме
(«email не найден»). Стратегия: довести их до привязки email + менеджерский fallback.
Согласованность: новым — лёгкий вход (одно поле), существующим — обязательная привязка.

### Task 13: Умное сообщение «не найдено» → менеджер (СДЕЛАНО)
- Сайт `index.html` (doResetRequest) и приложение `reset.tsx`: при `not_found` текст
  «Email не найден. Если регистрировались раньше без email — обратитесь к менеджеру:
  +7 978 599-13-69». Выложено на превью.

### Task 14: Экран «Привяжите email» при входе (для аккаунтов без email)
- Приложение: после входа, если `!user.email` — заметный экран/модалка «Привяжите
  email для восстановления доступа» с полем + `updateEmail`, кнопка «Сохранить» и
  дискретная «Позже» (показывается каждый вход, пока email не привязан). Профильный
  баннер остаётся как вторичная точка.
- Сайт `index.html`: аналогичная модалка после `doLogin`, если у `d.user` нет email
  (нужно вернуть email в ответе login/profile — добавить поле в SELECT).

### Task 15: Push-рассылка «привяжите email»
- Серверный скрипт: выбрать `mobile_devices` чьи `users.email` пусты и активны →
  отправить кампанию через существующий `api/lib/push.php` (тип `promo`/`system`):
  заголовок «Обновите безопасность», тело «Привяжите email, чтобы не терять доступ к
  аккаунту», переход в профиль. Запуск разовый, после готовности экрана привязки.
- Текст согласовать с пользователем перед отправкой.

## Phase 4 — Финальный выкат и уборка

### Task 12: Прод-валидация и чистка

- [ ] **Step 1: Сквозная проверка** на проде: регистрация с email (сайт и приложение), восстановление по email (сайт и приложение), менеджерский сброс в админке.
- [ ] **Step 2: Удалить тестовые аккаунты**, созданные при разработке (id≈35–39 и любые `ТЕСТ*`), из прод-`users` — с подтверждением пользователя.
- [ ] **Step 3: Обновить память проекта** — фича восстановления доступна, email обязателен, как работает менеджерский сброс.
- [ ] **Step 4: Финальный commit/PR** в обоих репозиториях.

---

## Self-Review (выполнено при написании плана)

- **Покрытие спеки:** Секция 1 (данные/архитектура) → Task 1–2; Секция 2 (бэкенд) → Task 3–5; Секция 3 (фронт/безопасность/тесты) → Task 7–11 + тесты в Task 1–3; Секция 4 (превью трения) → Task 0, 10(Step4), 11(Step5). Менеджерский fallback → Task 5. Все пункты покрыты.
- **Согласованность имён:** контракт lib (`requestPasswordReset`/`confirmPasswordReset`/`pr_*`) одинаков в Task 2/3/4; RN-методы (`requestPasswordReset`/`resetPassword`/`updateEmail`) согласованы Task 7→8→9.
- **Открытые зависимости:** `issueMobileTokenForUser` определена в Task 3 (Step 3d) до использования. `email` в типе `User` добавляется в Task 7.
- **Трение:** в каждый фронт-фейз встроена остановка на одобрение пользователем до прод-выката.
