import { catalogRows, filteredRows } from '../src/features/catalog/catalog-rows';
import { groupProducts } from '../src/features/catalog/group-products';

const product = (id: string, series: string, stock = 'in_stock') => ({
  id,
  sku: id,
  brand: 'MDV',
  brandCode: 'mdv',
  model: id,
  group: 'inv',
  price: 1,
  stock,
  stockLabel: 'В наличии',
  descShort: '',
  benefits: [],
  photo: '',
  factory: 'MDV',
  series,
});

test('flattens grouped catalog into virtualized rows with stock tiers', () => {
  const sections = groupProducts([
    product('1', 'INFINI'),
    product('2', 'INFINI'),
    product('3', 'INFINI'),
    product('4', 'INFINI', 'order_7'),
  ]);

  expect(catalogRows(sections).map((row) => [row.type, row.id])).toEqual([
    ['section', 'section-inv'],
    ['tier', 'tier-inv-in_stock'],
    ['brand', 'brand-inv-in_stock-MDV'],
    ['series', 'series-inv-in_stock-MDV-INFINI Inverter'],
    ['products', 'products-inv-in_stock-MDV-INFINI Inverter-0'],
    ['products', 'products-inv-in_stock-MDV-INFINI Inverter-1'],
    ['tier', 'tier-inv-order_7'],
    ['brand', 'brand-inv-order_7-MDV'],
    ['series', 'series-inv-order_7-MDV-INFINI Inverter'],
    ['products', 'products-inv-order_7-MDV-INFINI Inverter-0'],
  ]);
});

test('keeps at most two products in one catalog row', () => {
  const sections = groupProducts([product('1', 'INFINI'), product('2', 'INFINI'), product('3', 'INFINI')]);

  const productRows = catalogRows(sections).filter((row) => row.type === 'products');

  expect(productRows.map((row) => row.type === 'products' && row.products.map((item) => item.id))).toEqual([
    ['1', '2'],
    ['3'],
  ]);
});

test('filter results are a dense grid split by stock tier', () => {
  const rows = filteredRows([product('1', 'A', 'order_7'), product('2', 'B'), product('3', 'C')]);
  expect(rows.map((row) => row.type === 'tier' ? `${row.label} ${row.count}` : row.type === 'products' ? row.products.map((p) => p.id).join(',') : row.type))
    .toEqual(['✓ В наличии на складе 2', '2,3', 'Под заказ · от 7 дней 1', '1']);
});
