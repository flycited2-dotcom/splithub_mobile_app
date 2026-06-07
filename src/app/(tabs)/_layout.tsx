import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';

import { useCart } from '../../features/cart/cart-context';
import { colors } from '../../lib/theme';

export default function TabLayout() {
  const { itemsCount } = useCart();

  return (
    <Tabs initialRouteName="index" screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.accent }}>
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Каталог',
          tabBarIcon: ({ color, size }) => <MaterialIcons color={color} name="grid-view" size={size} />,
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
          title: 'Профиль',
          tabBarIcon: ({ color, size }) => <MaterialIcons color={color} name="person" size={size} />,
        }}
      />
    </Tabs>
  );
}
