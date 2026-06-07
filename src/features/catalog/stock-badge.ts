import type { Product } from './types';

export type StockBadgeStyle = {
  label: string;
  backgroundColor: string;
  borderColor: string;
  color: string;
};

// Mirrors the website's stock badges (index.html .sb-* classes): a translucent
// "glass" chip with a colored outline so the availability is unmistakable.
// Borders are a touch stronger than the web (which relies on backdrop-blur that
// React Native lacks) to keep the contour visible on the card background.
const STOCK_BADGES: Record<string, StockBadgeStyle> = {
  in_stock: {
    label: '✓ В наличии',
    backgroundColor: 'rgba(209,250,229,0.65)',
    borderColor: 'rgba(16,185,129,0.55)',
    color: '#047857',
  },
  days_1_2: {
    label: 'Под заказ · 1–2 дня',
    backgroundColor: 'rgba(255,228,236,0.7)',
    borderColor: 'rgba(244,114,182,0.55)',
    color: '#BE185D',
  },
  days_3_5: {
    label: 'Под заказ · 3–5 дней',
    backgroundColor: 'rgba(255,196,215,0.65)',
    borderColor: 'rgba(236,72,153,0.55)',
    color: '#9D174D',
  },
  order_7: {
    label: 'Под заказ · 7 дней',
    backgroundColor: 'rgba(254,243,199,0.75)',
    borderColor: 'rgba(245,158,11,0.6)',
    color: '#B45309',
  },
  out: {
    label: 'Нет в наличии',
    backgroundColor: 'rgba(241,245,249,0.7)',
    borderColor: 'rgba(156,163,175,0.5)',
    color: '#6B7280',
  },
};

// Build the availability badge for a product. Unknown codes fall back to the
// server-provided label (or "В наличии") with the neutral in-stock style,
// matching the website's default.
export function stockBadge(product: Pick<Product, 'stock' | 'stockLabel'>): StockBadgeStyle {
  const known = STOCK_BADGES[product.stock];
  if (known) return known;
  return {
    ...STOCK_BADGES.in_stock,
    label: product.stockLabel?.trim() || STOCK_BADGES.in_stock.label,
  };
}
