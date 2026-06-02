import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing } from '../lib/theme';

type TabKey = 'home' | 'cart' | 'orders' | 'profile';

const tabs = [
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

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + spacing.sm }]}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const color = isActive ? colors.accent : '#8A8A8A';

        return (
          <Pressable
            accessibilityLabel={tab.label}
            key={tab.key}
            onPress={() => router.push(tab.href as never)}
            style={styles.tab}>
            <MaterialIcons color={color} name={tab.icon} size={26} />
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
});
