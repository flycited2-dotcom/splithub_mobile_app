import type { Product } from './types';

type ShareProduct = Pick<Product, 'id' | 'brand' | 'model' | 'price'>;

export function productShareData(product: ShareProduct) {
  const url = `https://splithub.ru/?p=${encodeURIComponent(product.id)}`;
  const text = `${product.brand} ${product.model} — ${Number(product.price).toLocaleString('ru-RU')} ₽ · СплитХаб`;
  return { url, text, title: product.model };
}

export function shareUrls(product: ShareProduct) {
  const data = productShareData(product);
  return {
    max: `https://max.ru/:share?text=${encodeURIComponent(`${data.text}\n${data.url}`)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(data.text)}`,
    email: `mailto:?subject=${encodeURIComponent(`${data.title} — СплитХаб`)}&body=${encodeURIComponent(`${data.text}\n${data.url}`)}`,
  };
}
