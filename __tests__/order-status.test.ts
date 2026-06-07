import {
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
