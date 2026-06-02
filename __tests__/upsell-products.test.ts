import { upsellProducts } from '../src/features/cart/upsell-products';

const products = [
  { id: 'split', group: 'inv', stock: 'in_stock' },
  { id: '1045', group: 'truba', stock: 'in_stock' },
  { id: '1046', group: 'truba', stock: 'out' },
] as never[];

test('offers available installer items for a split system', () => {
  expect(upsellProducts([{ id: 'split', name: 'Split', price: 1, qty: 1 }], products).map((p) => p.id)).toEqual(['1045']);
});

test('does not offer installer items without a split system', () => {
  expect(upsellProducts([], products)).toEqual([]);
});
