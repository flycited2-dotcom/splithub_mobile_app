import { catalogRows } from '../src/features/catalog/catalog-rows';
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

test('flattens grouped catalog into virtualized rows', () => {
  const sections = groupProducts([
    product('1', 'INFINI'),
    product('2', 'INFINI'),
    product('3', 'INFINI'),
  ]);

  expect(catalogRows(sections).map((row) => [row.type, row.id])).toEqual([
    ['section', 'section-inv'],
    ['brand', 'brand-inv-MDV'],
    ['series', 'series-inv-MDV-INFINI'],
    ['products', 'products-inv-MDV-INFINI-0'],
    ['products', 'products-inv-MDV-INFINI-1'],
  ]);
});

test('keeps at most two products in one catalog row', () => {
  const sections = groupProducts([
    product('1', 'INFINI'),
    product('2', 'INFINI'),
    product('3', 'INFINI'),
  ]);

  const productRows = catalogRows(sections).filter((row) => row.type === 'products');

  expect(productRows.map((row) => row.products.map((item) => item.id))).toEqual([
    ['1', '2'],
    ['3'],
  ]);
});
