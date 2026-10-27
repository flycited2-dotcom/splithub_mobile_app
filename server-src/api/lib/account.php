<?php
// Personal account features of the website (api/auth.php update_requisites / history)
// for the app: company requisites and order history filters.
require_once __DIR__ . '/../../db/init.php';

const MOBILE_ORDER_STATUSES = ['new', 'confirmed', 'in_progress', 'shipped', 'completed', 'cancelled'];

function mobileRequisitesInput(array $data): array {
    $inn = trim((string)($data['inn'] ?? ''));
    $kpp = trim((string)($data['kpp'] ?? ''));
    if ($inn !== '' && !preg_match('/^\d{10}(\d{2})?$/', $inn)) {
        return ['ok' => false, 'code' => 'INVALID_INN'];
    }
    if ($kpp !== '' && !preg_match('/^\d{9}$/', $kpp)) {
        return ['ok' => false, 'code' => 'INVALID_KPP'];
    }
    return [
        'ok' => true,
        'company_name' => mb_substr(trim((string)($data['company_name'] ?? '')), 0, 255),
        'inn' => $inn,
        'kpp' => $kpp,
        'legal_address' => mb_substr(trim((string)($data['legal_address'] ?? '')), 0, 500),
    ];
}

// Returns [where clauses, params] for status / period / "#SH-00042" search, like the site.
function mobileOrdersFilter(array $get): array {
    $where = [];
    $params = [];
    $status = trim((string)($get['status'] ?? ''));
    if (in_array($status, MOBILE_ORDER_STATUSES, true)) {
        $where[] = 'status = ?';
        $params[] = $status;
    }
    $periods = ['30d' => '-30 days', '3m' => '-3 months', '1y' => '-1 year'];
    $period = (string)($get['period'] ?? '');
    if (isset($periods[$period])) {
        $where[] = "created_at >= datetime('now','" . $periods[$period] . "')";
    }
    $search = preg_replace('/^(SH-?|#)/i', '', trim((string)($get['search'] ?? '')));
    if ($search !== '' && ctype_digit($search)) {
        $where[] = 'id = ?';
        $params[] = (int)$search;
    }
    return [$where, $params];
}

function mobileOrdersPage(int $uid, array $get, int $perPage = 20): array {
    [$where, $params] = mobileOrdersFilter($get);
    $whereSql = 'WHERE ' . implode(' AND ', array_merge(['user_id = ?'], $where));
    $params = array_merge([$uid], $params);
    $page = max(1, (int)($get['page'] ?? 1));
    $offset = ($page - 1) * $perPage;
    $db = getDB();
    $count = $db->prepare("SELECT COUNT(*) FROM orders $whereSql");
    $count->execute($params);
    $stmt = $db->prepare("SELECT id,total,status,comment,created_at FROM orders $whereSql
                          ORDER BY created_at DESC, id DESC LIMIT $perPage OFFSET $offset");
    $stmt->execute($params);
    return ['orders' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'total' => (int)$count->fetchColumn(), 'page' => $page];
}

function mobileUpdateRequisites(int $uid, array $requisites): void {
    getDB()->prepare('UPDATE users SET company_name = ?, inn = ?, kpp = ?, legal_address = ? WHERE id = ?')
        ->execute([$requisites['company_name'], $requisites['inn'], $requisites['kpp'], $requisites['legal_address'], $uid]);
}
