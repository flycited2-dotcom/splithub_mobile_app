import { cartItemsCount, cartQuantityByProductId, cartReducer } from '../src/features/cart/cart-reducer';

test('increments an existing cart product', () => {
  const state = [{ id: '1001', name: 'ELYSIUM', price: 24900, qty: 1 }];
  expect(cartReducer(state, { type: 'add', item: state[0] })[0].qty).toBe(2);
});

test('counts total cart quantity', () => {
  expect(cartItemsCount([
    { id: '1001', name: 'ELYSIUM', price: 24900, qty: 2 },
    { id: '1002', name: 'MDV', price: 23990, qty: 3 },
  ])).toBe(5);
});

test('indexes cart quantity by product id', () => {
  expect(cartQuantityByProductId([
    { id: '1001', name: 'ELYSIUM', price: 24900, qty: 2 },
    { id: '1002', name: 'MDV', price: 23990, qty: 3 },
  ])).toEqual({ '1001': 2, '1002': 3 });
});
