import { useEffect } from 'react';
import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CartProvider } from '../features/cart/cart-context';
import { CatalogProvider } from '../features/catalog/catalog-context';
import { FavoritesProvider } from '../features/favorites/favorites-context';
import { notificationTarget } from '../features/notifications/notification-router';
import { NotificationsProvider } from '../features/notifications/notifications-context';
import { SessionProvider } from '../features/session/session-context';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function NotificationNavigation() {
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const target = notificationTarget(response.notification.request.content.data ?? {});
      if (/^https?:\/\//.test(target)) {
        void Linking.openURL(target);
      } else {
        router.push(target as never);
      }
    });
    return () => subscription.remove();
  }, []);
  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <CatalogProvider>
          <CartProvider>
            <FavoritesProvider>
              <NotificationsProvider>
                <StatusBar style="dark" />
                <NotificationNavigation />
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                </Stack>
              </NotificationsProvider>
            </FavoritesProvider>
          </CartProvider>
        </CatalogProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
