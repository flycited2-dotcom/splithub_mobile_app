import type { CatalogSection } from './group-products';
import type { Product } from './types';

export type CatalogRow =
  | { type: 'section'; id: string; label: string }
  | { type: 'brand'; id: string; name: string; factory?: string }
  | { type: 'series'; id: string; name: string; description?: string }
  | { type: 'products'; id: string; products: Product[] };

export function catalogRows(sections: CatalogSection[], columns = 2): CatalogRow[] {
  const columnCount = Math.max(1, columns);
  const rows: CatalogRow[] = [];

  sections.forEach((section) => {
    rows.push({
      type: 'section',
      id: `section-${section.id}`,
      label: section.label,
    });

    section.brands.forEach((brand) => {
      rows.push({
        type: 'brand',
        id: `brand-${section.id}-${brand.name}`,
        name: brand.name,
        factory: brand.factory,
      });

      brand.series.forEach((series) => {
        rows.push({
          type: 'series',
          id: `series-${section.id}-${brand.name}-${series.name}`,
          name: series.name,
          description: series.description,
        });

        for (let index = 0; index < series.products.length; index += columnCount) {
          rows.push({
            type: 'products',
            id: `products-${section.id}-${brand.name}-${series.name}-${index / columnCount}`,
            products: series.products.slice(index, index + columnCount),
          });
        }
      });
    });
  });

  return rows;
}
