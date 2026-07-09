<?php
putenv('SPLITHUB_DB_PATH=' . sys_get_temp_dir() . '/pr_mob_' . uniqid() . '.sqlite');
require __DIR__ . '/../db/init.php';
require __DIR__ . '/../api/lib/mobile_auth.php';
require __DIR__ . '/../api/lib/password_reset.php';

// register-валидация (та же логика, что в mobile.php): email опционален по флагу
function mobile_register_valid($name,$phone,$password,$email){
    $p = normalizePhone($phone);
    $emailBad = ($email === '') ? pr_emailRequired() : !filter_var($email, FILTER_VALIDATE_EMAIL);
    return !($name==='' || strlen($p)<10 || strlen($p)>15 || strlen($password)<4 || $emailBad);
}
// по умолчанию флаг email_required='0' -> email опционален
assert(mobile_register_valid('A','+79990001111','pass','a@b.ru') === true, 'valid reg with email');
assert(mobile_register_valid('A','+79990001111','pass','') === true, 'email optional by default');
assert(mobile_register_valid('A','+79990001111','pass','notanemail') === false, 'invalid email rejected');
assert(mobile_register_valid('','+79990001111','pass','a@b.ru') === false, 'name required');
assert(mobile_register_valid('A','+79990001111','x','a@b.ru') === false, 'password too short');
// флип на обязательный
getDB()->exec("UPDATE app_settings SET value='1' WHERE key='email_required'");
assert(mobile_register_valid('A','+79990001111','pass','') === false, 'email required after flip');
assert(mobile_register_valid('A','+79990001111','pass','a@b.ru') === true, 'valid email ok when required');
// вернуть флаг для остальных проверок
getDB()->exec("UPDATE app_settings SET value='0' WHERE key='email_required'");

// issueMobileTokenForUser: выдаёт токен без проверки пароля, создаёт сессию
$db = getDB();
$db->prepare("INSERT INTO users(name,phone,email,password_hash) VALUES(?,?,?,?)")
   ->execute(['T','79990002222','t@b.ru', password_hash('p', PASSWORD_BCRYPT)]);
$uid = (int)$db->lastInsertId();
$res = issueMobileTokenForUser($uid);
assert(strlen($res['token']) === 64, 'token issued');
assert((int)$res['user']['id'] === $uid, 'user returned');
assert(!isset($res['user']['password_hash']), 'no password hash leaked');
$cnt = $db->prepare("SELECT COUNT(*) FROM mobile_sessions WHERE user_id=?"); $cnt->execute([$uid]);
assert((int)$cnt->fetchColumn() === 1, 'session row created');

// delete_account: anonymizes PII, blocks old password, keeps order history, revokes sessions/devices
// (mirrors the UPDATE/DELETE statements in mobile.php action=delete_account)
$db->prepare("INSERT INTO users(name,phone,email,password_hash) VALUES(?,?,?,?)")
   ->execute(['Del', '79990003333', 'del@b.ru', password_hash('p', PASSWORD_BCRYPT)]);
$delUid = (int)$db->lastInsertId();
$db->prepare("INSERT INTO orders(user_id,total) VALUES(?,?)")->execute([$delUid, 1000]);
issueMobileTokenForUser($delUid);
$db->prepare("INSERT INTO mobile_devices(user_id,expo_token,platform) VALUES(?,?,?)")
   ->execute([$delUid, 'tok123', 'ios']);

$db->prepare("UPDATE users SET name=?, phone=?, telegram='', email='',
              password_hash=?, deleted_at=datetime('now') WHERE id=?")
   ->execute(['Удалённый пользователь', 'deleted-' . $delUid,
              password_hash(bin2hex(random_bytes(16)), PASSWORD_BCRYPT), $delUid]);
$db->prepare('DELETE FROM mobile_sessions WHERE user_id=?')->execute([$delUid]);
$db->prepare('DELETE FROM mobile_devices WHERE user_id=?')->execute([$delUid]);

$row = $db->prepare('SELECT name,phone,email,password_hash,deleted_at FROM users WHERE id=?');
$row->execute([$delUid]);
$after = $row->fetch();
assert($after['name'] === 'Удалённый пользователь', 'name anonymized');
assert($after['phone'] === 'deleted-' . $delUid, 'phone anonymized (frees original number)');
assert($after['email'] === '', 'email cleared');
assert($after['deleted_at'] !== null, 'deleted_at stamped');
assert(!password_verify('p', $after['password_hash']), 'old password invalidated');

$sessCnt = $db->prepare('SELECT COUNT(*) FROM mobile_sessions WHERE user_id=?'); $sessCnt->execute([$delUid]);
assert((int)$sessCnt->fetchColumn() === 0, 'all sessions revoked');
$devCnt = $db->prepare('SELECT COUNT(*) FROM mobile_devices WHERE user_id=?'); $devCnt->execute([$delUid]);
assert((int)$devCnt->fetchColumn() === 0, 'push devices removed');
$orderCnt = $db->prepare('SELECT COUNT(*) FROM orders WHERE user_id=?'); $orderCnt->execute([$delUid]);
assert((int)$orderCnt->fetchColumn() === 1, 'order history preserved for accounting');

echo "OK test_mobile_endpoints\n";
