import type { CartItem } from './cart-reducer';

export function checkoutPayload(items: CartItem[], comment: string) {
  return {
    items: items.map(({ id, price, qty }) => ({ id, price, qty })),
    comment: comment.trim(),
  };
}
