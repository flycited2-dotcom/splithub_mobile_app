<?php
putenv('SPLITHUB_DB_PATH=' . sys_get_temp_dir() . '/pr_mob_' . uniqid() . '.sqlite');
require __DIR__ . '/../db/init.php';
require __DIR__ . '/../api/lib/mobile_auth.php';

// register-валидация (та же проверка, что в mobile.php): email обязателен
function mobile_register_valid($name,$phone,$password,$email){
    $p = normalizePhone($phone);
    return !($name==='' || strlen($p)<10 || strlen($p)>15 || strlen($password)<4 || !filter_var($email, FILTER_VALIDATE_EMAIL));
}
assert(mobile_register_valid('A','+79990001111','pass','a@b.ru') === true, 'valid reg');
assert(mobile_register_valid('A','+79990001111','pass','') === false, 'email required');
assert(mobile_register_valid('A','+79990001111','pass','notanemail') === false, 'email format');
assert(mobile_register_valid('','+79990001111','pass','a@b.ru') === false, 'name required');
assert(mobile_register_valid('A','+79990001111','x','a@b.ru') === false, 'password too short');

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
