import type { Product } from './types';

type TitleInput = Pick<Product, 'group' | 'brand' | 'model'> & Partial<Pick<Product, 'series'>>;

// Build a full, unambiguous product name for the cart and orders.
// - Splits/consumables: prefix the brand (e.g. "Midea MDSAG-09HRDN8") so it is not just a model code.
// - Copper pipe (group "truba"): the model is identical for ГОСТ and среднестенная, so the wall type
//   (series, e.g. "Толстая (ГОСТ) 15 м." vs "Средняя 15 м.") MUST be shown to avoid mix-ups.
export function productTitle(product: TitleInput): string {
  const model = product.model?.trim() ?? '';

  if (product.group === 'truba') {
    const series = product.series?.trim();
    return series ? `${model} · ${series}` : model;
  }

  const brand = product.brand?.trim();
  // Prefix the brand only when the model does not already contain it (avoids "Ballu ... Ballu").
  if (brand && !model.toLowerCase().includes(brand.toLowerCase())) {
    return `${brand} ${model}`;
  }
  return model;
}
