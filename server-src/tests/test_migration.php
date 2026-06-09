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
