import { groupProducts } from '../src/features/catalog/group-products';

const product = (id: string, series: string, extra: Record<string, unknown> = {}) => ({
  id,
  sku: id,
  brand: 'MDV',
  brandCode: 'mdv',
  model: id,
  group: 'inv',
  price: 1,
  stock: 'in_stock',
  stockLabel: 'В наличии',
  descShort: '',
  benefits: [],
  photo: '',
  factory: 'MDV',
  series,
  ...extra,
});

test('groups products by section, stock tier, brand and series', () => {
  const result = groupProducts([
    product('1', 'INFINI'),
    product('2', 'INFINI', { stock: 'order_7' }),
    product('3', 'OP Inverter'),
  ]);
  expect(result[0].label).toBe('ИНВЕРТОРНЫЕ');
  expect(result[0].tiers.map((tier) => [tier.key, tier.count])).toEqual([['in_stock', 2], ['order_7', 1]]);
  const brand = result[0].tiers[0].brands[0];
  expect(brand.factory).toBe('MDV');
  expect(brand.series.map((item) => [item.name, item.products.length])).toEqual([
    ['INFINI Inverter', 1],
    ['OP Inverter', 1],
  ]);
});

test('shows factory only when the brand block has a single factory', () => {
  const [section] = groupProducts([product('1', 'A'), product('2', 'B', { factory: 'TCL' })]);
  expect(section.tiers[0].brands[0].factory).toBeUndefined();
});

test('consumables are a flat grid per brand, with drain and fasteners merged', () => {
  const [section] = groupProducts([
    product('1', 'x', { group: 'rashod', brand: 'Металлопласт', brandCode: 'dmetplst' }),
    product('2', 'y', { group: 'rashod', brand: 'Гофра', brandCode: 'drenazhg' }),
    product('3', 'z', { group: 'rashod', brand: 'Болты', brandCode: 'blt' }),
  ]);
  const brands = section.tiers[0].brands;
  expect(brands.map((brand) => brand.name)).toEqual(['Дренаж', 'Крепеж (болты, гайки)']);
  expect(brands[0].flat).toBe(true);
  expect(brands[0].series[0].products.map((item) => item.id)).toEqual(['1', '2']);
});

test('keeps unknown groups after the known ones', () => {
  const result = groupProducts([product('1', 'A', { group: 'mobile' }), product('2', 'B')]);
  expect(result.map((section) => section.id)).toEqual(['inv', 'mobile']);
  expect(result[1].label).toBe('MOBILE');
});
