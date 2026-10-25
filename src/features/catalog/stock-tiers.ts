import type { Product } from './types';

// Mirrors STOCK_TIERS in the website's index.html: in every section and filter
// what is on the shelf goes first, then by lead time. Only the stock status matters.
export const stockTiers = [
  { key: 'in_stock', label: '✓ В наличии на складе' },
  { key: 'days_1_2', label: 'Под заказ · 1–2 дня' },
  { key: 'days_3_5', label: 'Под заказ · 3–5 дней' },
  { key: 'days_7', label: 'Под заказ · 7 дней' },
  { key: 'order_7', label: 'Под заказ · от 7 дней' },
  { key: 'wait', label: 'Ожидается' },
  { key: 'other', label: 'Уточняйте наличие' },
  { key: 'out', label: 'Нет в наличии' },
] as const;

export type StockTierKey = (typeof stockTiers)[number]['key'];

const tierIndex = new Map<string, number>(stockTiers.map((tier, index) => [tier.key, index]));

export function stockTierIndex(product: Pick<Product, 'stock'>) {
  return tierIndex.get(product.stock) ?? tierIndex.get('other')!;
}

// Non-empty tiers in website order; catalog order is kept inside a tier.
export function splitByStock<T extends Pick<Product, 'stock'>>(products: T[]) {
  const buckets = stockTiers.map(() => [] as T[]);
  products.forEach((product) => buckets[stockTierIndex(product)].push(product));
  return stockTiers.flatMap((tier, index) =>
    buckets[index].length ? [{ key: tier.key, label: tier.label, products: buckets[index] }] : [],
  );
}

export function positionsText(count: number) {
  const m10 = count % 10;
  const m100 = count % 100;
  const word = m10 === 1 && m100 !== 11
    ? 'позиция'
    : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'позиции' : 'позиций';
  return `${count} ${word}`;
}
