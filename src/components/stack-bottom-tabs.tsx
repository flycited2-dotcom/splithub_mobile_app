import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCart } from '../features/cart/cart-context';
import { colors, spacing } from '../lib/theme';

type TabKey = 'catalog' | 'home' | 'cart' | 'orders' | 'profile';

const tabs = [
  { href: '/catalog', icon: 'grid-view', key: 'catalog', label: 'Каталог' },
  { href: '/', icon: 'home', key: 'home', label: 'Главная' },
  { href: '/cart', icon: 'shopping-cart', key: 'cart', label: 'Корзина' },
  { href: '/orders', icon: 'receipt-long', key: 'orders', label: 'Заказы' },
  { href: '/profile', icon: 'person', key: 'profile', label: 'Профиль' },
] as const;

type Props = {
  active?: TabKey;
};

export function StackBottomTabs({ active }: Props) {
  const insets = useSafeAreaInsets();
  const { itemsCount } = useCart();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + spacing.sm }]}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const color = isActive ? colors.accent : '#8A8A8A';
        const badge = tab.key === 'cart' && itemsCount > 0 ? itemsCount : 0;

        return (
          <Pressable
            accessibilityLabel={badge ? `${badge}, ${tab.label}` : tab.label}
            key={tab.key}
            onPress={() => router.push(tab.href as never)}
            style={styles.tab}>
            <View>
              <MaterialIcons color={color} name={tab.icon} size={26} />
              {badge ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    left: 0,
    paddingTop: spacing.sm,
    position: 'absolute',
    right: 0,
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
    minWidth: 18,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -10,
    top: -8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
});
