import { useCallback } from 'react';
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StackBottomTabs } from '../components/stack-bottom-tabs';
import { notificationTarget } from '../features/notifications/notification-router';
import { useNotifications } from '../features/notifications/notifications-context';
import type { StoredNotification } from '../features/notifications/notifications-storage';
import { stackScreenPadding } from '../lib/safe-area';
import { colors, spacing } from '../lib/theme';

type TypeMeta = { label: string; icon: keyof typeof MaterialIcons.glyphMap; color: string };

const TYPE_META: Record<string, TypeMeta> = {
  order_status: { label: 'Заказ', icon: 'receipt-long', color: '#15803D' },
  promotion: { label: 'Акция', icon: 'local-offer', color: '#C2410C' },
  manager_message: { label: 'Менеджер', icon: 'chat', color: '#2C7DA8' },
};

const DEFAULT_META: TypeMeta = { label: 'Уведомление', icon: 'notifications', color: colors.muted };

function typeMeta(type: string): TypeMeta {
  return TYPE_META[type] ?? DEFAULT_META;
}

function formatWhen(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн назад`;
  return new Date(ts).toLocaleDateString('ru-RU');
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { notifications, markAllRead } = useNotifications();

  // Keep the "new" highlight visible while the user reads, then mark everything
  // read when they leave the screen so the badge/counter clears.
  useFocusEffect(
    useCallback(() => () => markAllRead(), [markAllRead]),
  );

  function openNotification(item: StoredNotification) {
    const target = notificationTarget(item.data ?? {});
    if (/^https?:\/\//.test(target)) {
      void Linking.openURL(target);
    } else {
      router.push(target as never);
    }
  }

  function renderItem({ item }: { item: StoredNotification }) {
    const meta = typeMeta(item.type);
    const fresh = !item.read;
    return (
      <Pressable onPress={() => openNotification(item)} style={[styles.card, fresh && styles.cardFresh]}>
        <View style={[styles.iconWrap, { backgroundColor: `${meta.color}1A` }]}>
          <MaterialIcons color={meta.color} name={meta.icon} size={22} />
        </View>
        <View style={styles.body}>
          <View style={styles.headerRow}>
            <Text style={[styles.type, { color: meta.color }]}>{meta.label}</Text>
            <Text style={styles.time}>{formatWhen(item.receivedAt)}</Text>
            {fresh ? <View style={styles.dot} /> : null}
          </View>
          {item.title ? <Text style={styles.title}>{item.title}</Text> : null}
          {item.body ? <Text style={styles.message}>{item.body}</Text> : null}
        </View>
      </Pressable>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Уведомления' }} />
      {notifications.length === 0 ? (
        <View style={[styles.empty, stackScreenPadding(insets)]}>
          <MaterialIcons color={colors.muted} name="notifications-none" size={48} />
          <Text style={styles.emptyTitle}>Пока нет уведомлений</Text>
          <Text style={styles.emptyText}>
            Здесь появятся статусы заказов, акции и сообщения менеджера, чтобы их можно было перечитать.
          </Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, stackScreenPadding(insets)]}
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />
      )}
      <StackBottomTabs active="profile" />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.background,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  cardFresh: {
    backgroundColor: '#FFFDF5',
    borderColor: '#F0A329',
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  type: {
    fontSize: 12,
    fontWeight: '800',
  },
  time: {
    color: colors.muted,
    fontSize: 12,
  },
  dot: {
    backgroundColor: '#EF4444',
    borderRadius: 999,
    height: 8,
    marginLeft: 'auto',
    width: 8,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  message: {
    color: colors.text,
    fontSize: 14,
  },
  empty: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.muted,
    textAlign: 'center',
  },
});
