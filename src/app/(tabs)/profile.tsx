import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCatalog } from '../../features/catalog/catalog-context';
import { useFavorites } from '../../features/favorites/favorites-context';
import { useNotifications } from '../../features/notifications/notifications-context';
import { countPurchasedOrders } from '../../features/orders/order-status';
import { listOrders } from '../../features/orders/orders-repository';
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
  const { user, loading, logout, updateEmail } = useSession();
  const { snapshot, loading: catalogLoading, refresh: refreshCatalog } = useCatalog();
  const { favoriteIds } = useFavorites();
  const { unreadCount } = useNotifications();
  const products = snapshot?.products;
  const [expoToken, setExpoToken] = useState<string | null>(null);
  const [notificationStatus, setNotificationStatus] = useState('');
  const [priceDownloading, setPriceDownloading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultNotificationPreferences);
  const [purchasedCount, setPurchasedCount] = useState(0);
  const [emailInput, setEmailInput] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState('');

  // "Мои покупки" counts real purchases only (excludes cancelled and freshly added "new" orders).
  const loadPurchasedCount = useCallback(async () => {
    if (!user) {
      setPurchasedCount(0);
      return;
    }
    try {
      const { orders } = await listOrders();
      setPurchasedCount(countPurchasedOrders(orders));
    } catch {
      // keep the previous count on a transient failure
    }
  }, [user]);

  useEffect(() => {
    void loadPurchasedCount();
  }, [loadPurchasedCount]);

  const refreshProfile = useCallback(() => {
    void refreshCatalog();
    void loadPurchasedCount();
  }, [refreshCatalog, loadPurchasedCount]);

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

  async function saveEmail() {
    if (!emailInput.includes('@')) {
      setEmailError('Укажите корректный email');
      return;
    }
    setEmailSaving(true);
    setEmailError('');
    try {
      await updateEmail(emailInput);
      setEmailInput('');
    } catch {
      setEmailError('Не удалось сохранить email. Попробуйте позже.');
    } finally {
      setEmailSaving(false);
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
      Alert.alert('Прайс сохранён', `Файл ${file.fileName} сохранён в папку «Загрузки».`);
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
    <ScrollView
      contentContainerStyle={[styles.screen, tabScreenPadding(insets)]}
      refreshControl={
        <RefreshControl
          colors={[colors.accent]}
          onRefresh={refreshProfile}
          refreshing={catalogLoading}
          tintColor={colors.accent}
        />
      }>
      <Text style={styles.title}>{user.name}</Text>
      <Text style={styles.muted}>{user.phone}</Text>
      {user.telegram ? <Text style={styles.muted}>Telegram: {user.telegram}</Text> : null}
      {!user.email ? (
        <View style={styles.emailBanner}>
          <Text style={styles.emailBannerTitle}>Добавьте email</Text>
          <Text style={styles.muted}>Нужен для восстановления доступа, если забудете пароль.</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmailInput}
            placeholder="you@mail.ru"
            style={styles.emailInput}
            value={emailInput}
          />
          {emailError ? <Text style={styles.error}>{emailError}</Text> : null}
          <Pressable disabled={emailSaving} onPress={() => void saveEmail()} style={styles.emailSaveBtn}>
            <Text style={styles.emailSaveText}>{emailSaving ? 'Сохранение...' : 'Сохранить email'}</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.tilesRow}>
        <Pressable onPress={() => router.push('/orders')} style={[styles.tile, styles.tileOrders]}>
          <MaterialIcons color={colors.accentDark} name="receipt-long" size={28} />
          <Text style={[styles.tileLabel, styles.tileLabelOrders]}>
            Мои покупки{purchasedCount ? ` (${purchasedCount})` : ''}
          </Text>
        </Pressable>
        <Pressable onPress={() => router.push('/favorites')} style={[styles.tile, styles.tileFav]}>
          <MaterialIcons color="#EF4444" name="favorite" size={28} />
          <Text style={[styles.tileLabel, styles.tileLabelFav]}>
            Избранное{favoriteIds.length ? ` (${favoriteIds.length})` : ''}
          </Text>
        </Pressable>
      </View>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Уведомления</Text>
          <Pressable onPress={() => router.push('/notifications')} style={styles.openNotifications}>
            <MaterialIcons color={colors.accentDark} name="notifications" size={18} />
            <Text style={styles.openNotificationsText}>Открыть</Text>
            {unreadCount > 0 ? (
              <View style={styles.notificationsBadge}>
                <Text style={styles.notificationsBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
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
      <Pressable onPress={() => void Linking.openURL(appConfig.managerTelegramUrl)} style={[styles.actionButton, styles.telegramButton]}>
        <Text style={[styles.actionText, styles.telegramText]}>Написать менеджеру в Telegram</Text>
      </Pressable>
      <Pressable onPress={() => void Linking.openURL(appConfig.managerPhoneUrl)} style={[styles.actionButton, styles.callButton]}>
        <Text style={[styles.actionText, styles.callText]}>Позвонить менеджеру</Text>
      </Pressable>
      <Pressable
        disabled={priceDownloading}
        onPress={showPriceListFormatPicker}
        style={[styles.actionButton, styles.priceButton, priceDownloading && styles.disabledButton]}>
        <Text style={[styles.actionText, styles.priceText]}>{priceDownloading ? 'Готовим прайс...' : 'Открыть прайс-лист'}</Text>
      </Pressable>
      <Pressable onPress={() => void logoutAndRemoveDevice()} style={styles.logout}>
        <Text style={styles.logoutText}>Выйти</Text>
      </Pressable>
    </ScrollView>
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
  error: {
    color: '#B91C1C',
  },
  emailBanner: {
    backgroundColor: '#F1FBF4',
    borderColor: '#10A03C',
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  emailBannerTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  emailInput: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
  },
  emailSaveBtn: {
    alignItems: 'center',
    backgroundColor: '#10A03C',
    borderRadius: 12,
    padding: spacing.md,
  },
  emailSaveText: {
    color: '#FFFFFF',
    fontWeight: '800',
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
    borderRadius: 16,
    borderWidth: 1.5,
    elevation: 2,
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 88,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    shadowColor: '#0F172A',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  tileLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  tileOrders: {
    backgroundColor: '#FFF1E0',
    borderColor: '#F0A329',
  },
  tileLabelOrders: {
    color: colors.accentDark,
  },
  tileFav: {
    backgroundColor: '#FCECF7',
    borderColor: '#F4B7DB',
  },
  tileLabelFav: {
    color: '#BE185D',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    gap: spacing.sm,
    padding: spacing.md,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: colors.text,
    fontWeight: '800',
  },
  openNotifications: {
    alignItems: 'center',
    backgroundColor: '#FFF1E0',
    borderColor: '#F0A329',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  openNotificationsText: {
    color: colors.accentDark,
    fontWeight: '800',
  },
  notificationsBadge: {
    alignItems: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 999,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 5,
  },
  notificationsBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
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
  actionButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
  },
  actionText: {
    fontWeight: '800',
    textAlign: 'center',
  },
  telegramButton: {
    backgroundColor: '#EFF6FF',
    borderColor: '#4B9BC4',
  },
  telegramText: {
    color: '#2C7DA8',
  },
  callButton: {
    backgroundColor: 'rgba(85, 89, 103, 0.10)',
    borderColor: 'rgba(85, 89, 103, 0.45)',
  },
  callText: {
    color: '#3F4651',
  },
  priceButton: {
    backgroundColor: '#B8D9DB',
    borderColor: '#71CFC8',
  },
  priceText: {
    color: colors.text,
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
