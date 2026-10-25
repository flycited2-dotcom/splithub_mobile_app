export type CheckoutError = { code: string; message: string };

// api() turns every HTTP 401 into SESSION_EXPIRED, while create_order answers
// AUTH_REQUIRED: both mean "log in", never "check your connection".
export function checkoutError(rawCode: string): CheckoutError {
  const code = rawCode === 'SESSION_EXPIRED' ? 'AUTH_REQUIRED' : rawCode;
  if (code === 'AUTH_REQUIRED') return { code, message: 'Войдите в аккаунт, чтобы оформить заказ.' };
  if (code === 'INVALID_GUEST') return { code, message: 'Укажите имя и телефон' };
  if (code === 'CATALOG_CHANGED') return { code, message: 'Цена или наличие изменились. Проверьте корзину перед повторной отправкой.' };
  if (code === 'PRODUCT_UNAVAILABLE') return { code, message: 'Один из товаров больше недоступен. Обновите корзину.' };
  if (code === 'NETWORK_ERROR' || code === 'REQUEST_TIMEOUT') {
    return { code, message: 'Не удалось оформить заказ. Проверьте подключение и повторите попытку.' };
  }
  return { code, message: 'Сервер не принял заявку. Попробуйте ещё раз или позвоните: +7 978 599-13-69' };
}
