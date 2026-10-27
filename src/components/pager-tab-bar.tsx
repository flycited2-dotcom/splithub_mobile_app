import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCart } from '../features/cart/cart-context';
import { useNotifications } from '../features/notifications/notifications-context';
import { colors, spacing } from '../lib/theme';

const tabMeta: Record<string, { icon: keyof typeof MaterialIcons.glyphMap; label: string }> = {
  catalog: { icon: 'grid-view', label: 'Каталог' },
  index: { icon: 'home', label: 'Главная' },
  cart: { icon: 'shopping-cart', label: 'Корзина' },
  orders: { icon: 'receipt-long', label: 'Заказы' },
  profile: { icon: 'person', label: 'Профиль' },
};

// Bottom bar for the swipeable tab pager; looks like the former bottom tabs.
// expo-router types MaterialTopTabBarProps as `any`, so the used parts are spelled out.
type PagerTabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string, params?: Record<string, string>) => void;
  };
};

export function PagerTabBar({ state, navigation }: PagerTabBarProps) {
  const insets = useSafeAreaInsets();
  const { itemsCount } = useCart();
  const { unreadCount } = useNotifications();
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  // Hidden while typing, otherwise it is drawn over the keyboard.
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboardOpen) return null;

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom + spacing.sm }]}>
      {state.routes.map((route, index) => {
        const meta = tabMeta[route.name];
        if (!meta) return null;
        const focused = state.index === index;
        const color = focused ? colors.accent : '#8A8A8A';
        const badgeCount = route.name === 'cart' ? itemsCount : route.name === 'profile' ? unreadCount : 0;

        function onPress() {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (event.defaultPrevented) return;
          // The Catalog tab always opens the full catalog, not the last quick filter.
          if (route.name === 'catalog') {
            navigation.navigate('catalog', { filter: '', mode: 'flat' });
          } else if (!focused) {
            navigation.navigate(route.name);
          }
        }

        return (
          <Pressable
            accessibilityLabel={badgeCount ? `${badgeCount}, ${meta.label}` : meta.label}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            key={route.key}
            onPress={onPress}
            style={styles.tab}>
            <View>
              <MaterialIcons color={color} name={meta.icon} size={26} />
              {badgeCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : badgeCount}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color }]}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingTop: spacing.sm,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 5,
    position: 'absolute',
    right: -12,
    top: -6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
