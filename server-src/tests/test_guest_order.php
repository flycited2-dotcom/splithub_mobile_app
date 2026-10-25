<?php
// Guest checkout from the app: same storage (guest_orders) and manager message as
// a guest order from the website, without status buttons (they target `orders` ids).
// Run: php tests/test_guest_order.php
ini_set('zend.assertions', '1');
ini_set('assert.exception', '1');

putenv('SPLITHUB_DB_PATH=' . sys_get_temp_dir() . '/sh_guest_' . uniqid() . '.sqlite');
require __DIR__ . '/../db/init.php';
require __DIR__ . '/../api/lib/mobile_auth.php';
require __DIR__ . '/../api/lib/manager_notify.php';
require __DIR__ . '/../api/lib/guest_order.php';

// Input validation
$good = mobileGuestOrderInput(['name' => ' Иван ', 'phone' => '+7 (978) 123-45-67', 'comment' => ' к 10:00 ', 'items' => [['id' => '1']]]);
assert($good['ok'] === true, 'valid guest input');
assert($good['name'] === 'Иван' && $good['phone'] === '79781234567' && $good['comment'] === 'к 10:00', 'input normalized');
assert(mobileGuestOrderInput(['name' => '', 'phone' => '+79781234567', 'items' => [['id' => '1']]])['code'] === 'INVALID_GUEST', 'name required');
assert(mobileGuestOrderInput(['name' => 'И', 'phone' => '123', 'items' => [['id' => '1']]])['code'] === 'INVALID_GUEST', 'phone too short');
assert(mobileGuestOrderInput(['name' => str_repeat('я', 101), 'phone' => '+79781234567', 'items' => [['id' => '1']]])['code'] === 'INVALID_GUEST', 'name too long');
assert(mobileGuestOrderInput(['name' => 'И', 'phone' => '+79781234567', 'items' => []])['code'] === 'EMPTY_CART', 'empty cart');
assert(mobileGuestOrderInput(['name' => 'И', 'phone' => '+79781234567', 'items' => array_fill(0, 101, ['id' => '1'])])['code'] === 'INVALID_ITEM', 'too many lines');

// Storage: same table and columns the website writes. Production init.php adds
// guest_orders.status via migration; this repo's older init.php does not.
getDB()->exec('CREATE TABLE IF NOT EXISTS guest_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL, total INTEGER NOT NULL DEFAULT 0, items_json TEXT NOT NULL DEFAULT "[]", comment TEXT DEFAULT "", client_tg TEXT DEFAULT "", created_at TEXT DEFAULT CURRENT_TIMESTAMP)');
if (!in_array('status', array_column(getDB()->query('PRAGMA table_info(guest_orders)')->fetchAll(PDO::FETCH_ASSOC), 'name'), true)) {
    getDB()->exec("ALTER TABLE guest_orders ADD COLUMN status TEXT DEFAULT 'new'");
}
$items = [
    ['id' => '1', 'name' => 'MDSAG-09', 'brand' => 'MDV', 'price' => 1000, 'qty' => 2, 'group' => 'inv'],
    ['id' => '2', 'name' => 'Кронштейн', 'brand' => '', 'price' => 990, 'qty' => 1, 'group' => 'rashod'],
];
$created = createMobileGuestOrder('Иван', '79781234567', $items, 'к 10:00', '@ivan');
assert($created['guest_order_id'] > 0 && $created['total'] === 2990, 'guest order stored with total');
$row = getDB()->query('SELECT * FROM guest_orders WHERE id=' . (int)$created['guest_order_id'])->fetch();
assert($row['name'] === 'Иван' && $row['phone'] === '79781234567' && (int)$row['total'] === 2990, 'row fields');
assert($row['status'] === 'new' && $row['comment'] === 'к 10:00' && $row['client_tg'] === '@ivan', 'status/comment/tg');
assert(json_decode($row['items_json'], true)[1]['name'] === 'Кронштейн', 'items json kept');

// Manager message: guest label instead of an SH- order number
$text = mobileGuestOrderTelegramText($created['guest_order_id'], 'Иван', '79781234567', $items, 2990, 'к 10:00', '@ivan');
assert(str_contains($text, 'Гостевая заявка №' . $created['guest_order_id'] . ' · приложение'), 'guest label in telegram');
assert(!str_contains($text, 'SH-'), 'no registered order number in telegram');
assert(str_contains($text, 'MDV MDSAG-09') && str_contains($text, '2 990 ₽'), 'items and total in telegram');
$html = mobileGuestOrderEmailHtml($created['guest_order_id'], 'Иван', '79781234567', $items, 2990);
assert(str_contains($html, 'Гостевая заявка №') && !str_contains($html, 'SH-'), 'guest label in email');

echo "OK test_guest_order\n";
