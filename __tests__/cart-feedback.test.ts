import { addedToCartMessage } from '../src/features/cart/cart-feedback';

describe('cart feedback', () => {
  it('uses the product model for a single added item', () => {
    expect(addedToCartMessage('MDSAG-09HRDN8')).toBe('MDSAG-09HRDN8');
  });

  it('adds quantity when more than one item is added', () => {
    expect(addedToCartMessage('MDSAG-09HRDN8', 3)).toBe('MDSAG-09HRDN8 · 3 шт.');
  });
});
