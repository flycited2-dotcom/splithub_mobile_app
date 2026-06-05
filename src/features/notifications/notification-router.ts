const DEFAULT_MANAGER_URL = 'https://t.me/Byttehnikaopt';
const TRUSTED_MANAGER_HOSTS = new Set(['t.me', 'splithub.ru', 'www.splithub.ru']);

function trustedManagerUrl(value: unknown) {
  const raw = String(value ?? DEFAULT_MANAGER_URL);
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || !TRUSTED_MANAGER_HOSTS.has(url.hostname.toLowerCase())) {
      return DEFAULT_MANAGER_URL;
    }
    return raw;
  } catch {
    return DEFAULT_MANAGER_URL;
  }
}

export function notificationTarget(data: Record<string, unknown>) {
  if (data.type === 'order_status' && data.order_id) {
    return `/order/${data.order_id}`;
  }
  if (data.type === 'promotion') {
    if (data.product_id) {
      return `/product/${encodeURIComponent(String(data.product_id))}`;
    }
    return data.category
      ? `/catalog?filter=${encodeURIComponent(String(data.category))}&mode=flat`
      : '/catalog?mode=flat';
  }
  if (data.type === 'manager_message') {
    return trustedManagerUrl(data.telegram_url);
  }
  return '/';
}
