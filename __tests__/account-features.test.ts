import { formatServerDate, parseServerDate } from '../src/lib/dates';
import { ordersQuery } from '../src/features/orders/orders-repository';
import { requisitesErrorMessage } from '../src/features/session/requisites';

test('parses SQLite UTC timestamps the server sends', () => {
  // "YYYY-MM-DD HH:MM:SS" is CURRENT_TIMESTAMP (UTC); Hermes does not parse it natively.
  expect(parseServerDate('2026-10-25 22:57:00')?.toISOString()).toBe('2026-10-25T22:57:00.000Z');
  expect(parseServerDate('2026-10-25T22:57:00Z')?.toISOString()).toBe('2026-10-25T22:57:00.000Z');
  expect(parseServerDate('garbage')).toBeNull();
  expect(parseServerDate(undefined)).toBeNull();
  expect(formatServerDate('garbage')).toBe('');
  expect(formatServerDate('2026-10-25 12:00:00')).toMatch(/25\.10\.2026/);
});

test('builds the orders filter query like the website', () => {
  expect(ordersQuery({})).toEqual({});
  expect(ordersQuery({ status: 'new', period: '30d', search: ' SH-00042 ' })).toEqual({
    status: 'new',
    period: '30d',
    search: 'SH-00042',
  });
  expect(ordersQuery({ status: '', period: '', search: '  ' })).toEqual({});
});

test('requisites errors use the website wording', () => {
  expect(requisitesErrorMessage('INVALID_INN')).toBe('ИНН должен содержать 10 или 12 цифр');
  expect(requisitesErrorMessage('INVALID_KPP')).toBe('КПП должен содержать 9 цифр');
  expect(requisitesErrorMessage('NETWORK_ERROR')).toBe('Не удалось сохранить. Проверьте подключение.');
});
