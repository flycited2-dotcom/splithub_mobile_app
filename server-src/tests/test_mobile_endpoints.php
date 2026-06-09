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
echo "OK test_mobile_endpoints\n";
