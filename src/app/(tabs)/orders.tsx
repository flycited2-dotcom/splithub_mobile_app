import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { orderStatusColors, orderStatusLabels } from '../../features/orders/order-status';
import { listOrders, type OrdersFilter } from '../../features/orders/orders-repository';
import type { Order } from '../../features/orders/types';
import { useSession } from '../../features/session/session-context';
import { formatServerDate } from '../../lib/dates';
import { tabScreenPadding } from '../../lib/safe-area';
import { colors, formatPrice, spacing } from '../../lib/theme';

// Same options as the order history filters on the website.
const statusFilters: [string, string][] = [
  ['', 'Все статусы'],
  ['new', 'Новый'],
  ['in_progress', 'В работе'],
  ['completed', 'Выполнен'],
  ['cancelled', 'Отменён'],
];
const periodFilters: [string, string][] = [
  ['', 'За всё время'],
  ['30d', '30 дней'],
  ['3m', '3 месяца'],
  ['1y', 'Год'],
];

// "Liquid glass" chips: translucent tint with a tinted rim; the active one is filled
// with its colour. Colours follow the order status badges (new blue, in work orange,
// done green, cancelled red); "all" uses the brand amber, periods a neutral slate.
type Tint = { rgb: string; text: string };
const statusTints: Record<string, Tint> = {
  '': { rgb: '245,158,11', text: '#B45309' },
  new: { rgb: '37,99,235', text: '#1D4ED8' },
  in_progress: { rgb: '234,88,12', text: '#C2410C' },
  completed: { rgb: '22,163,74', text: '#15803D' },
  cancelled: { rgb: '220,38,38', text: '#B91C1C' },
};
const periodTint: Tint = { rgb: '71,85,105', text: '#334155' };

const glassChip = (tint: Tint, active: boolean) => [
  styles.chip,
  active
    ? { backgroundColor: `rgba(${tint.rgb},0.92)`, borderColor: `rgba(${tint.rgb},1)`, shadowColor: `rgb(${tint.rgb})` }
    : { backgroundColor: `rgba(${tint.rgb},0.12)`, borderColor: `rgba(${tint.rgb},0.40)` },
  active && styles.chipActive,
];
const glassChipText = (tint: Tint, active: boolean) => [styles.chipText, { color: active ? '#FFFFFF' : tint.text }];

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ created?: string; createdTotal?: string }>();
  const { user } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<OrdersFilter>({});
  const [search, setSearch] = useState('');
  const filtered = Boolean(filter.status || filter.period || filter.search);
  const createdOrderId = typeof params.created === 'string' ? Number(params.created) : 0;
  const createdOrderNumber = Number.isFinite(createdOrderId) && createdOrderId > 0
    ? `SH-${String(createdOrderId).padStart(5, '0')}`
    : '';
  const createdOrderTotal = typeof params.createdTotal === 'string' ? Number(params.createdTotal) : 0;
  const displayedOrders = useMemo(() => {
    if (filtered || !createdOrderId || !createdOrderTotal || orders.some((order) => order.id === createdOrderId)) {
      return orders;
    }

    const createdOrder: Order = {
      comment: '',
      created_at: new Date().toISOString(),
      id: createdOrderId,
      status: 'new',
      total: createdOrderTotal,
    };

    return [createdOrder, ...orders];
  }, [createdOrderId, createdOrderTotal, filtered, orders]);

  const refresh = useCallback(async (showSpinner = false) => {
    if (!user) return;
    if (showSpinner) setRefreshing(true);
    setError('');
    try {
      setOrders((await listOrders(filter)).orders);
    } catch {
      setError('Не удалось загрузить заказы');
    } finally {
      if (showSpinner) setRefreshing(false);
    }
  }, [filter, user]);

  // Order statuses change server-side, so reload every time the tab gains
  // focus (tab screens stay mounted and a mount-only effect goes stale).
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (!user) {
    return (
      <View style={[styles.screen, tabScreenPadding(insets)]}>
        <Text style={styles.title}>Заказы</Text>
        <Text style={styles.muted}>Войдите, чтобы видеть историю и статусы заказов.</Text>
        <Link href="/auth/login" style={styles.link}>Войти</Link>
        <Link href="/auth/register" style={styles.link}>Создать аккаунт</Link>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, tabScreenPadding(insets)]}
      refreshControl={
        <RefreshControl
          colors={[colors.accent]}
          onRefresh={() => refresh(true)}
          refreshing={refreshing}
          tintColor={colors.accent}
        />
      }>
      <Text style={styles.title}>Мои заказы</Text>
      {createdOrderNumber ? (
        <View style={styles.sentBanner}>
          <Text style={styles.sentTitle}>Заявка {createdOrderNumber} отправлена</Text>
          <Text style={styles.sentText}>Менеджер уже получил заявку. Статус появится здесь после обработки.</Text>
        </View>
      ) : null}
      <TextInput
        keyboardType="numbers-and-punctuation"
        onChangeText={setSearch}
        onSubmitEditing={() => setFilter((current) => ({ ...current, search }))}
        placeholder="Поиск #SH-..."
        returnKeyType="search"
        style={styles.search}
        value={search}
      />
      <View style={styles.chips}>
        {statusFilters.map(([value, label]) => (
          <Pressable
            key={`s-${value}`}
            onPress={() => setFilter((current) => ({ ...current, status: value }))}
            style={glassChip(statusTints[value] ?? statusTints[''], (filter.status ?? '') === value)}>
            <Text style={glassChipText(statusTints[value] ?? statusTints[''], (filter.status ?? '') === value)}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.chips}>
        {periodFilters.map(([value, label]) => (
          <Pressable
            key={`p-${value}`}
            onPress={() => setFilter((current) => ({ ...current, period: value }))}
            style={glassChip(periodTint, (filter.period ?? '') === value)}>
            <Text style={glassChipText(periodTint, (filter.period ?? '') === value)}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!displayedOrders.length && !error ? (
        <Text style={styles.muted}>{filtered ? 'Нет заказов по выбранным условиям' : 'Заказов пока нет'}</Text>
      ) : null}
      {displayedOrders.map((order) => (
        <Pressable key={order.id} onPress={() => router.push(`/order/${order.id}`)} style={styles.card}>
          <View>
            <Text style={styles.orderNumber}>SH-{String(order.id).padStart(5, '0')}</Text>
            <Text style={styles.muted}>{formatServerDate(order.created_at)}</Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.price}>{formatPrice(order.total)}</Text>
            <Text style={[styles.status, orderStatusColors[order.status]]}>{orderStatusLabels[order.status]}</Text>
          </View>
        </Pressable>
      ))}
      <Pressable
        disabled={refreshing}
        onPress={() => void refresh(true)}
        style={[styles.refreshButton, refreshing && styles.refreshButtonDisabled]}>
        <Text style={styles.refreshText}>{refreshing ? 'Обновляем...' : 'Обновить статусы'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  // Wrapping rows: every status/period fits on screen (a horizontal list hid "Отменён").
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: {
    elevation: 3,
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '800',
  },
  screen: {
    backgroundColor: colors.background,
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  muted: {
    color: colors.muted,
  },
  link: {
    color: colors.accentDark,
    fontWeight: '800',
  },
  error: {
    color: '#B91C1C',
  },
  sentBanner: {
    backgroundColor: '#ECFDF3',
    borderColor: '#BBF7D0',
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  sentTitle: {
    color: '#166534',
    fontWeight: '900',
  },
  sentText: {
    color: '#166534',
    fontSize: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  orderNumber: {
    color: colors.text,
    fontWeight: '900',
  },
  right: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  price: {
    color: colors.accentDark,
    fontWeight: '800',
  },
  status: {
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 12,
    fontWeight: '900',
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  refreshButton: {
    alignSelf: 'flex-start',
    borderColor: colors.accent,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshText: {
    color: colors.accentDark,
    fontWeight: '800',
  },
});
