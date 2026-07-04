import AsyncStorage from '@react-native-async-storage/async-storage';

import { cartStorage, catalogStorage } from '../src/lib/storage';

const catalogSnapshot = {
  products: [],
  updated_at: '2026-06-06T00:00:00Z',
  version: 'test',
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.useRealTimers();
});

test('ignores a malformed catalog cache instead of throwing', async () => {
  await AsyncStorage.setItem('splithub.catalog-cache', '{broken');

  await expect(catalogStorage.read()).resolves.toBeNull();
});

test('returns a stale catalog cache as offline fallback', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-06-06T12:00:00Z'));
  await AsyncStorage.setItem('splithub.catalog-cache', JSON.stringify({
    savedAt: Date.now() - 25 * 60 * 60 * 1000,
    schemaVersion: 1,
    snapshot: catalogSnapshot,
  }));

  await expect(catalogStorage.read()).resolves.toEqual(catalogSnapshot);
});

test('writes the catalog cache with a schema envelope', async () => {
  jest.useFakeTimers().setSystemTime(new Date('2026-06-06T12:00:00Z'));

  await catalogStorage.write(catalogSnapshot);

  const raw = await AsyncStorage.getItem('splithub.catalog-cache');
  expect(JSON.parse(String(raw))).toMatchObject({
    savedAt: Date.now(),
    schemaVersion: 1,
    snapshot: catalogSnapshot,
  });
  await expect(catalogStorage.read()).resolves.toEqual(catalogSnapshot);
});

test('ignores malformed cart cache instead of throwing', async () => {
  await AsyncStorage.setItem('splithub.cart', '{broken');

  await expect(cartStorage.read()).resolves.toBeNull();
});
