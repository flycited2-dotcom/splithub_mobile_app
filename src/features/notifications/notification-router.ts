export function notificationTarget(data: Record<string, unknown>) {
  if (data.type === 'order_status' && data.order_id) {
    return `/order/${data.order_id}`;
  }
  if (data.type === 'promotion') {
    return `/catalog?filter=${encodeURIComponent(String(data.category ?? ''))}&mode=flat`;
  }
  if (data.type === 'manager_message') {
    return String(data.telegram_url ?? 'https://t.me/Byttehnikaopt');
  }
  return '/';
}
