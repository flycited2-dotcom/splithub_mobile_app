import AsyncStorage from '@react-native-async-storage/async-storage';

import { favoritesStorage } from '../src/features/favorites/favorites-storage';

describe('favorites storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns an empty array when nothing is stored', async () => {
    expect(await favoritesStorage.read()).toEqual([]);
  });

  it('persists and reads back ids', async () => {
    await favoritesStorage.write(['mdv-09', 'eln-12']);
    expect(await favoritesStorage.read()).toEqual(['mdv-09', 'eln-12']);
  });

  it('ignores malformed json', async () => {
    await AsyncStorage.setItem('splithub.favorites', '{not json');
    expect(await favoritesStorage.read()).toEqual([]);
  });

  it('filters out non-string entries', async () => {
    await AsyncStorage.setItem('splithub.favorites', JSON.stringify(['a', 1, null, 'b']));
    expect(await favoritesStorage.read()).toEqual(['a', 'b']);
  });
});
