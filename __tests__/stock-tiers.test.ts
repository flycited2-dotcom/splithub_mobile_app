import { positionsText, splitByStock, stockTiers } from '../src/features/catalog/stock-tiers';

const p = (id: string, stock: string) => ({ id, stock }) as never;

test('orders tiers like the website: in stock first, then by lead time, out last', () => {
  expect(stockTiers.map((tier) => tier.key)).toEqual([
    'in_stock', 'days_1_2', 'days_3_5', 'days_7', 'order_7', 'wait', 'other', 'out',
  ]);
  expect(stockTiers[0].label).toBe('✓ В наличии на складе');
  expect(stockTiers[4].label).toBe('Под заказ · от 7 дней');
});

test('splits products into non-empty tiers keeping catalog order inside a tier', () => {
  const tiers = splitByStock([p('a', 'order_7'), p('b', 'in_stock'), p('c', 'weird'), p('d', 'in_stock'), p('e', 'out')]);
  expect(tiers.map((tier) => [tier.key, tier.products.map((item: { id: string }) => item.id)])).toEqual([
    ['in_stock', ['b', 'd']],
    ['order_7', ['a']],
    ['other', ['c']],
    ['out', ['e']],
  ]);
});

test('pluralizes positions in Russian', () => {
  expect(positionsText(1)).toBe('1 позиция');
  expect(positionsText(3)).toBe('3 позиции');
  expect(positionsText(11)).toBe('11 позиций');
  expect(positionsText(22)).toBe('22 позиции');
  expect(positionsText(25)).toBe('25 позиций');
});
