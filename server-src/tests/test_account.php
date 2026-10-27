<?php
// Personal account parity with the website (api/auth.php): company requisites and
// order history filters. Run: php tests/test_account.php
ini_set('zend.assertions', '1');
ini_set('assert.exception', '1');

putenv('SPLITHUB_DB_PATH=' . sys_get_temp_dir() . '/sh_acc_' . uniqid() . '.sqlite');
require __DIR__ . '/../db/init.php';
require __DIR__ . '/../api/lib/account.php';

// Requisites: same rules and messages as update_requisites on the site
$ok = mobileRequisitesInput(['company_name' => ' ООО Холод ', 'inn' => '9102012345', 'kpp' => '910201001', 'legal_address' => ' Симферополь ']);
assert($ok === ['ok' => true, 'company_name' => 'ООО Холод', 'inn' => '9102012345', 'kpp' => '910201001', 'legal_address' => 'Симферополь'], 'valid requisites trimmed');
assert(mobileRequisitesInput(['inn' => '123456789012'])['ok'] === true, '12-digit INN (sole proprietor) ok');
assert(mobileRequisitesInput([])['ok'] === true, 'all fields optional');
assert(mobileRequisitesInput(['inn' => '12345'])['code'] === 'INVALID_INN', 'short INN rejected');
assert(mobileRequisitesInput(['inn' => '91020123ab'])['code'] === 'INVALID_INN', 'letters in INN rejected');
assert(mobileRequisitesInput(['kpp' => '12345678'])['code'] === 'INVALID_KPP', '8-digit KPP rejected');
assert(mb_strlen(mobileRequisitesInput(['company_name' => str_repeat('я', 300)])['company_name']) === 255, 'company name capped');

// Order filters: status, period, "#SH-00042" / "42" search
assert(mobileOrdersFilter([]) === [[], []], 'no filters');
assert(mobileOrdersFilter(['status' => 'new']) === [['status = ?'], ['new']], 'status');
assert(mobileOrdersFilter(['status' => 'drop table']) === [[], []], 'unknown status ignored');
assert(mobileOrdersFilter(['period' => '30d'])[0] === ["created_at >= datetime('now','-30 days')"], '30 days');
assert(mobileOrdersFilter(['period' => '3m'])[0] === ["created_at >= datetime('now','-3 months')"], '3 months');
assert(mobileOrdersFilter(['period' => 'x'])[0] === [], 'unknown period ignored');
assert(mobileOrdersFilter(['search' => 'SH-00042']) === [['id = ?'], [42]], 'search by SH number');
assert(mobileOrdersFilter(['search' => '#42']) === [['id = ?'], [42]], 'search by #number');
assert(mobileOrdersFilter(['search' => 'abc']) === [[], []], 'non-numeric search ignored');

// Filters work against a real orders table
$db = getDB();
$db->prepare("INSERT INTO users(name,phone,password_hash) VALUES('A','79990000001','x')")->execute();
$uid = (int)$db->lastInsertId();
$ins = $db->prepare('INSERT INTO orders(user_id,total,status,created_at) VALUES(?,?,?,?)');
$ins->execute([$uid, 100, 'new', date('Y-m-d H:i:s')]);
$ins->execute([$uid, 200, 'completed', date('Y-m-d H:i:s', strtotime('-60 days'))]);
$ins->execute([$uid, 300, 'cancelled', date('Y-m-d H:i:s', strtotime('-400 days'))]);
$list = fn(array $get) => array_column(mobileOrdersPage($uid, $get)['orders'], 'total');
assert($list([]) === [100, 200, 300], 'all orders, newest first');
assert($list(['status' => 'completed']) === [200], 'filtered by status');
assert($list(['period' => '30d']) === [100], 'filtered by period');
assert($list(['period' => '1y']) === [100, 200], 'one year');
assert(mobileOrdersPage($uid, ['status' => 'new'])['total'] === 1, 'total respects filters');

echo "OK test_account\n";
