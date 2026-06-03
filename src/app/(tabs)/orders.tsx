import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { listOrders } from '../../features/orders/orders-repository';
import type { Order, OrderStatus } from '../../features/orders/types';
import { useSession } from '../../features/session/session-context';
import { tabScreenPadding } from '../../lib/safe-area';
import { colors, formatPrice, spacing } from '../../lib/theme';

const statusLabels: Record<OrderStatus, string> = {
  new: 'Новый',
  confirmed: 'Подтверждён',
  in_progress: 'В работе',
  shipped: 'Отгружен',
  completed: 'Выполнен',
  cancelled: 'Отменён',
};

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ created?: string; createdTotal?: string }>();
  const { user } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const createdOrderId = typeof params.created === 'string' ? Number(params.created) : 0;
  const createdOrderNumber = Number.isFinite(createdOrderId) && createdOrderId > 0
    ? `SH-${String(createdOrderId).padStart(5, '0')}`
    : '';
  const createdOrderTotal = typeof params.createdTotal === 'string' ? Number(params.createdTotal) : 0;
  const displayedOrders = useMemo(() => {
    if (!createdOrderId || !createdOrderTotal || orders.some((order) => order.id === createdOrderId)) {
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
  }, [createdOrderId, createdOrderTotal, orders]);

  const refresh = useCallback(async () => {
    if (!user) return;
    setError('');
    try {
      setOrders((await listOrders()).orders);
    } catch {
      setError('Не удалось загрузить заказы');
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
    <ScrollView contentContainerStyle={[styles.screen, tabScreenPadding(insets)]}>
      <Text style={styles.title}>Мои заказы</Text>
      {createdOrderNumber ? (
        <View style={styles.sentBanner}>
          <Text style={styles.sentTitle}>Заявка {createdOrderNumber} отправлена</Text>
          <Text style={styles.sentText}>Менеджер уже получил заявку. Статус появится здесь после обработки.</Text>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!displayedOrders.length && !error ? <Text style={styles.muted}>Заказов пока нет</Text> : null}
      {displayedOrders.map((order) => (
        <Pressable key={order.id} onPress={() => router.push(`/order/${order.id}`)} style={styles.card}>
          <View>
            <Text style={styles.orderNumber}>SH-{String(order.id).padStart(5, '0')}</Text>
            <Text style={styles.muted}>{new Date(order.created_at).toLocaleDateString('ru-RU')}</Text>
          </View>
          <View style={styles.right}>
            <Text style={styles.price}>{formatPrice(order.total)}</Text>
            <Text style={styles.status}>{statusLabels[order.status]}</Text>
          </View>
        </Pressable>
      ))}
      <Pressable onPress={() => void refresh()} style={styles.refresh}>
        <Text style={styles.refreshText}>Обновить</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    color: colors.success,
    fontSize: 12,
  },
  refresh: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  refreshText: {
    color: colors.accentDark,
    fontWeight: '800',
  },
});
