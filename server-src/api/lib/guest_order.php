<?php
// Guest checkout from the app (api/mobile.php action=create_guest_order).
// Stored like a website guest order (send.php → guest_orders) and announced to the
// manager with the same Telegram/email layout as mobile orders. send.php is not used:
// the app talks only to its own endpoints (AGENTS.md).
require_once __DIR__ . '/../../db/init.php';
require_once __DIR__ . '/manager_notify.php';

function mobileGuestOrderInput(array $data): array {
    $name = trim((string)($data['name'] ?? ''));
    $phone = normalizePhone((string)($data['phone'] ?? ''));
    $items = $data['items'] ?? [];
    if ($name === '' || mb_strlen($name) > 100 || strlen($phone) < 10 || strlen($phone) > 15) {
        return ['ok' => false, 'code' => 'INVALID_GUEST'];
    }
    if (!is_array($items) || !$items) {
        return ['ok' => false, 'code' => 'EMPTY_CART'];
    }
    if (count($items) > 100) {
        return ['ok' => false, 'code' => 'INVALID_ITEM'];
    }
    return [
        'ok' => true,
        'name' => $name,
        'phone' => $phone,
        'comment' => mb_substr(trim((string)($data['comment'] ?? '')), 0, 2000),
        'client_tg' => mb_substr(trim((string)($data['client_tg'] ?? '')), 0, 100),
        'items' => $items,
    ];
}

function createMobileGuestOrder(string $name, string $phone, array $items, string $comment = '', string $clientTg = ''): array {
    $total = array_sum(array_map(fn($item) => (int)$item['price'] * (int)$item['qty'], $items));
    $db = getDB();
    $db->exec('CREATE TABLE IF NOT EXISTS guest_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL, total INTEGER NOT NULL DEFAULT 0, items_json TEXT NOT NULL DEFAULT "[]", status TEXT DEFAULT "new", comment TEXT DEFAULT "", client_tg TEXT DEFAULT "", created_at TEXT DEFAULT CURRENT_TIMESTAMP)');
    // status is left to its DEFAULT 'new', exactly like send.php (older schemas lack the column).
    $db->prepare('INSERT INTO guest_orders (name,phone,total,items_json,comment,client_tg) VALUES (?,?,?,?,?,?)')
       ->execute([$name, $phone, $total, json_encode($items, JSON_UNESCAPED_UNICODE), $comment, $clientTg]);
    return ['guest_order_id' => (int)$db->lastInsertId(), 'total' => $total];
}

function mobileGuestOrderLabel(int $guestId): string {
    return 'Гостевая заявка №' . $guestId . ' · приложение';
}

// Reuses the mobile order layout; only the "SH-xxxxx" number is swapped for the guest label.
function mobileGuestOrderTelegramText(int $guestId, string $name, string $phone, array $items, int $total, string $comment = '', string $clientTg = ''): string {
    $text = mobileOrderTelegramText($guestId, $name, $phone, $items, $total, $comment, $clientTg);
    return str_replace(mobileOrderNumber($guestId), mobileGuestOrderLabel($guestId), $text);
}

function mobileGuestOrderEmailHtml(int $guestId, string $name, string $phone, array $items, int $total, string $comment = '', string $clientTg = ''): string {
    $html = mobileOrderEmailHtml($guestId, $name, $phone, $items, $total, $comment, $clientTg);
    return str_replace(mobileOrderNumber($guestId), mobileGuestOrderLabel($guestId), $html);
}

// No status buttons: their callback ids point to the `orders` table, not guest_orders.
// Same route fallback as sendMobileOrderTelegram on prod (23.09.2026 fix): IPv4 to
// Telegram is lost ~1 in 6 times from the hosting, IPv6 is stable.
function sendMobileGuestOrderTelegram(string $text): bool {
    if (!defined('BOT_TOKEN') || !defined('CHAT_ID') || !BOT_TOKEN || !CHAT_ID) {
        return false;
    }
    $payload = json_encode(['chat_id' => CHAT_ID, 'text' => $text, 'parse_mode' => 'HTML'], JSON_UNESCAPED_UNICODE);
    $ips = array_values(array_unique([
        defined('TG_FORCE_IP') && TG_FORCE_IP ? TG_FORCE_IP : '149.154.167.220',
        '[2001:67c:4e8:f004::9]',
    ]));
    $data = null;
    foreach ($ips as $ip) {
        $ch = curl_init('https://api.telegram.org/bot' . BOT_TOKEN . '/sendMessage');
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_RESOLVE => ['api.telegram.org:443:' . $ip],
        ]);
        $response = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        $data = json_decode((string)$response, true);
        if ($code > 0) break; // Telegram answered — another route won't help
    }
    return (bool)($data['ok'] ?? false);
}

function notifyManagerAboutGuestOrder(int $guestId, string $name, string $phone, array $items, int $total, string $comment = '', string $clientTg = ''): array {
    $result = ['tg' => false, 'email' => false];
    try {
        require_once __DIR__ . '/app_config.php';
        $result['tg'] = sendMobileGuestOrderTelegram(mobileGuestOrderTelegramText($guestId, $name, $phone, $items, $total, $comment, $clientTg));
        if (defined('EMAIL_TO') && EMAIL_TO) {
            $subject = '=?UTF-8?B?' . base64_encode('Новая заявка СплитХаб (гость, приложение) — ' . $name . ' — ' . mobileOrderMoney($total) . ' руб') . '?=';
            $headers = "From: =?UTF-8?B?" . base64_encode('СплитХаб') . "?= <zakaz@splithub.ru>\r\n";
            $headers .= "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
            $result['email'] = @mail(EMAIL_TO, $subject, mobileGuestOrderEmailHtml($guestId, $name, $phone, $items, $total, $comment, $clientTg), $headers);
        }
        error_log('[SplitHub mobile guest order] tg=' . ($result['tg'] ? 'ok' : 'fail') . ' mail=' . ($result['email'] ? 'ok' : 'fail') . ' guest=' . $guestId);
    } catch (Throwable $e) {
        error_log('Mobile guest order notification failed: ' . $e->getMessage());
    }
    return $result;
}
