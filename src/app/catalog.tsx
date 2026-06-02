import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCart } from '../features/cart/cart-context';
import { showAddedToCartFeedback } from '../features/cart/cart-feedback';
import { useCatalog } from '../features/catalog/catalog-context';
import { catalogRows, type CatalogRow } from '../features/catalog/catalog-rows';
import { filterProducts } from '../features/catalog/filter-products';
import { groupProducts } from '../features/catalog/group-products';
import { ProductCard } from '../features/catalog/ProductCard';
import { quickFilters } from '../features/catalog/quick-filters';
import type { Product } from '../features/catalog/types';
import { stackScreenPadding } from '../lib/safe-area';
import { colors, spacing } from '../lib/theme';

export default function CatalogScreen() {
  const params = useLocalSearchParams<{ filter?: string; mode?: string }>();
  const insets = useSafeAreaInsets();
  const { snapshot, loading, offline, error, refresh } = useCatalog();
  const { addProduct } = useCart();
  const [search, setSearch] = useState('');
  const filter = typeof params.filter === 'string' ? params.filter : '';
  const flatMode = params.mode === 'flat';
  const products = useMemo(
    () => filterProducts(snapshot?.products ?? [], search, filter),
    [filter, search, snapshot],
  );
  const sections = useMemo(() => groupProducts(products), [products]);
  const rows = useMemo(() => catalogRows(sections), [sections]);
  const filterLabel = quickFilters.find((item) => item.id === filter)?.label;

  function add(product: Product) {
    addProduct(product);
    showAddedToCartFeedback(product.model);
  }

  function renderProduct(product: Product) {
    return <ProductCard key={product.id} onAdd={add} product={product} />;
  }

  function renderCatalogRow(row: CatalogRow) {
    switch (row.type) {
      case 'section':
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>{row.label}</Text>
          </View>
        );
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
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: filterLabel ?? 'Весь каталог' }} />
      <View style={styles.header}>
        <Text style={styles.title}>{filterLabel ?? 'Весь каталог'}</Text>
        <Text style={styles.subtitle}>
          {flatMode ? 'Подходящие товары' : 'Каталог по брендам и сериям'}
        </Text>
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

      {flatMode ? (
        <FlatList
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={[styles.flatList, stackScreenPadding(insets)]}
          data={products}
          initialNumToRender={10}
          keyExtractor={(product) => product.id}
          maxToRenderPerBatch={10}
          numColumns={2}
          removeClippedSubviews
          renderItem={({ item }) => renderProduct(item)}
          windowSize={7}
        />
      ) : (
        <FlatList
          contentContainerStyle={[styles.groupedList, stackScreenPadding(insets)]}
          data={rows}
          initialNumToRender={10}
          keyExtractor={(row) => row.id}
          maxToRenderPerBatch={10}
          removeClippedSubviews
          renderItem={({ item }) => renderCatalogRow(item)}
          windowSize={7}
        />
      )}
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
