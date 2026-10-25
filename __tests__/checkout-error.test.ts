import { checkoutError } from '../src/features/cart/checkout-error';

test('a rejected or missing session asks to log in instead of blaming the connection', () => {
  // api() turns every HTTP 401 into SESSION_EXPIRED, the server sends AUTH_REQUIRED.
  for (const code of ['SESSION_EXPIRED', 'AUTH_REQUIRED']) {
    expect(checkoutError(code)).toEqual({
      code: 'AUTH_REQUIRED',
      message: 'Войдите в аккаунт, чтобы оформить заказ.',
    });
  }
});

test('catalog changes keep their own messages', () => {
  expect(checkoutError('CATALOG_CHANGED').message).toMatch(/Цена или наличие изменились/);
  expect(checkoutError('PRODUCT_UNAVAILABLE').message).toMatch(/больше недоступен/);
});

test('only real network failures mention the connection', () => {
  expect(checkoutError('NETWORK_ERROR').message).toMatch(/Проверьте подключение/);
  expect(checkoutError('REQUEST_TIMEOUT').message).toMatch(/Проверьте подключение/);
  expect(checkoutError('HTTP_500').message).toBe('Сервер не принял заявку. Попробуйте ещё раз или позвоните: +7 978 599-13-69');
});
