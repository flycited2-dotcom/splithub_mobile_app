<?php
// Mobile catalog must match what the site shows: products.json + admin overrides
// (price/stock/badge/description/hide) + active custom products.
// Run: php tests/test_catalog_overrides.php
ini_set('zend.assertions', '1');
ini_set('assert.exception', '1');

$tmp = sys_get_temp_dir() . '/sh_cat_' . uniqid();
mkdir($tmp);
putenv('SPLITHUB_DB_PATH=' . $tmp . '/db.sqlite');
putenv('SPLITHUB_PRODUCTS_PATH=' . $tmp . '/products.json');

$base = [
    ['id' => '1', 'sku' => 'a', 'brand' => 'MDV', 'model' => 'A-09', 'group' => 'inv', 'price' => 1000, 'area' => 20,
     'stock' => 'in_stock', 'stockLabel' => 'В наличии', 'descShort' => '', 'benefits' => [], 'photo' => 'a.webp'],
    ['id' => '2', 'sku' => 'b', 'brand' => 'MDV', 'model' => 'B-12', 'group' => 'inv', 'price' => 2000, 'area' => 35,
     'stock' => 'in_stock', 'stockLabel' => 'В наличии', 'descShort' => '', 'benefits' => [], 'photo' => 'b.webp'],
    ['id' => '3', 'sku' => 'c', 'brand' => 'MDV', 'model' => 'C-18', 'group' => 'inv', 'price' => 3000, 'area' => 50,
     'stock' => 'in_stock', 'stockLabel' => 'В наличии', 'descShort' => '', 'benefits' => [], 'photo' => 'c.webp'],
    // Real file names contain commas (kronshtein-500-600-2,0.webp); the site uses them as is.
    ['id' => '4', 'sku' => 'd', 'brand' => 'Кронштейны', 'model' => 'K-2,0', 'group' => 'rashod', 'price' => 880, 'area' => 0,
     'stock' => 'in_stock', 'stockLabel' => 'В наличии', 'descShort' => '', 'benefits' => [], 'photo' => 'kronshtein-500-600-2,0.webp'],
];
file_put_contents($tmp . '/products.json', json_encode($base, JSON_UNESCAPED_UNICODE));

require __DIR__ . '/../db/init.php';
require __DIR__ . '/../api/lib/catalog.php';
require __DIR__ . '/../api/lib/catalog_overrides.php';

// No overrides -> identical to products.json
$plain = mobileCatalog();
assert(count($plain) === 4, 'base catalog passes through');
assert($plain[0] == $base[0] + ['photos' => ['a.webp']], 'untouched product keeps its fields');
assert($plain[3]['photo'] === 'kronshtein-500-600-2,0.webp' && $plain[3]['photos'] === ['kronshtein-500-600-2,0.webp'], 'base photo names are not rewritten');
$v0 = mobileCatalogVersion();

$db = getDB();
// Production schema (site main db/init.php); this repo's init.php predates active/data_json.
$db->exec('DROP TABLE IF EXISTS product_overrides');
$db->exec("CREATE TABLE product_overrides (sku TEXT PRIMARY KEY, description TEXT DEFAULT '', badge TEXT DEFAULT '',
    badge_label TEXT DEFAULT '', active INTEGER DEFAULT 1, data_json TEXT DEFAULT '{}', updated_at TEXT DEFAULT CURRENT_TIMESTAMP)");
$db->exec("CREATE TABLE IF NOT EXISTS custom_products (id TEXT PRIMARY KEY, sku TEXT NOT NULL UNIQUE, data_json TEXT NOT NULL DEFAULT '{}',
    active INTEGER NOT NULL DEFAULT 1, updated_at TEXT DEFAULT CURRENT_TIMESTAMP, created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
$ins =$db->prepare('INSERT INTO product_overrides (sku, description, badge, badge_label, active, data_json) VALUES (?,?,?,?,?,?)');
$ins->execute(['a', 'Монтаж в подарок', 'sale', '', 1, json_encode(['price' => '990', 'stock' => 'order_7', 'stockLabel' => 'Под заказ 7 дней'])]);
$ins->execute(['b', '', '', '', 0, '{}']);
$ins->execute(['c', '', 'clearance', 'Последние', 1, json_encode(['photos' => ['/assets/img/products/c1.webp', 'c2.webp']])]);
$db->prepare('INSERT INTO custom_products (id, sku, data_json, active) VALUES (?,?,?,?)')
   ->execute(['custom-x', 'x', json_encode(['sku' => 'x', 'model' => 'X-24', 'price' => 5000]), 1]);
$db->prepare('INSERT INTO custom_products (id, sku, data_json, active) VALUES (?,?,?,?)')
   ->execute(['custom-y', 'y', json_encode(['sku' => 'y', 'model' => 'Y-24', 'price' => 6000]), 0]);
$db->prepare('INSERT INTO custom_products (id, sku, data_json, active) VALUES (?,?,?,?)')
   ->execute(['custom-dup', 'a', json_encode(['sku' => 'a', 'model' => 'dup']), 1]);

$cat = mobileCatalog();
$bySku = array_column($cat, null, 'sku');
assert(!isset($bySku['b']), 'hidden product is removed');
assert($bySku['a']['price'] === 990, 'override price applied as int');
assert($bySku['a']['stock'] === 'order_7' && $bySku['a']['stockLabel'] === 'Под заказ 7 дней', 'override stock applied');
assert($bySku['a']['badge'] === 'sale', 'badge column applied');
assert($bySku['a']['description'] === 'Монтаж в подарок', 'description column applied');
assert($bySku['a']['model'] === 'A-09', 'custom product with existing sku does not replace base');
assert($bySku['c']['badge_label'] === 'Последние', 'badge label applied');
assert($bySku['c']['photos'] === ['c1.webp', 'c2.webp'] && $bySku['c']['photo'] === 'c.webp', 'photos normalized, photo kept');
assert(isset($bySku['x']) && $bySku['x']['id'] === 'custom-x' && $bySku['x']['price'] === 5000, 'active custom product added');
assert($bySku['x']['stock'] === 'in_stock' && $bySku['x']['group'] === 'inv', 'custom product gets site defaults');
assert(!isset($bySku['y']), 'inactive custom product skipped');
foreach ($cat as $p) {
    assert(!array_key_exists('active', $p) && !array_key_exists('_active', $p), 'internal flags not exposed');
}
assert(mobileCatalogVersion() !== $v0, 'version changes when admin edits');

// Orders are validated against the same prices the user sees
$ok = mobileValidateCatalogItems([['id' => '1', 'qty' => 1, 'price' => 990]]);
assert($ok['ok'] === true && $ok['items'][0]['price'] === 990, 'order accepted at override price');
$stale = mobileValidateCatalogItems([['id' => '1', 'qty' => 1, 'price' => 1000]]);
assert($stale['code'] === 'CATALOG_CHANGED', 'stale client price detected');
$hidden = mobileValidateCatalogItems([['id' => '2', 'qty' => 1, 'price' => 2000]]);
assert($hidden['code'] === 'PRODUCT_UNAVAILABLE', 'hidden product cannot be ordered');
$custom = mobileValidateCatalogItems([['id' => 'custom-x', 'qty' => 2, 'price' => 5000]]);
assert($custom['ok'] === true, 'custom product can be ordered');
// send.php's validator keeps reading plain products.json
$legacy = validateCatalogItems([['id' => '2', 'qty' => 1, 'price' => 2000]]);
assert($legacy['ok'] === true, 'send.php path unchanged');

// Broken overrides data must not take the catalog down
$db->exec("UPDATE product_overrides SET data_json = 'not json' WHERE sku = 'a'");
assert(count(mobileCatalog()) === 4, 'bad json ignored, catalog still served');
$db->exec('DROP TABLE product_overrides');
$db->exec('DROP TABLE custom_products');
assert(count(mobileCatalog()) === 4, 'missing tables fall back to base catalog');

echo "OK test_catalog_overrides\n";
