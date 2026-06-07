import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = 'splithub.favorites';

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// Favorites are stored locally (product ids only). Not synced across devices.
export const favoritesStorage = {
  read: async (): Promise<string[]> => {
    const parsed = safeParse<unknown>(await AsyncStorage.getItem(FAVORITES_KEY));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string');
  },
  write: (ids: string[]) => AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(ids)),
};
