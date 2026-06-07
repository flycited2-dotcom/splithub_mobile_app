import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as Notifications from 'expo-notifications';

import {
  addNotification,
  countUnread,
  markAllRead as markAllReadList,
  notificationsStorage,
  type StoredNotification,
} from './notifications-storage';

type NotificationsValue = {
  notifications: StoredNotification[];
  unreadCount: number;
  markAllRead: () => void;
  refresh: () => void;
};

const NotificationsContext = createContext<NotificationsValue | undefined>(undefined);

function toStored(request: Notifications.NotificationRequest): StoredNotification {
  const { content } = request;
  const data = (content.data ?? {}) as Record<string, unknown>;
  return {
    id: request.identifier || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: content.title ?? '',
    body: content.body ?? '',
    type: typeof data.type === 'string' ? data.type : '',
    data,
    receivedAt: Date.now(),
    read: false,
  };
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);

  const capture = useCallback((request: Notifications.NotificationRequest) => {
    setNotifications((prev) => {
      const next = addNotification(prev, toStored(request));
      if (next !== prev) void notificationsStorage.write(next);
      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;
    void notificationsStorage.read().then((stored) => {
      if (active) setNotifications(stored);
    });

    const receivedSub = Notifications.addNotificationReceivedListener((notification) =>
      capture(notification.request),
    );
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) =>
      capture(response.notification.request),
    );
    // Cold start: also capture the notification the app was opened from.
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (active && response) capture(response.notification.request);
    });

    return () => {
      active = false;
      receivedSub.remove();
      responseSub.remove();
    };
  }, [capture]);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const next = markAllReadList(prev);
      if (next !== prev) void notificationsStorage.write(next);
      return next;
    });
  }, []);

  const refresh = useCallback(() => {
    void notificationsStorage.read().then(setNotifications);
  }, []);

  const value = useMemo<NotificationsValue>(
    () => ({ notifications, unreadCount: countUnread(notifications), markAllRead, refresh }),
    [notifications, markAllRead, refresh],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
