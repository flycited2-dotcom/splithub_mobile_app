import type { OrderStatus } from './types';

export type OrderStatusBadgeStyle = {
  backgroundColor: string;
  borderColor: string;
  color: string;
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  in_progress: 'В работе',
  shipped: 'Отгружен',
  completed: 'Выполнен',
  cancelled: 'Отменён',
};

export const orderStatusColors: Record<OrderStatus, OrderStatusBadgeStyle> = {
  new: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
    color: '#1D4ED8',
  },
  confirmed: {
    backgroundColor: '#FFEDD5',
    borderColor: '#FDBA74',
    color: '#C2410C',
  },
  in_progress: {
    backgroundColor: '#FFEDD5',
    borderColor: '#FDBA74',
    color: '#C2410C',
  },
  shipped: {
    backgroundColor: '#FFEDD5',
    borderColor: '#FDBA74',
    color: '#C2410C',
  },
  completed: {
    backgroundColor: '#DCFCE7',
    borderColor: '#22C55E',
    color: '#15803D',
  },
  cancelled: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    color: '#B91C1C',
  },
};

// Server may send an unknown status string; fall back to the raw value instead of "undefined".
export function orderStatusLabel(status: OrderStatus): string {
  return orderStatusLabels[status] ?? String(status);
}

export function orderStatusBadgeStyle(status: OrderStatus): OrderStatusBadgeStyle {
  return orderStatusColors[status] ?? orderStatusColors.new;
}
