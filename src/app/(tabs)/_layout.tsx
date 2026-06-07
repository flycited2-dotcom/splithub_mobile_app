import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, Tabs } from 'expo-router';

import { useCart } from '../../features/cart/cart-context';
import { useNotifications } from '../../features/notifications/notifications-context';
import { colors } from '../../lib/theme';

export default function TabLayout() {
  const { itemsCount } = useCart();
  const { unreadCount } = useNotifications();

  return (
    <Tabs
      backBehavior="initialRoute"
      initialRouteName="index"
      screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.accent }}>
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Каталог',
          tabBarIcon: ({ color, size }) => <MaterialIcons color={color} name="grid-view" size={size} />,
        }}
        listeners={{
          // Tapping the Catalog tab must always show the full catalog, not the last
          // filter the user opened from the Home screen quick filters.
          tabPress: (e) => {
            e.preventDefault();
            router.navigate({ pathname: '/catalog', params: { filter: '', mode: 'flat' } });
          },
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Главная',
          tabBarIcon: ({ color, size }) => <MaterialIcons color={color} name="home" size={size} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          tabBarBadge: itemsCount > 0 ? itemsCount : undefined,
          title: 'Корзина',
          tabBarIcon: ({ color, size }) => <MaterialIcons color={color} name="shopping-cart" size={size} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Заказы',
          tabBarIcon: ({ color, size }) => <MaterialIcons color={color} name="receipt-long" size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          title: 'Профиль',
          tabBarIcon: ({ color, size }) => <MaterialIcons color={color} name="person" size={size} />,
        }}
      />
    </Tabs>
  );
}
