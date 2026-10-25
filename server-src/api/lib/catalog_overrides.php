<?php
// Mobile catalog = products.json + admin overrides + active custom products,
// i.e. exactly what index.html shows after applyProductOverride()/rebuildProductsFromAdmin().
// Used only by api/mobile.php. Fail-open: if the admin tables can't be read,
// the plain products.json catalog is served.
require_once __DIR__ . '/catalog.php';

// Same field list as applyProductOverride() in index.html.
const MOBILE_OVERRIDE_FIELDS = [
    'brandCode', 'brand', 'series', 'model', 'group', 'type', 'factory', 'color', 'btu', 'area',
    'price', 'stock', 'stockLabel', 'descShort', 'cardBenef', 'benefits', 'compressor', 'freon',
    'photo', 'photos', 'description', 'badge', 'badge_label',
];

// Site defaults for custom products (adminNormalizeProductPayload in admin.php).
const MOBILE_CUSTOM_DEFAULTS = [
    'brandCode' => 'custom', 'brand' => 'SplitHub', 'series' => 'Каталог', 'group' => 'inv',
    'type' => 'split', 'factory' => '', 'color' => 'white', 'stock' => 'in_stock',
    'stockLabel' => 'В наличии', 'descShort' => '', 'cardBenef' => '', 'compressor' => '',
    'freon' => '', 'price' => 0, 'area' => 0, 'benefits' => [],
];

function mobileImageName($value): string {
    $value = str_replace('\\', '/', trim((string)$value));
    if ($value === '' || preg_match('#^https?://#i', $value)) return $value;
    $value = basename(preg_replace('#^/?assets/img/products/#i', '', $value));
    return preg_replace('/[^a-zA-Z0-9._-]/', '_', $value);
}

function mobileImageList($value): array {
    if (is_string($value)) $value = preg_split('/[\r\n,;]+/', $value);
    if (!is_array($value)) return [];
    $out = [];
    foreach ($value as $item) {
        $name = mobileImageName($item);
        if ($name !== '' && !in_array($name, $out, true)) $out[] = $name;
    }
    return array_slice($out, 0, 12);
}

function mobileBenefits($value): array {
    if (is_string($value)) $value = preg_split('/[\r\n;]+/', $value);
    if (!is_array($value)) return [];
    return array_values(array_filter(array_map(fn($v) => trim((string)$v), $value), fn($v) => $v !== ''));
}

function mobileJsonObject($json): array {
    $data = json_decode((string)$json, true);
    return is_array($data) ? $data : [];
}

// Shared shape fix-up applied after merging, mirrors cloneProduct()/applyProductOverride().
// Photo names from products.json are kept as is (real files contain commas, e.g.
// kronshtein-500-600-2,0.webp); only admin-provided names are normalized, like admin.php.
function mobileFinishProduct(array $p): array {
    $p['price'] = (int)($p['price'] ?? 0);
    $p['area'] = (int)($p['area'] ?? 0);
    $p['benefits'] = mobileBenefits($p['benefits'] ?? []);
    $p['photos'] = is_array($p['photos'] ?? null) ? array_values($p['photos']) : [];
    if (!$p['photos'] && !empty($p['photo'])) $p['photos'] = [$p['photo']];
    if ($p['photos'] && empty($p['photo'])) $p['photo'] = $p['photos'][0];
    unset($p['active'], $p['_active'], $p['_source'], $p['_is_custom'], $p['updated_at'], $p['created_at']);
    return $p;
}

// Returns [overrides by sku, active custom products] or null if the tables can't be read.
function mobileAdminCatalogData(): ?array {
    try {
        $db = getDB();
        $overrides = [];
        $rows = $db->query('SELECT sku, description, badge, badge_label, active, data_json FROM product_overrides')->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $r) {
            $ov = mobileJsonObject($r['data_json'] ?? '{}');
            // Same normalization adminDecodeOverrideRow() applies to admin-entered photos.
            if (!empty($ov['photos'])) $ov['photos'] = mobileImageList($ov['photos']);
            if (!empty($ov['photo'])) $ov['photo'] = mobileImageName($ov['photo']);
            foreach (['description', 'badge', 'badge_label'] as $field) {
                if (trim((string)($r[$field] ?? '')) !== '') $ov[$field] = trim((string)$r[$field]);
            }
            $ov['active'] = (int)($r['active'] ?? 1);
            $overrides[(string)$r['sku']] = $ov;
        }
        $custom = [];
        $rows = $db->query('SELECT id, sku, data_json FROM custom_products WHERE active = 1 ORDER BY created_at DESC')->fetchAll(PDO::FETCH_ASSOC);
        foreach ($rows as $r) {
            $data = mobileJsonObject($r['data_json'] ?? '{}');
            if (isset($data['data']) && is_array($data['data'])) $data = $data['data'];
            if (isset($data['active']) && !(int)$data['active']) continue;
            $data['id'] = trim((string)($data['id'] ?? '')) ?: (string)$r['id'];
            $data['sku'] = trim((string)($data['sku'] ?? '')) ?: (string)$r['sku'];
            if (!empty($data['photos'])) $data['photos'] = mobileImageList($data['photos']);
            if (!empty($data['photo'])) $data['photo'] = mobileImageName($data['photo']);
            $custom[] = $data + MOBILE_CUSTOM_DEFAULTS;
        }
        return [$overrides, $custom];
    } catch (Throwable $e) {
        return null;
    }
}

function mobileCatalog(): array {
    $base = loadCatalog();
    $admin = mobileAdminCatalogData();
    [$overrides, $custom] = $admin ?? [[], []];

    $out = [];
    $skus = [];
    foreach ($base as $p) {
        $sku = (string)($p['sku'] ?? '');
        $skus[$sku] = true;
        $ov = $overrides[$sku] ?? [];
        if (isset($ov['active']) && (int)$ov['active'] === 0) continue;
        foreach (MOBILE_OVERRIDE_FIELDS as $field) {
            if (array_key_exists($field, $ov)) $p[$field] = $ov[$field];
        }
        $out[] = mobileFinishProduct($p);
    }
    foreach ($custom as $p) {
        if ($p['sku'] === '' || isset($skus[$p['sku']])) continue;
        $skus[$p['sku']] = true;
        $out[] = mobileFinishProduct($p);
    }
    return $out;
}

// Changes whenever products.json or anything in the admin overrides changes,
// so the app's catalog refresh picks up admin edits.
function mobileCatalogVersion(): string {
    $admin = mobileAdminCatalogData();
    return hash('sha256', hash_file('sha256', catalogPath()) . '|' . json_encode($admin, JSON_UNESCAPED_UNICODE));
}

// Same rules as validateCatalogItems() in catalog.php, but against mobileCatalog(),
// so app orders are priced like the site. catalog.php stays untouched because
// send.php depends on it.
function mobileValidateCatalogItems(array $requested): array {
    if (!$requested) {
        return ['ok' => false, 'code' => 'EMPTY_CART'];
    }

    $catalog = array_column(mobileCatalog(), null, 'id');
    $items = [];
    $changes = [];
    foreach ($requested as $row) {
        if (!is_array($row)) {
            return ['ok' => false, 'code' => 'INVALID_ITEM'];
        }

        $id = (string)($row['id'] ?? '');
        $qty = (int)($row['qty'] ?? 0);
        if ($qty < 1 || $qty > 999) {
            return ['ok' => false, 'code' => 'INVALID_QUANTITY', 'product_id' => $id];
        }

        $product = $catalog[$id] ?? null;
        if (!$product || ($product['stock'] ?? '') === 'out') {
            return ['ok' => false, 'code' => 'PRODUCT_UNAVAILABLE', 'product_id' => $id];
        }

        $clientPrice = (int)($row['price'] ?? 0);
        $serverPrice = (int)$product['price'];
        if ($clientPrice !== $serverPrice) {
            $changes[] = ['id' => $id, 'old_price' => $clientPrice, 'new_price' => $serverPrice];
        }

        $items[] = [
            'id' => $id,
            'name' => (string)$product['model'],
            'brand' => (string)$product['brand'],
            'price' => $serverPrice,
            'qty' => $qty,
            'group' => (string)$product['group'],
        ];
    }

    if ($changes) {
        return ['ok' => false, 'code' => 'CATALOG_CHANGED', 'changes' => $changes, 'items' => $items];
    }
    return ['ok' => true, 'items' => $items];
}
