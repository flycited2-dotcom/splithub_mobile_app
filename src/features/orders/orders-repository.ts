import { api } from '../../lib/api';
import type { Order } from './types';

export const orderDetailsQuery = (id: number) => ({ id: String(id) });

export type OrdersFilter = { status?: string; period?: string; search?: string };

// Only non-empty filters go to the server (status / period / "#SH-00042" search, as on the site).
export function ordersQuery(filter: OrdersFilter): Record<string, string> {
  const query: Record<string, string> = {};
  for (const key of ['status', 'period', 'search'] as const) {
    const value = filter[key]?.trim();
    if (value) query[key] = value;
  }
  return query;
}

export const listOrders = (filter: OrdersFilter = {}) =>
  api<{ orders: Order[]; total?: number }>('orders', {}, ordersQuery(filter));

export const loadOrder = (id: number) =>
  api<{ order: Order }>('order', {}, orderDetailsQuery(id));

export const repeatOrder = (id: number) =>
  api<{ items: { id: string; qty: number }[] }>('repeat_order', {
    method: 'POST',
    body: JSON.stringify({ order_id: id }),
  });

export const cancelOrder = (id: number, reason: string) =>
  api('cancel_order', {
    method: 'POST',
    body: JSON.stringify({ order_id: id, reason }),
  });
