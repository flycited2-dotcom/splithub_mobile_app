import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePagerSwipeLock } from '../../components/pager-swipe-lock';
import { useCart } from '../../features/cart/cart-context';
import { showAddedToCartFeedback } from '../../features/cart/cart-feedback';
import { useCatalog } from '../../features/catalog/catalog-context';
import { catalogRows, filteredRows, type CatalogRow } from '../../features/catalog/catalog-rows';
import { filterProducts } from '../../features/catalog/filter-products';
import { groupProducts } from '../../features/catalog/group-products';
import { ProductCard } from '../../features/catalog/ProductCard';
import { familyFilters, quickFilterById } from '../../features/catalog/quick-filters';
import { positionsText } from '../../features/catalog/stock-tiers';
import type { Product } from '../../features/catalog/types';
import { stackScreenPadding } from '../../lib/safe-area';
import { colors, spacing } from '../../lib/theme';

// Stock tier pills, same tints as the website's stock badges (.sb-* in index.html).
const tierColors: Record<string, { background: string; border: string; text: string }> = {
  in_stock: { background: 'rgba(209,250,229,0.65)', border: 'rgba(16,185,129,0.55)', text: '#047857' },
  days_1_2: { background: 'rgba(255,228,236,0.7)', border: 'rgba(244,114,182,0.55)', text: '#BE185D' },
  days_3_5: { background: 'rgba(255,196,215,0.65)', border: 'rgba(236,72,153,0.55)', text: '#9D174D' },
  days_7: { background: 'rgba(255,196,215,0.65)', border: 'rgba(236,72,153,0.55)', text: '#9D174D' },
  order_7: { background: 'rgba(254,243,199,0.75)', border: 'rgba(245,158,11,0.6)', text: '#B45309' },
  wait: { background: 'rgba(224,231,255,0.7)', border: 'rgba(99,102,241,0.5)', text: '#4338CA' },
  other: { background: 'rgba(254,243,199,0.75)', border: 'rgba(245,158,11,0.6)', text: '#B45309' },
  out: { background: 'rgba(241,245,249,0.7)', border: 'rgba(156,163,175,0.5)', text: '#6B7280' },
};

export default function CatalogScreen() {
  const params = useLocalSearchParams<{ filter?: string; mode?: string }>();
  const insets = useSafeAreaInsets();
  const { snapshot, loading, offline, error, refresh } = useCatalog();
  const { addProduct, quantityByProductId } = useCart();
  const [search, setSearch] = useState('');
  const filter = typeof params.filter === 'string' ? params.filter : '';
  const flatMode = params.mode === 'flat';
  const products = useMemo(
    () => filterProducts(snapshot?.products ?? [], search, filter),
    [filter, search, snapshot],
  );
  // Like the website: the full catalog is section → stock → brand → series,
  // a filter is a dense grid split by stock.
  const rows = useMemo(
    () => (flatMode ? filteredRows(products) : catalogRows(groupProducts(products))),
    [flatMode, products],
  );
  const filterLabel = quickFilterById(filter)?.label;
  const inStockCount = useMemo(() => products.filter((product) => product.stock === 'in_stock').length, [products]);
  const chips = useMemo(() => familyFilters(snapshot?.products ?? [], filter), [filter, snapshot]);
  const listRef = useRef<FlatList<CatalogRow>>(null);
  const swipeLock = usePagerSwipeLock();

  // Switching the quick filter (or editing the search) must show results from
  // the top; FlatList otherwise keeps the scroll offset of the previous list.
  useEffect(() => {
    listRef.current?.scrollToOffset({ animated: false, offset: 0 });
  }, [filter, search, flatMode]);

  const add = useCallback((product: Product) => {
    addProduct(product);
    showAddedToCartFeedback(product.model);
  }, [addProduct]);

  const renderProduct = useCallback((product: Product) => {
    return (
      <ProductCard
        cartQty={quantityByProductId[product.id] ?? 0}
        key={product.id}
        onAdd={add}
        product={product}
      />
    );
  }, [add, quantityByProductId]);

  const renderCatalogRow = useCallback((row: CatalogRow) => {
    switch (row.type) {
      case 'section':
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>{row.label}</Text>
          </View>
        );
      case 'tier': {
        const tint = tierColors[row.key] ?? tierColors.other;
        return (
          <View style={styles.tierRow}>
            <View style={[styles.tierPill, { backgroundColor: tint.background, borderColor: tint.border }]}>
              <Text style={[styles.tierText, { color: tint.text }]}>
                {row.label} · {positionsText(row.count)}
              </Text>
            </View>
            <View style={styles.tierLine} />
          </View>
        );
      }
      case 'brand':
        return (
          <View style={styles.brandHeader}>
            <Text style={styles.brandName}>{row.name}</Text>
            {row.factory ? <Text style={styles.factory}>Завод {row.factory}</Text> : null}
          </View>
        );
      case 'series':
        return (
          <View style={styles.seriesHeader}>
            <Text style={styles.seriesName}>{row.name}</Text>
            {row.description ? <Text style={styles.seriesDescription}>{row.description}</Text> : null}
          </View>
        );
      case 'products':
        return (
          <View style={styles.productRow}>
            {row.products.map(renderProduct)}
            {row.products.length === 1 ? <View style={styles.productSpacer} /> : null}
          </View>
        );
    }
  }, [renderProduct]);

  const renderGroupedItem = useCallback(({ item }: { item: CatalogRow }) => renderCatalogRow(item), [renderCatalogRow]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>{filterLabel ?? 'Весь каталог'}</Text>
        <Text style={styles.subtitle}>
          {snapshot
            ? `${positionsText(products.length)}, в наличии ${inStockCount}`
            : flatMode ? 'Подходящие товары' : 'Каталог по брендам и сериям'}
        </Text>
        {chips.length ? (
          <ScrollView horizontal contentContainerStyle={styles.chips} showsHorizontalScrollIndicator={false} {...swipeLock}>
            {chips.map((chip) => (
              <Pressable
                key={chip.id}
                onPress={() => router.setParams({ filter: chip.id, mode: 'flat' })}
                style={[styles.chip, chip.id === filter && styles.chipActive]}>
                <Text style={[styles.chipText, chip.id === filter && styles.chipTextActive]}>
                  {chip.chip} <Text style={styles.chipCount}>{chip.count}</Text>
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        {offline && snapshot ? (
          <Text style={styles.offline}>
            Офлайн-каталог. Последнее обновление: {new Date(snapshot.updated_at).toLocaleString('ru-RU')}
          </Text>
        ) : null}
        <TextInput
          onChangeText={setSearch}
          placeholder="Поиск по бренду или модели"
          style={styles.search}
          value={search}
        />
      </View>

      {loading && !snapshot ? <ActivityIndicator color={colors.accent} style={styles.loader} /> : null}
      {error && !snapshot ? (
        <Pressable onPress={() => void refresh()} style={styles.retry}>
          <Text style={styles.retryText}>{error}. Повторить</Text>
        </Pressable>
      ) : null}
      {!loading && snapshot && !products.length ? (
        <Text style={styles.empty}>В этой категории пока нет товаров</Text>
      ) : null}

      <FlatList
        contentContainerStyle={[flatMode ? styles.flatList : styles.groupedList, stackScreenPadding(insets)]}
        data={rows}
        initialNumToRender={10}
        keyExtractor={(row) => row.id}
        maxToRenderPerBatch={10}
        ref={listRef}
        removeClippedSubviews
        renderItem={renderGroupedItem}
        windowSize={7}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    gap: spacing.xs,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
  },
  offline: {
    backgroundColor: '#FEF3C7',
    color: colors.warning,
    fontSize: 12,
    padding: spacing.sm,
  },
  search: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  loader: {
    marginTop: spacing.xl,
  },
  retry: {
    alignSelf: 'center',
    marginTop: spacing.xl,
  },
  retryText: {
    color: colors.accentDark,
    fontWeight: '700',
  },
  empty: {
    color: colors.muted,
    padding: spacing.lg,
  },
  flatList: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingTop: 0,
  },
  productRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  productSpacer: {
    width: '48%',
  },
  groupedList: {
    gap: spacing.xl,
    padding: spacing.lg,
    paddingTop: 0,
  },
  sectionHeader: {
    marginBottom: -spacing.sm,
  },
  tierRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tierPill: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  tierText: {
    fontSize: 13,
    fontWeight: '800',
  },
  tierLine: {
    backgroundColor: colors.border,
    flex: 1,
    height: 1,
  },
  chips: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  chip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  chipCount: {
    opacity: 0.7,
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  brandHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  brandName: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  factory: {
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    color: '#166534',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  seriesHeader: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  seriesName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  seriesDescription: {
    color: colors.muted,
    fontSize: 12,
  },
});
