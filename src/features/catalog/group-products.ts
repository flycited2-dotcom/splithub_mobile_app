import { splitByStock } from './stock-tiers';
import type { Product } from './types';

export type CatalogSeries = {
  name: string;
  description?: string;
  products: Product[];
};

export type CatalogBrand = {
  name: string;
  factory?: string;
  // Consumables and pipes: one grid per brand without series headers.
  flat: boolean;
  series: CatalogSeries[];
};

export type CatalogTier = {
  key: string;
  label: string;
  count: number;
  brands: CatalogBrand[];
};

export type CatalogSection = {
  id: string;
  label: string;
  tiers: CatalogTier[];
};

// Same order, labels and block rules as renderAll()/brandBlocksHtml() on the website.
const groupOrder = ['inv', 'onoff', 'pac_inv', 'pac_onoff', 'truba', 'poluprom', 'rashod', 'multi'];

const groupLabels: Record<string, string> = {
  inv: 'ИНВЕРТОРНЫЕ',
  onoff: 'ON/OFF',
  pac_inv: 'ПОЛУПРОМ ИНВЕРТОР',
  pac_onoff: 'ПОЛУПРОМ ON/OFF',
  truba: 'МЕДНАЯ ТРУБА',
  poluprom: 'ПОЛУПРОМ',
  rashod: 'РАСХОДНИКИ',
  multi: 'ЧЁРНЫЕ СПЛИТЫ',
};

const flatGroups = new Set(['rashod', 'truba', 'poluprom', 'mobile']);
const drainCodes = new Set(['dmetplst', 'drenazhg']);
const fastenerCodes = new Set(['glh', 'kpo', 'blt', 'gka', 'shba', 'db']);

function brandBlockName(product: Product) {
  if (drainCodes.has(product.brandCode ?? '')) return 'Дренаж';
  if (fastenerCodes.has(product.brandCode ?? '')) return 'Крепеж (болты, гайки)';
  return product.brand;
}

// The series already says its type ("HARUKI inverter") — don't repeat it.
function seriesTitle(group: string, series: string) {
  if (group === 'inv') return /invert[eo]r|инвертор/i.test(series) ? series : `${series} Inverter`;
  if (group === 'onoff') return /on\s*\/\s*off/i.test(series) ? series : `${series} On/Off`;
  return series;
}

function brandBlocks(group: string, products: Product[]): CatalogBrand[] {
  const blocks = new Map<string, { factories: Set<string>; series: Map<string, CatalogSeries> }>();
  products.forEach((product) => {
    const name = brandBlockName(product);
    let block = blocks.get(name);
    if (!block) {
      block = { factories: new Set(), series: new Map() };
      blocks.set(name, block);
    }
    if (product.factory) block.factories.add(product.factory);
    const seriesName = product.series || 'Другие модели';
    let series = block.series.get(seriesName);
    if (!series) {
      series = { name: seriesTitle(group, seriesName), description: product.cardBenef, products: [] };
      block.series.set(seriesName, series);
    }
    series.products.push(product);
  });

  const flat = flatGroups.has(group);
  return [...blocks].map(([name, block]) => ({
    name,
    // After merging series one block may hold several factories; show it only if there is one.
    factory: block.factories.size === 1 ? [...block.factories][0] : undefined,
    flat,
    series: flat
      ? [{ name, products: [...block.series.values()].flatMap((series) => series.products) }]
      : [...block.series.values()],
  }));
}

export function groupProducts(products: Product[]): CatalogSection[] {
  const byGroup = new Map<string, Product[]>();
  products.forEach((product) => {
    const list = byGroup.get(product.group) ?? [];
    list.push(product);
    byGroup.set(product.group, list);
  });
  const order = [...groupOrder, ...[...byGroup.keys()].filter((group) => !groupOrder.includes(group))];

  return order.flatMap((group) => {
    const matching = byGroup.get(group);
    if (!matching) return [];
    return [{
      id: group,
      label: groupLabels[group] ?? group.toUpperCase(),
      tiers: splitByStock(matching).map((tier) => ({
        key: tier.key,
        label: tier.label,
        count: tier.products.length,
        brands: brandBlocks(group, tier.products),
      })),
    }];
  });
}
