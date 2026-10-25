import type { Product } from './types';

export type PromoBadge = { label: string; backgroundColor: string };

// Admin badges from the website (.pb-new / .pb-sale / .pb-clearance in index.html).
const PROMO_BADGES: Record<string, PromoBadge> = {
  new: { label: 'Новинка', backgroundColor: 'rgba(22,163,74,0.9)' },
  sale: { label: 'Акция', backgroundColor: 'rgba(245,158,11,0.95)' },
  clearance: { label: 'Распродажа', backgroundColor: 'rgba(239,68,68,0.9)' },
};

// A custom admin label wins; an unknown code is shown only when it has a label.
export function promoBadge(product: Pick<Product, 'badge' | 'badge_label'>): PromoBadge | null {
  const code = product.badge?.trim();
  if (!code) return null;
  const known = PROMO_BADGES[code];
  const label = product.badge_label?.trim() || known?.label;
  if (!label) return null;
  return { label, backgroundColor: known?.backgroundColor ?? PROMO_BADGES.sale.backgroundColor };
}

// The website disables the order button only for "out" products.
export function isOrderable(product: Pick<Product, 'stock'>) {
  return product.stock !== 'out';
}
