import { appConfig } from '../src/features/home/app-config';

test('keeps the website contact links in one mobile config', () => {
  expect(appConfig.contacts.map((contact) => contact.label)).toEqual([
    '+7 978 599-13-69',
    '+7 990 002-22-30',
    '+7 990 217-03-15',
    '+7 978 839-40-42',
  ]);
  expect(appConfig.managerTelegramUrl).toBe('https://t.me/Byttehnikaopt');
  expect(appConfig.priceListUrl).toBe('https://splithub.ru/api/mobile_pricelist.php');
});
