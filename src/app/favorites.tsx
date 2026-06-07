import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StackBottomTabs } from '../components/stack-bottom-tabs';
import { useCart } from '../features/cart/cart-context';
import { showAddedToCartFeedback } from '../features/cart/cart-feedback';
import { useCatalog } from '../features/catalog/catalog-context';
import { ProductCard } from '../features/catalog/ProductCard';
import type { Product } from '../features/catalog/types';
import { useFavorites } from '../features/favorites/favorites-context';
import { stackScreenPadding } from '../lib/safe-area';
import { colors, spacing } from '../lib/theme';

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { snapshot } = useCatalog();
  const { addProduct, quantityByProductId } = useCart();
  const { favoriteIds } = useFavorites();

  const products = useMemo(() => {
    const ids = new Set(favoriteIds);
    return (snapshot?.products ?? []).filter((product) => ids.has(product.id));
  }, [favoriteIds, snapshot]);

  const add = useCallback((product: Product) => {
    addProduct(product);
    showAddedToCartFeedback(product.model);
  }, [addProduct]);

  const renderItem = useCallback(
    ({ item }: { item: Product }) => (
      <ProductCard cartQty={quantityByProductId[item.id] ?? 0} onAdd={add} product={item} />
    ),
    [add, quantityByProductId],
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Избранное' }} />
      {!products.length ? (
        <Text style={styles.empty}>
          В избранном пока пусто. Нажмите на сердечко на карточке товара, чтобы сохранить его здесь.
        </Text>
      ) : (
        <FlatList
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={[styles.list, stackScreenPadding(insets)]}
          data={products}
          initialNumToRender={10}
          keyExtractor={(product) => product.id}
          maxToRenderPerBatch={10}
          numColumns={2}
          removeClippedSubviews
          renderItem={renderItem}
          windowSize={7}
        />
      )}
      <StackBottomTabs />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  empty: {
    color: colors.muted,
    padding: spacing.lg,
  },
  list: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  productRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
