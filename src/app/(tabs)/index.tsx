import { useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { homeQuickFilterIds, polupromQuickFilterIds, visibleQuickFilters } from '../../features/catalog/quick-filters';
import { useCatalog } from '../../features/catalog/catalog-context';
import { appConfig } from '../../features/home/app-config';
import {
  downloadPriceList,
  getPriceListDownloadErrorMessage,
  type PriceListFormat,
} from '../../features/home/price-list-download';
import { useSession } from '../../features/session/session-context';
import { colors, spacing } from '../../lib/theme';

export default function HomeScreen() {
  const [priceDownloading, setPriceDownloading] = useState(false);
  const [polupromOpen, setPolupromOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { loading, user } = useSession();
  const { loading: catalogLoading, refresh: refreshCatalog, snapshot } = useCatalog();
  const products = snapshot?.products;
  const authTarget = user ? '/profile' : '/auth/login';
  const homeFilters = useMemo(
    () => visibleQuickFilters(products, homeQuickFilterIds),
    [products],
  );
  const polupromFilters = useMemo(
    () => visibleQuickFilters(products, polupromQuickFilterIds),
    [products],
  );

  function openCatalog(filter?: string) {
    // Use navigate (not push) so switching to the Catalog tab does not stack
    // duplicate screens; back then returns to Home instead of exiting the app.
    if (!filter) {
      router.navigate({ pathname: '/catalog', params: { filter: '', mode: 'flat' } } as never);
      return;
    }
    router.navigate({ pathname: '/catalog', params: { filter, mode: 'flat' } } as never);
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

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <ScrollView
        alwaysBounceVertical={false}
        bounces={false}
        overScrollMode="never"
        refreshControl={
          <RefreshControl
            colors={[colors.accent]}
            onRefresh={refreshCatalog}
            refreshing={catalogLoading}
            tintColor={colors.accent}
          />
        }
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.topRow}>
          <Text style={styles.smallLogo}>Сплит<Text style={styles.logoAccent}>Хаб</Text></Text>
          <Pressable disabled={loading} onPress={() => router.push(authTarget as never)} style={styles.loginButton}>
            <Text style={styles.loginText}>{loading ? '...' : user ? 'Профиль' : 'Войти'}</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/cart')} style={styles.orderButton}>
            <Text style={styles.orderText}>Заявка</Text>
          </Pressable>
        </View>

        <View style={styles.contactGrid}>
          {appConfig.contacts.map((contact) => (
            <Pressable
              key={contact.url}
              onPress={() => void Linking.openURL(contact.url)}
              style={[styles.contact, contact.kind === 'telegram' && styles.telegramContact]}>
              <Text style={[styles.contactText, contact.kind === 'telegram' && styles.telegramText]}>
                {contact.kind === 'phone' ? '☎ ' : '➤ '}{contact.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrow}>ОПТОВЫЙ ПРАЙС ДЛЯ МОНТАЖНИКОВ И B2B</Text>
          <Text style={styles.heroLogo}>Сплит<Text style={styles.logoAccent}>Хаб</Text></Text>
          <Text style={styles.subtitle}>Мультибренд · Медная труба · Расходники · Опт</Text>
        </View>

        <Pressable
          disabled={priceDownloading}
          onPress={showPriceListFormatPicker}
          style={[styles.priceButton, priceDownloading && styles.disabledButton]}>
          <Text style={styles.priceText}>{priceDownloading ? 'Готовим прайс...' : '⇩  Загрузить прайс'}</Text>
        </Pressable>
        <Pressable onPress={() => openCatalog()} style={styles.catalogButton}>
          <Text style={styles.catalogText}>▤  Весь каталог</Text>
        </Pressable>

        <View style={styles.filterGrid}>
          {homeFilters.map((filter) => (
            <Pressable
              key={filter.id}
              onPress={() => filter.id === 'poluprom' ? setPolupromOpen(true) : openCatalog(filter.id)}
              style={[
                styles.filterButton,
                filter.id.startsWith('inv') && styles.inverterFilter,
                (filter.id === 'on79' || filter.id === 'on12') && styles.onSmallFilter,
                (filter.id === 'on18' || filter.id === 'on2436') && styles.onLargeFilter,
                filter.id === 'truba' && styles.copperFilter,
                filter.id === 'rashod' && styles.silverFilter,
                filter.id === 'multi' && styles.blackFilter,
              ]}>
              <Text style={[styles.filterText, filter.id === 'multi' && styles.blackFilterText]}>
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </View>

      </ScrollView>

      <Modal animationType="fade" transparent visible={polupromOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Полупром</Text>
            {polupromFilters.map((filter) => (
              <Pressable
                key={filter.id}
                onPress={() => {
                  setPolupromOpen(false);
                  openCatalog(filter.id);
                }}
                style={styles.modalButton}>
                <Text style={styles.modalButtonText}>{filter.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={() => setPolupromOpen(false)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>Закрыть</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F4F6FB',
    flex: 1,
  },
  scroll: {
    backgroundColor: '#F4F6FB',
    flex: 1,
  },
  content: {
    backgroundColor: '#F4F6FB',
    gap: spacing.md,
    padding: spacing.lg,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  smallLogo: {
    color: colors.text,
    flex: 1,
    fontSize: 20,
    fontWeight: '900',
  },
  logoAccent: {
    color: '#F0A329',
  },
  loginButton: {
    backgroundColor: '#E5E7EB',
    borderColor: '#C7CBD1',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  loginText: {
    color: colors.text,
    fontWeight: '700',
  },
  orderButton: {
    backgroundColor: '#F0A329',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  orderText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  contactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  contact: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E3E8',
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.sm,
    width: '48.5%',
  },
  telegramContact: {
    backgroundColor: '#EFF6FF',
    borderColor: '#D4E4F3',
  },
  contactText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  telegramText: {
    color: '#4B9BC4',
  },
  hero: {
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  eyebrow: {
    color: '#D99A37',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  heroLogo: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
  },
  priceButton: {
    alignItems: 'center',
    backgroundColor: '#B8D9DB',
    borderColor: '#71CFC8',
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.lg,
  },
  priceText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.72,
  },
  catalogButton: {
    alignItems: 'center',
    backgroundColor: '#F0A329',
    borderRadius: 16,
    padding: spacing.lg,
  },
  catalogText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E3E8',
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 54,
    padding: spacing.sm,
    width: '48.5%',
  },
  inverterFilter: {
    backgroundColor: '#FCECF7',
    borderColor: '#F4B7DB',
  },
  onSmallFilter: {
    backgroundColor: 'rgba(45, 212, 191, 0.14)',
    borderColor: 'rgba(20, 184, 166, 0.42)',
  },
  onLargeFilter: {
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(5, 150, 105, 0.42)',
  },
  copperFilter: {
    backgroundColor: 'rgba(184, 115, 51, 0.16)',
    borderColor: 'rgba(184, 115, 51, 0.42)',
  },
  silverFilter: {
    backgroundColor: 'rgba(226, 232, 240, 0.72)',
    borderColor: '#CBD5E1',
  },
  blackFilter: {
    backgroundColor: '#555967',
    borderColor: '#555967',
  },
  filterText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  blackFilterText: {
    color: '#FFFFFF',
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    gap: spacing.sm,
    padding: spacing.lg,
    width: '100%',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
  modalButton: {
    backgroundColor: '#F8FAFC',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
  },
  modalButtonText: {
    color: colors.text,
    fontWeight: '700',
  },
  modalClose: {
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCloseText: {
    color: colors.accentDark,
    fontWeight: '800',
  },
});
