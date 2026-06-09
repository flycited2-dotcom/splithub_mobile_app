<?php
/**
 * Разовая push-кампания: попросить пользователей без email привязать его.
 * Получатели: активные устройства, чей пользователь не имеет email.
 *
 * Запуск на сервере (прод-БД):
 *   php tools/push_attach_email.php           # DRY-RUN: только счётчик получателей
 *   php tools/push_attach_email.php --send    # реальная отправка
 *
 * ВНИМАНИЕ: --send рассылает живым пользователям. Отправлять только после
 * широкой установки приложения (RuStore) и согласования текста.
 */
require_once __DIR__ . '/../db/init.php';

$send = in_array('--send', $argv, true);
$db = getDB();
$rows = $db->query(
    "SELECT DISTINCT d.user_id
       FROM mobile_devices d
       JOIN users u ON u.id = d.user_id
      WHERE d.active = 1 AND (u.email IS NULL OR u.email = '')"
)->fetchAll();

echo count($rows) . " получателей без email с активным устройством\n";
if (!$send) {
    echo "DRY-RUN. Реальная отправка: php tools/push_attach_email.php --send\n";
    exit(0);
}

require_once __DIR__ . '/../api/lib/push.php';
$title = 'Обновите безопасность';
$body  = 'Привяжите email в профиле, чтобы не потерять доступ к аккаунту, если забудете пароль.';
$sent = 0;
foreach ($rows as $r) {
    try { sendUserPush((int)$r['user_id'], 'promotion', $title, $body, ['screen' => 'profile']); $sent++; }
    catch (Throwable $e) { /* пропускаем сбойные устройства */ }
}
echo "Отправлено: $sent\n";
