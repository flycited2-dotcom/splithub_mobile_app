import { groupProducts } from '../src/features/catalog/group-products';

const product = (id: string, series: string) => ({
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
});

test('groups products by equipment group, brand and series', () => {
  const result = groupProducts([product('1', 'INFINI'), product('2', 'INFINI'), product('3', 'OP')]);
  expect(result[0].label).toBe('ИНВЕРТОРНЫЕ');
  expect(result[0].brands[0].factory).toBe('MDV');
  expect(result[0].brands[0].series.map((item) => [item.name, item.products.length])).toEqual([
    ['INFINI', 2],
    ['OP', 1],
  ]);
});
