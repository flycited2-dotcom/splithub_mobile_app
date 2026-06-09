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
// request по email как identifier тоже работает
assert(requestPasswordReset('user@mail.ru')['state'] === 'sent', 'lookup by email');

// достаём код из тестового хука
$code = pr_lastTestCode();
assert(strlen($code) === 6, 'code is 6 digits');

// confirm: неверный код
$bad = confirmPasswordReset('79990000001', '000000', 'newpass1');
assert($bad['ok'] === false && $bad['code'] === 'INVALID_CODE', 'wrong code rejected');
// confirm: короткий пароль
assert(confirmPasswordReset('79990000001', $code, 'x')['code'] === 'INVALID_PASSWORD', 'short password rejected');
// confirm: верный код -> ok, пароль сменился
$okr = confirmPasswordReset('79990000001', $code, 'newpass1');
assert($okr['ok'] === true, 'correct code accepted');
$u = $db->query("SELECT password_hash FROM users WHERE phone='79990000001'")->fetch();
assert(password_verify('newpass1', $u['password_hash']), 'password updated');
// повторное использование того же кода -> отказ (одноразовый)
assert(confirmPasswordReset('79990000001', $code, 'another1')['ok'] === false, 'code single-use');
echo "OK test_password_reset\n";
