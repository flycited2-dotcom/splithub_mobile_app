import type { Product } from './types';

export type QuickFilter = {
  id: string;
  label: string;
  matches: (product: Product) => boolean;
};

const inList = (value: string | undefined, values: string[]) =>
  Boolean(value && values.includes(value));

const semiIndustrial = (product: Product) =>
  product.group === 'pac_inv' || product.group === 'pac_onoff';

export const quickFilters: QuickFilter[] = [
  { id: 'inv79', label: 'Инвертор 7–9', matches: (p) => p.group === 'inv' && inList(p.btu, ['07', '09']) },
  { id: 'inv12', label: 'Инвертор 12', matches: (p) => p.group === 'inv' && p.btu === '12' },
  { id: 'inv18', label: 'Инвертор 18', matches: (p) => p.group === 'inv' && p.btu === '18' },
  { id: 'inv2436', label: 'Инвертор 24–36', matches: (p) => p.group === 'inv' && inList(p.btu, ['24', '30', '36']) },
  { id: 'on79', label: 'On/Off 7–9', matches: (p) => p.group === 'onoff' && inList(p.btu, ['07', '09']) },
  { id: 'on12', label: 'On/Off 12', matches: (p) => p.group === 'onoff' && p.btu === '12' },
  { id: 'on18', label: 'On/Off 18', matches: (p) => p.group === 'onoff' && p.btu === '18' },
  { id: 'on2436', label: 'On/Off 24–36', matches: (p) => p.group === 'onoff' && inList(p.btu, ['24', '28', '30', '36']) },
  { id: 'truba', label: 'Медная труба', matches: (p) => p.group === 'truba' },
  { id: 'rashod', label: 'Расходники', matches: (p) => p.group === 'rashod' },
  { id: 'poluprom', label: 'Полупром', matches: (p) => ['poluprom', 'pac_inv', 'pac_onoff'].includes(p.group) },
  {
    id: 'pac_kasseta',
    label: 'Кассетные',
    matches: (p) => semiIndustrial(p) && (p.type === 'cassette' || /кассет|cassette/i.test(p.series || '')),
  },
  {
    id: 'pac_kanalny',
    label: 'Канальные',
    matches: (p) => semiIndustrial(p) && (p.type === 'duct' || /канальн|duct/i.test(p.series || '')),
  },
  {
    id: 'pac_napolno',
    label: 'Напольно-потолочные',
    matches: (p) => semiIndustrial(p) && (p.type === 'floor-ceiling' || /напольно-потолочн|floor.?ceiling/i.test(p.series || '')),
  },
  { id: 'pac_multi', label: 'Мульти-сплит', matches: (p) => p.group === 'multi' || p.type === 'mult' },
  { id: 'multi', label: 'Чёрные сплиты', matches: (p) => p.group === 'multi' || p.group === 'black' || p.color === 'black' },
];

export const homeQuickFilterIds = [
  'inv79',
  'inv12',
  'inv18',
  'inv2436',
  'on79',
  'on12',
  'on18',
  'on2436',
  'truba',
  'rashod',
  'poluprom',
  'multi',
];

export const polupromQuickFilterIds = ['pac_kasseta', 'pac_kanalny', 'pac_napolno', 'pac_multi'];

export function filterByQuickFilter(products: Product[], filterId: string) {
  const filter = quickFilters.find((item) => item.id === filterId);
  return filter
    ? products.filter(filter.matches)
    : products.filter((product) => !filterId || product.group === filterId);
}
