import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CatalogSnapshot } from '../features/catalog/types';

const CATALOG_KEY = 'splithub.catalog-cache';
const CART_KEY = 'splithub.cart';
const CATALOG_CACHE_SCHEMA_VERSION = 1;

type CatalogCacheEnvelope = {
  savedAt: number;
  schemaVersion: number;
  snapshot: CatalogSnapshot;
};

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isCatalogSnapshot(value: unknown): value is CatalogSnapshot {
  return Boolean(
    value
      && typeof value === 'object'
      && Array.isArray((value as CatalogSnapshot).products),
  );
}

function isCatalogEnvelope(value: unknown): value is CatalogCacheEnvelope {
  return Boolean(
    value
      && typeof value === 'object'
      && (value as CatalogCacheEnvelope).schemaVersion === CATALOG_CACHE_SCHEMA_VERSION
      && typeof (value as CatalogCacheEnvelope).savedAt === 'number'
      && isCatalogSnapshot((value as CatalogCacheEnvelope).snapshot),
  );
}

export const catalogStorage = {
  // The cache is only used as a fallback when the network fetch fails, so a
  // stale catalog (with its update date in the offline banner) beats an empty
  // screen; order prices are re-validated server-side at checkout anyway.
  read: async () => {
    const raw = await AsyncStorage.getItem(CATALOG_KEY);
    const parsed = safeParse<CatalogCacheEnvelope | CatalogSnapshot>(raw);
    if (isCatalogEnvelope(parsed)) {
      return parsed.snapshot;
    }
    return isCatalogSnapshot(parsed) ? parsed : null;
  },
  write: (snapshot: CatalogSnapshot) =>
    AsyncStorage.setItem(CATALOG_KEY, JSON.stringify({
      savedAt: Date.now(),
      schemaVersion: CATALOG_CACHE_SCHEMA_VERSION,
      snapshot,
    })),
};

// Name/phone of the last guest order, prefilled next time like the website's localStorage.
const GUEST_CONTACT_KEY = 'splithub.guest-contact';

export const guestContactStorage = {
  read: async () => safeParse<{ name: string; phone: string }>(await AsyncStorage.getItem(GUEST_CONTACT_KEY)),
  write: (contact: { name: string; phone: string }) => AsyncStorage.setItem(GUEST_CONTACT_KEY, JSON.stringify(contact)),
};

// Installer's estimate settings (markup, own work prices, contacts) reused for the next estimate.
const ESTIMATE_SETTINGS_KEY = 'splithub.estimate-settings';

export const estimateSettingsStorage = {
  read: async <T>() => safeParse<T>(await AsyncStorage.getItem(ESTIMATE_SETTINGS_KEY)),
  write: (settings: unknown) => AsyncStorage.setItem(ESTIMATE_SETTINGS_KEY, JSON.stringify(settings)),
};

export const cartStorage = {
  read: async <T>() => {
    const raw = await AsyncStorage.getItem(CART_KEY);
    return safeParse<T>(raw);
  },
  write: (items: unknown) => AsyncStorage.setItem(CART_KEY, JSON.stringify(items)),
};
