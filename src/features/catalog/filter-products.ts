import type { Product } from './types';
import { filterByQuickFilter } from './quick-filters';

export function filterProducts(products: Product[], search: string, group: string) {
  const needle = search.trim().toLocaleLowerCase('ru');
  return filterByQuickFilter(products, group).filter(
    (product) =>
      (!needle ||
        `${product.brand} ${product.model}`.toLocaleLowerCase('ru').includes(needle)),
  );
}
