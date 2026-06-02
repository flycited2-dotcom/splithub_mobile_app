import { checkoutPayload } from '../src/features/cart/checkout-payload';

test('sends only validated item fields and trimmed comment', () => {
  expect(checkoutPayload([{ id: '1', name: 'Model', price: 100, qty: 2 }], '  Позвонить утром  ')).toEqual({
    items: [{ id: '1', price: 100, qty: 2 }],
    comment: 'Позвонить утром',
  });
});
