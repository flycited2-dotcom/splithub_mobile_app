import {
  countPurchasedOrders,
  isPurchasedOrder,
  orderStatusBadgeStyle,
  orderStatusColors,
  orderStatusLabel,
  orderStatusLabels,
} from '../src/features/orders/order-status';
import type { OrderStatus } from '../src/features/orders/types';

describe('order status', () => {
  it('localizes every known status to Russian', () => {
    expect(orderStatusLabel('new')).toBe('Новый');
    expect(orderStatusLabel('confirmed')).toBe('Подтверждён');
    expect(orderStatusLabel('in_progress')).toBe('В работе');
    expect(orderStatusLabel('shipped')).toBe('Отгружен');
    expect(orderStatusLabel('completed')).toBe('Выполнен');
    expect(orderStatusLabel('cancelled')).toBe('Отменён');
  });

  it('falls back to the raw value for an unknown status', () => {
    expect(orderStatusLabel('pending' as OrderStatus)).toBe('pending');
  });

  it('uses the green badge for completed and never returns undefined', () => {
    expect(orderStatusColors.completed.backgroundColor).toBe('#DCFCE7');
    expect(orderStatusBadgeStyle('confirmed')).toEqual(orderStatusColors.confirmed);
    expect(orderStatusBadgeStyle('pending' as OrderStatus)).toEqual(orderStatusColors.new);
  });

  it('covers all statuses present in labels with colors', () => {
    expect(Object.keys(orderStatusColors).sort()).toEqual(Object.keys(orderStatusLabels).sort());
  });
});

describe('purchased orders', () => {
  it('treats confirmed/in_progress/shipped/completed as real purchases', () => {
    expect(isPurchasedOrder('confirmed')).toBe(true);
    expect(isPurchasedOrder('in_progress')).toBe(true);
    expect(isPurchasedOrder('shipped')).toBe(true);
    expect(isPurchasedOrder('completed')).toBe(true);
  });

  it('excludes freshly added (new) and cancelled orders', () => {
    expect(isPurchasedOrder('new')).toBe(false);
    expect(isPurchasedOrder('cancelled')).toBe(false);
  });

  it('counts only real purchases in a mixed list', () => {
    const orders: { status: OrderStatus }[] = [
      { status: 'new' },
      { status: 'cancelled' },
      { status: 'confirmed' },
      { status: 'shipped' },
      { status: 'completed' },
    ];
    expect(countPurchasedOrders(orders)).toBe(3);
  });
});
