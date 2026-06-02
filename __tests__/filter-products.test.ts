import { filterProducts } from '../src/features/catalog/filter-products';

const products = [
  { id: '1', brand: 'ULTIMA', model: 'ELYSIUM 09', group: 'inv', btu: '09' },
  { id: '2', brand: 'MIDEA', model: 'BREEZE 12', group: 'onoff', btu: '12' },
] as never[];

test('filters by search and category', () => {
  expect(filterProducts(products, 'ely', 'inv').map((product) => product.id)).toEqual(['1']);
});

test('combines text search with a quick filter', () => {
  expect(filterProducts(products, 'ely', 'inv79').map((product) => product.id)).toEqual(['1']);
});
