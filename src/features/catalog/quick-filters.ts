import type { Product } from './types';

// Mirrors FILTER_MAP / FILTER_FAMILIES / RASHOD_CATS of the website's index.html.
export type QuickFilter = {
  id: string;
  label: string;
  // Shorter label for the home screen button.
  button?: string;
  // Sub-filter set shown above the results, and this filter's chip text in it.
  family?: string;
  chip?: string;
  matches: (product: Product) => boolean;
};

// BTU is compared as a number, so a button catches every size in its range (e.g. 28).
const btuIn = (product: Product, lo: number, hi: number) => {
  const value = parseInt(product.btu ?? '', 10);
  return value >= lo && value <= hi;
};

const isPac = (product: Product) => ['poluprom', 'pac_inv', 'pac_onoff'].includes(product.group);

// Some semi-industrial cards have a generic type ("split") and the kind only in the series.
const pacKind = (product: Product, type: string, pattern: RegExp) =>
  isPac(product) && (product.type === type || pattern.test(product.series || ''));

const rashodCats = [
  { key: 'r_drain', label: 'Дренаж', codes: ['dmetplst', 'drenazhg'], pattern: /дренаж|металлопласт|гофр|капилляр/i },
  { key: 'r_pump', label: 'Дренажные насосы', codes: ['dnasos', 'zimkit'], pattern: /насос|зимний комплект|антисифон/i },
  { key: 'r_kron', label: 'Кронштейны', codes: ['kron'], pattern: /кронштейн/i },
  { key: 'r_podst', label: 'Подставки и козырьки', codes: ['podst'], pattern: /подставк|опор[аы]|козыр/i },
  { key: 'r_freon', label: 'Фреон', codes: ['freon'], pattern: /фреон|хладагент/i },
  { key: 'r_fit', label: 'Фитинги для меди', codes: ['fiting'], pattern: /фитинг|рефнет|муфт|латун/i },
  { key: 'r_solder', label: 'Припой и газ', codes: ['pripoy'], pattern: /припой|mapp/i },
  { key: 'r_tape', label: 'Ленты и изолента', codes: ['tpl'], pattern: /лент|изолент|скотч/i },
  { key: 'r_insul', label: 'Теплоизоляция', codes: ['tfx'], pattern: /терма|теплоизол|k-?flex/i },
  { key: 'r_cable', label: 'Кабель', codes: ['provod'], pattern: /кабел|провод|пвс/i },
  { key: 'r_krep', label: 'Крепёж', codes: ['glh', 'kpo', 'blt', 'gka', 'shba', 'db'], pattern: /болт|гайк|шайб|дюбел|глухар|анкер|саморез/i },
  { key: 'r_other', label: 'Прочее', codes: [], pattern: null },
];

// By name, pumps are checked before drain ("Дренажные насосы"), fittings before fasteners ("Гайка латунная").
const rashodGuessOrder = ['r_pump', 'r_drain', 'r_kron', 'r_podst', 'r_freon', 'r_fit', 'r_solder', 'r_tape', 'r_insul', 'r_cable', 'r_krep'];
const rashodByCode = new Map(rashodCats.flatMap((cat) => cat.codes.map((code) => [code, cat.key] as const)));
const rashodByKey = new Map(rashodCats.map((cat) => [cat.key, cat]));

export function rashodCategory(product: Product): string | null {
  if (product.group !== 'rashod') return null;
  const byCode = rashodByCode.get(product.brandCode ?? '');
  if (byCode) return byCode;
  const text = [product.brand, product.series, product.model].join(' ');
  return rashodGuessOrder.find((key) => rashodByKey.get(key)!.pattern!.test(text)) ?? 'r_other';
}

export const quickFilters: QuickFilter[] = [
  { id: 'inv', label: 'Инверторные', family: 'inv', chip: 'Все инверторные', matches: (p) => p.group === 'inv' },
  { id: 'inv79', label: 'Инвертор 7–9 BTU', button: 'Инвертор 7–9', family: 'inv', chip: '7–9', matches: (p) => p.group === 'inv' && btuIn(p, 1, 10) },
  { id: 'inv12', label: 'Инвертор 12 BTU', button: 'Инвертор 12', family: 'inv', chip: '12', matches: (p) => p.group === 'inv' && btuIn(p, 11, 14) },
  { id: 'inv18', label: 'Инвертор 18 BTU', button: 'Инвертор 18', family: 'inv', chip: '18', matches: (p) => p.group === 'inv' && btuIn(p, 15, 21) },
  { id: 'inv2436', label: 'Инвертор 24–36 BTU', button: 'Инвертор 24–36', family: 'inv', chip: '24–36', matches: (p) => p.group === 'inv' && btuIn(p, 22, 99) },
  { id: 'onoff', label: 'On/Off', family: 'onoff', chip: 'Все On/Off', matches: (p) => p.group === 'onoff' },
  { id: 'on79', label: 'On/Off 7–9 BTU', button: 'On/Off 7–9', family: 'onoff', chip: '7–9', matches: (p) => p.group === 'onoff' && btuIn(p, 1, 10) },
  { id: 'on12', label: 'On/Off 12 BTU', button: 'On/Off 12', family: 'onoff', chip: '12', matches: (p) => p.group === 'onoff' && btuIn(p, 11, 14) },
  { id: 'on18', label: 'On/Off 18 BTU', button: 'On/Off 18', family: 'onoff', chip: '18', matches: (p) => p.group === 'onoff' && btuIn(p, 15, 21) },
  { id: 'on2436', label: 'On/Off 24–36 BTU', button: 'On/Off 24–36', family: 'onoff', chip: '24–36', matches: (p) => p.group === 'onoff' && btuIn(p, 22, 99) },
  { id: 'truba', label: 'Медная труба', matches: (p) => p.group === 'truba' },
  { id: 'rashod', label: 'Расходники', family: 'rashod', chip: 'Все расходники', matches: (p) => p.group === 'rashod' },
  ...rashodCats.map((cat) => ({
    id: cat.key,
    label: `Расходники — ${cat.label}`,
    button: cat.label,
    family: 'rashod',
    chip: cat.label,
    matches: (p: Product) => rashodCategory(p) === cat.key,
  })),
  { id: 'poluprom', label: 'Полупром', family: 'poluprom', chip: 'Весь полупром', matches: isPac },
  { id: 'pac_kasseta', label: 'Полупром — Кассетные', button: 'Кассетные', family: 'poluprom', chip: 'Кассетные', matches: (p) => pacKind(p, 'cassette', /кассет|cassette/i) },
  { id: 'pac_kanalny', label: 'Полупром — Канальные', button: 'Канальные', family: 'poluprom', chip: 'Канальные', matches: (p) => pacKind(p, 'duct', /канальн|duct/i) },
  { id: 'pac_napolno', label: 'Полупром — Напольно-потолочные', button: 'Напольно-потолочные', family: 'poluprom', chip: 'Напольно-потолочные', matches: (p) => pacKind(p, 'floor-ceiling', /напольно-потолочн|floor.?ceiling/i) },
  { id: 'pac_column', label: 'Полупром — Колонные', button: 'Колонные', family: 'poluprom', chip: 'Колонные', matches: (p) => pacKind(p, 'column', /колонн|column/i) },
  { id: 'pac_console', label: 'Полупром — Консольные', button: 'Консольные', family: 'poluprom', chip: 'Консольные', matches: (p) => pacKind(p, 'console', /консольн|console/i) },
  // Multi-splits sit in semi-industrial with type "split" at suppliers — recognised by series.
  { id: 'pac_multi', label: 'Мультисплит-системы', button: 'Мультисплит-системы', family: 'poluprom', chip: 'Мультисплит', matches: (p) => p.group === 'multi' || p.type === 'mult' || pacKind(p, 'mult', /мульти|multi/i) },
  { id: 'multi', label: 'Чёрные сплиты', matches: (p) => p.group === 'multi' || p.group === 'black' || p.color === 'black' },
];

const filtersById = new Map(quickFilters.map((filter) => [filter.id, filter]));

const familyIds: Record<string, string[]> = {
  inv: ['inv', 'inv79', 'inv12', 'inv18', 'inv2436'],
  onoff: ['onoff', 'on79', 'on12', 'on18', 'on2436'],
  rashod: ['rashod', ...rashodCats.map((cat) => cat.key)],
  poluprom: ['poluprom', 'pac_kasseta', 'pac_kanalny', 'pac_napolno', 'pac_column', 'pac_console', 'pac_multi'],
};

export const homeQuickFilterIds = [
  'inv79', 'inv12', 'inv18', 'inv2436', 'on79', 'on12', 'on18', 'on2436',
  'truba', 'rashod', 'r_drain', 'r_kron', 'poluprom', 'multi',
];

// Options of the website's "Полупром" popup, the last one opens the whole section.
export const polupromQuickFilterIds = ['pac_kasseta', 'pac_kanalny', 'pac_napolno', 'pac_multi', 'poluprom'];

export function quickFilterById(filterId: string) {
  return filtersById.get(filterId);
}

export function filterByQuickFilter(products: Product[], filterId: string) {
  const filter = filtersById.get(filterId);
  return filter
    ? products.filter(filter.matches)
    : products.filter((product) => !filterId || product.group === filterId);
}

export function visibleQuickFilters(products: Product[] | null | undefined, filterIds: string[]) {
  const filters = filterIds.flatMap((id) => filtersById.get(id) ?? []);
  if (!products) {
    return filters;
  }

  return filters.filter((filter) => products.some(filter.matches));
}

// Sub-filter chips of the active filter's family with product counts; empty ones are hidden.
export function familyFilters(products: Product[], filterId: string) {
  const family = filtersById.get(filterId)?.family;
  if (!family) return [];
  return familyIds[family].flatMap((id) => {
    const filter = filtersById.get(id)!;
    const count = products.filter(filter.matches).length;
    return count ? [{ id, chip: filter.chip ?? filter.label, count }] : [];
  });
}
