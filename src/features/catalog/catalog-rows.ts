import type { CatalogSection } from './group-products';
import { splitByStock } from './stock-tiers';
import type { Product } from './types';

export type CatalogRow =
  | { type: 'section'; id: string; label: string }
  | { type: 'tier'; id: string; key: string; label: string; count: number }
  | { type: 'brand'; id: string; name: string; factory?: string }
  | { type: 'series'; id: string; name: string; description?: string }
  | { type: 'products'; id: string; products: Product[] };

function productRows(idPrefix: string, products: Product[], columns: number): CatalogRow[] {
  const rows: CatalogRow[] = [];
  for (let index = 0; index < products.length; index += columns) {
    rows.push({
      type: 'products',
      id: `${idPrefix}-${index / columns}`,
      products: products.slice(index, index + columns),
    });
  }
  return rows;
}

// Full catalog: section → stock tier → brand → series → cards (website renderAll()).
export function catalogRows(sections: CatalogSection[], columns = 2): CatalogRow[] {
  const columnCount = Math.max(1, columns);
  const rows: CatalogRow[] = [];

  sections.forEach((section) => {
    rows.push({ type: 'section', id: `section-${section.id}`, label: section.label });

    section.tiers.forEach((tier) => {
      const tierId = `${section.id}-${tier.key}`;
      rows.push({ type: 'tier', id: `tier-${tierId}`, key: tier.key, label: tier.label, count: tier.count });

      tier.brands.forEach((brand) => {
        rows.push({ type: 'brand', id: `brand-${tierId}-${brand.name}`, name: brand.name, factory: brand.factory });

        brand.series.forEach((series) => {
          if (!brand.flat) {
            rows.push({
              type: 'series',
              id: `series-${tierId}-${brand.name}-${series.name}`,
              name: series.name,
              description: series.description,
            });
          }
          rows.push(...productRows(`products-${tierId}-${brand.name}-${series.name}`, series.products, columnCount));
        });
      });
    });
  });

  return rows;
}

// Filter results: a dense grid of all matching cards, split by stock tier, no brand headers.
export function filteredRows(products: Product[], columns = 2): CatalogRow[] {
  const columnCount = Math.max(1, columns);
  return splitByStock(products).flatMap((tier) => [
    { type: 'tier' as const, id: `tier-${tier.key}`, key: tier.key, label: tier.label, count: tier.products.length },
    ...productRows(`products-${tier.key}`, tier.products, columnCount),
  ]);
}
