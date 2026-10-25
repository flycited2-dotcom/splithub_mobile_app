import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from 'react';

import { api } from '../../lib/api';
import { cartStorage } from '../../lib/storage';
import { productTitle } from '../catalog/product-title';
import type { Product } from '../catalog/types';
import { checkoutError as toCheckoutError, type CheckoutError } from './checkout-error';
import { checkoutPayload } from './checkout-payload';
import {
  cartItemsCount,
  cartQuantityByProductId,
  cartReducer,
  type CartItem,
} from './cart-reducer';

type CartContextValue = {
  items: CartItem[];
  itemsCount: number;
  quantityByProductId: Record<string, number>;
  total: number;
  checkoutError: CheckoutError | null;
  checkingOut: boolean;
  addProduct: (product: Product, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  replaceItems: (items: CartItem[]) => void;
  checkout: (comment?: string) => Promise<{ order_id: number; total: number } | null>;
  // Order without an account (name + phone), like a guest order on the website.
  checkoutGuest: (
    contact: { name: string; phone: string },
    comment?: string,
  ) => Promise<{ guest_order_id: number; total: number } | null>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const [items, dispatch] = useReducer(cartReducer, []);
  const [hydrated, setHydrated] = useState(false);
  const [checkoutError, setCheckoutError] = useState<CheckoutError | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    void cartStorage.read<CartItem[]>().then((stored) => {
      if (stored) {
        dispatch({ type: 'replace', items: stored });
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (hydrated) {
      void cartStorage.write(items);
    }
  }, [hydrated, items]);

  const value = useMemo<CartContextValue>(() => {
    // Cart is cleared only after the server accepted the order, so a failure keeps it for a retry.
    async function submit<T>(action: string, payload: object): Promise<T | null> {
      setCheckoutError(null);
      setCheckingOut(true);
      try {
        const result = await api<T>(action, { method: 'POST', body: JSON.stringify(payload) });
        dispatch({ type: 'clear' });
        return result;
      } catch (error) {
        const code = String((error as { data?: { code?: string } }).data?.code ?? 'REQUEST_FAILED');
        setCheckoutError(toCheckoutError(code));
        return null;
      } finally {
        setCheckingOut(false);
      }
    }

    return {
      items,
      itemsCount: cartItemsCount(items),
      quantityByProductId: cartQuantityByProductId(items),
      total: items.reduce((sum, item) => sum + item.price * item.qty, 0),
      checkoutError,
      checkingOut,
      addProduct: (product, qty = 1) => {
        setCheckoutError(null);
        dispatch({ type: 'add', item: { id: product.id, name: productTitle(product), price: product.price, qty } });
      },
      setQty: (id, qty) => dispatch({ type: 'setQty', id, qty }),
      replaceItems: (nextItems) => dispatch({ type: 'replace', items: nextItems }),
      checkout: (comment = '') =>
        submit<{ order_id: number; total: number }>('create_order', checkoutPayload(items, comment)),
      checkoutGuest: (contact, comment = '') =>
        submit<{ guest_order_id: number; total: number }>('create_guest_order', {
          ...checkoutPayload(items, comment),
          name: contact.name.trim(),
          phone: contact.phone.trim(),
        }),
    };
  }, [checkoutError, checkingOut, items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return value;
}
