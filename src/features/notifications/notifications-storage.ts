import AsyncStorage from '@react-native-async-storage/async-storage';

export type StoredNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  data: Record<string, unknown>;
  receivedAt: number;
  read: boolean;
};

const NOTIFICATIONS_KEY = 'splithub.notifications';
const MAX_NOTIFICATIONS = 100;

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function isStoredNotification(value: unknown): value is StoredNotification {
  if (!value || typeof value !== 'object') return false;
  const n = value as Record<string, unknown>;
  return typeof n.id === 'string' && typeof n.receivedAt === 'number' && typeof n.read === 'boolean';
}

// Add a freshly received notification to the front of the list, skipping
// re-deliveries (same id) and capping the history length.
export function addNotification(list: StoredNotification[], next: StoredNotification): StoredNotification[] {
  if (list.some((item) => item.id === next.id)) return list;
  return [next, ...list].slice(0, MAX_NOTIFICATIONS);
}

export function markAllRead(list: StoredNotification[]): StoredNotification[] {
  if (list.every((item) => item.read)) return list;
  return list.map((item) => (item.read ? item : { ...item, read: true }));
}

export function countUnread(list: StoredNotification[]): number {
  return list.reduce((total, item) => (item.read ? total : total + 1), 0);
}

// Local notification history. Captures pushes received while the app runs or is
// opened from one; notifications dismissed while the app is fully closed are not
// stored (server-side history can fill that gap later).
export const notificationsStorage = {
  read: async (): Promise<StoredNotification[]> => {
    const parsed = safeParse<unknown>(await AsyncStorage.getItem(NOTIFICATIONS_KEY));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredNotification);
  },
  write: (list: StoredNotification[]) =>
    AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list.slice(0, MAX_NOTIFICATIONS))),
};
