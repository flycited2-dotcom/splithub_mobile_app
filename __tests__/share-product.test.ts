import { productShareData, shareUrls } from '../src/features/catalog/share-product';

const product = { id: '1245', brand: 'MDV', model: 'MDSAG-09HRDN8', price: 23490 } as never;

test('builds public website product URL', () => {
  expect(productShareData(product).url).toBe('https://splithub.ru/?p=1245');
});

test('builds Telegram and MAX share URLs', () => {
  const urls = shareUrls(product);
  expect(urls.telegram).toContain('https://t.me/share/url?');
  expect(urls.max).toContain('https://max.ru/:share?text=');
});
