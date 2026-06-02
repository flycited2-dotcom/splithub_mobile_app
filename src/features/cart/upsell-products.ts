import type { Product } from '../catalog/types';
import type { CartItem } from './cart-reducer';

const installerKitIds = ['1045', '1046', '1047', '1069', '1063'];

export function upsellProducts(items: CartItem[], products: Product[]) {
  const byId = new Map(products.map((product) => [product.id, product]));
  const hasSplit = items.some((item) => {
    const product = byId.get(item.id);
    return product?.group === 'inv' || product?.group === 'onoff';
  });
  if (!hasSplit) return [];
  const inCart = new Set(items.map((item) => item.id));
  return installerKitIds.flatMap((id) => {
    const product = byId.get(id);
    return product && product.stock !== 'out' && !inCart.has(id) ? [product] : [];
  });
}
