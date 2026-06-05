import { notificationTarget } from '../src/features/notifications/notification-router';

test('routes order status notification to order details', () => {
  expect(notificationTarget({ type: 'order_status', order_id: 42 })).toBe('/order/42');
});

test('routes promotion to filtered catalog', () => {
  expect(notificationTarget({ type: 'promotion', category: 'inv79' })).toBe('/catalog?filter=inv79&mode=flat');
});

test('routes product promotion to product details', () => {
  expect(notificationTarget({ type: 'promotion', product_id: 'mdv-09' })).toBe('/product/mdv-09');
});

test('routes promotion without category to the full catalog', () => {
  expect(notificationTarget({ type: 'promotion' })).toBe('/catalog?mode=flat');
});

test('routes manager messages only to trusted domains', () => {
  expect(notificationTarget({
    type: 'manager_message',
    telegram_url: 'https://t.me/Byttehnikaopt',
  })).toBe('https://t.me/Byttehnikaopt');
  expect(notificationTarget({
    type: 'manager_message',
    telegram_url: 'https://splithub.ru/orders/47',
  })).toBe('https://splithub.ru/orders/47');
  expect(notificationTarget({
    type: 'manager_message',
    telegram_url: 'https://evil.example/phishing',
  })).toBe('https://t.me/Byttehnikaopt');
});
