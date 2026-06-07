import { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCatalog } from '../../features/catalog/catalog-context';
import { useFavorites } from '../../features/favorites/favorites-context';
import { useSession } from '../../features/session/session-context';
import {
  defaultNotificationPreferences,
  ensureDeviceRegistered,
  loadNotificationPreferences,
  type NotificationPreferences,
  removeRegisteredDevice,
  updateNotificationPreferences,
} from '../../features/notifications/register-device';
import { appConfig } from '../../features/home/app-config';
import {
  downloadPriceList,
  getPriceListDownloadErrorMessage,
  type PriceListFormat,
} from '../../features/home/price-list-download';
import { tabScreenPadding } from '../../lib/safe-area';
import { colors, spacing } from '../../lib/theme';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, loading, logout } = useSession();
  const { snapshot } = useCatalog();
  const { favoriteIds } = useFavorites();
  const products = snapshot?.products;
  const [expoToken, setExpoToken] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState('');
  const [priceDownloading, setPriceDownloading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);

  useEffect(() => {
    let active = true;
    if (!user) {
      setExpoToken(null);
      setNotificationStatus('');
      setPreferences(defaultNotificationPreferences);
      return () => {
        active = false;
      };
    }

    async function syncNotifications() {
      const savedPreferences = await loadNotificationPreferences();
      if (!active) return;
      setPreferences(savedPreferences);
      const token = await ensureDeviceRegistered(savedPreferences);
      if (!active) return;
      setExpoToken(token);
      if (token) setNotificationStatus('Устройство зарегистрировано для push-уведомлений');
    }

    void syncNotifications().catch(() => {
      if (active) {
        setNotificationStatus('Не удалось подключить push-уведомления. Проверьте разрешение уведомлений и подключение.');
      }
    });
    return () => {
      active = false;
    };
  }, [user]);

  function setPreference(key: keyof NotificationPreferences, enabled: boolean) {
    const next = { ...preferences, [key]: enabled };
    setPreferences(next);
    void (async () => {
      try {
        const token = expoToken ?? await ensureDeviceRegistered(next);
        if (!token) return;
        setExpoToken(token);
        await updateNotificationPreferences(token, next);
      } catch {
        setNotificationStatus('Не удалось сохранить настройки уведомлений');
      }
    })();
  }

  async function logoutAndRemoveDevice() {
    try {
      await removeRegisteredDevice();
    } finally {
      await logout();
    }
  }

  function showPriceListFormatPicker() {
    Alert.alert('Скачать прайс', 'Выберите формат файла для сохранения на телефон.', [
      { text: 'PDF', onPress: () => void handlePriceListDownload('pdf') },
      { text: 'Excel', onPress: () => void handlePriceListDownload('excel') },
      { text: 'Отмена', style: 'cancel' },
    ]);
  }

  async function handlePriceListDownload(format: PriceListFormat) {
    setPriceDownloading(true);
    try {
      const file = await downloadPriceList(format, products ?? []);
      Alert.alert('Прайс сохранён', `Файл ${file.fileName} сохранён в выбранную папку телефона.`);
    } catch (error) {
      Alert.alert('Прайс не скачался', getPriceListDownloadErrorMessage(error));
    } finally {
      setPriceDownloading(false);
    }
  }

  if (loading) {
    return <View style={[styles.screen, tabScreenPadding(insets)]}><Text>Загрузка профиля...</Text></View>;
  }

  if (!user) {
    return (
      <View style={[styles.screen, tabScreenPadding(insets)]}>
        <Text style={styles.title}>Профиль</Text>
        <Text style={styles.muted}>Войдите с теми же данными, которые используете на сайте.</Text>
        <Link href="/auth/login" style={styles.primaryLink}>Войти</Link>
        <Link href="/auth/register" style={styles.secondaryLink}>Создать аккаунт</Link>
      </View>
    );
  }

  return (
    <View style={[styles.screen, tabScreenPadding(insets)]}>
      <Text style={styles.title}>{user.name}</Text>
      <Text style={styles.muted}>{user.phone}</Text>
      {user.telegram ? <Text style={styles.muted}>Telegram: {user.telegram}</Text> : null}
      <View style={styles.tilesRow}>
        <Link href="/orders" asChild>
          <Pressable style={styles.tile}>
            <MaterialIcons color={colors.accentDark} name="receipt-long" size={24} />
            <Text style={styles.tileLabel}>Мои покупки</Text>
          </Pressable>
        </Link>
        <Link href="/favorites" asChild>
          <Pressable style={styles.tile}>
            <MaterialIcons color={colors.accentDark} name="favorite" size={24} />
            <Text style={styles.tileLabel}>
              Избранное{favoriteIds.length ? ` (${favoriteIds.length})` : ''}
            </Text>
          </Pressable>
        </Link>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Уведомления</Text>
        <View style={styles.preference}>
          <Text style={styles.preferenceLabel}>Статусы заказов</Text>
          <Switch
            onValueChange={(enabled) => setPreference('order_status_enabled', enabled)}
            value={preferences.order_status_enabled}
          />
        </View>
        <View style={styles.preference}>
          <Text style={styles.preferenceLabel}>Промо и акции</Text>
          <Switch
            onValueChange={(enabled) => setPreference('promotions_enabled', enabled)}
            value={preferences.promotions_enabled}
          />
        </View>
        <View style={styles.preference}>
          <Text style={styles.preferenceLabel}>Сообщения менеджера</Text>
          <Switch
            onValueChange={(enabled) => setPreference('manager_messages_enabled', enabled)}
            value={preferences.manager_messages_enabled}
          />
        </View>
        {notificationStatus ? <Text style={styles.muted}>{notificationStatus}</Text> : null}
      </View>
      <Pressable onPress={() => void Linking.openURL(appConfig.managerTelegramUrl)} style={styles.outline}>
        <Text style={styles.outlineText}>Написать менеджеру в Telegram</Text>
      </Pressable>
      <Pressable onPress={() => void Linking.openURL(appConfig.managerPhoneUrl)} style={styles.outline}>
        <Text style={styles.outlineText}>Позвонить менеджеру</Text>
      </Pressable>
      <Pressable
        disabled={priceDownloading}
        onPress={showPriceListFormatPicker}
        style={[styles.outline, priceDownloading && styles.disabledButton]}>
        <Text style={styles.outlineText}>{priceDownloading ? 'Готовим прайс...' : 'Открыть прайс-лист'}</Text>
      </Pressable>
      <Pressable onPress={() => void logoutAndRemoveDevice()} style={styles.logout}>
        <Text style={styles.logoutText}>Выйти</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
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
  primaryLink: {
    color: colors.accentDark,
    fontSize: 18,
    fontWeight: '800',
  },
  secondaryLink: {
    color: colors.text,
    fontWeight: '700',
  },
  tilesRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  tile: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    flex: 1,
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
  },
  tileLabel: {
    color: colors.text,
    fontWeight: '800',
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    gap: spacing.sm,
    padding: spacing.md,
  },
  cardTitle: {
    color: colors.text,
    fontWeight: '800',
  },
  preference: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  preferenceLabel: {
    color: colors.text,
    flex: 1,
  },
  outline: {
    borderColor: colors.accent,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
  },
  outlineText: {
    color: colors.accentDark,
    fontWeight: '800',
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.72,
  },
  logout: {
    padding: spacing.md,
  },
  logoutText: {
    color: '#B91C1C',
    fontWeight: '700',
    textAlign: 'center',
  },
});
