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
