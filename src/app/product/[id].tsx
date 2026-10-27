import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StackBottomTabs } from '../../components/stack-bottom-tabs';
import { showAddedToCartFeedback } from '../../features/cart/cart-feedback';
import { useCatalog } from '../../features/catalog/catalog-context';
import { productShareData, shareUrls } from '../../features/catalog/share-product';
import { PhotoGallery } from '../../features/catalog/PhotoGallery';
import { isOrderable, promoBadge } from '../../features/catalog/promo-badge';
import { stockBadge } from '../../features/catalog/stock-badge';
import { useCart } from '../../features/cart/cart-context';
import { stackScreenPadding } from '../../lib/safe-area';
import { colors, formatPrice, spacing } from '../../lib/theme';

// Consumables carry "-" in spec fields instead of leaving them empty.
const hasValue = (value?: string) => Boolean(value && !/^[\s\-–—]*$/.test(value));

export default function ProductDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { snapshot } = useCatalog();
  const { addProduct, quantityByProductId } = useCart();
  const [qty, setQty] = useState(1);
  const product = snapshot?.products.find((item) => item.id === id);

  if (!product) {
    return (
      <View style={[styles.empty, stackScreenPadding(insets)]}>
        <Text>Товар не найден</Text>
      </View>
    );
  }

  const selectedProduct = product;
  const cartQty = quantityByProductId[selectedProduct.id] ?? 0;
  const badge = stockBadge(product);
  const promo = promoBadge(product);
  const orderable = isOrderable(product);
  const urls = shareUrls(selectedProduct);
  const specs = [
    hasValue(product.btu) ? `Мощность: ${product.btu} BTU` : '',
    product.area ? `Площадь: до ${product.area} м²` : '',
    hasValue(product.compressor) ? `Компрессор: ${product.compressor}` : '',
    hasValue(product.freon) ? `Фреон: ${product.freon}` : '',
  ].filter(Boolean);

  function addToCart() {
    addProduct(selectedProduct, qty);
    showAddedToCartFeedback(selectedProduct.model, qty);
  }

  async function copyLink() {
    await Clipboard.setStringAsync(productShareData(selectedProduct).url);
    Alert.alert('Готово', 'Ссылка на товар скопирована');
  }

  return (
    <>
      <Stack.Screen options={{ title: product.model }} />
      <ScrollView contentContainerStyle={[styles.content, stackScreenPadding(insets)]}>
        <Text style={styles.brand}>{product.brand}</Text>
        <Text style={styles.title}>{product.model}</Text>
        <Text style={styles.description}>{product.descShort}</Text>
        {product.description ? <Text style={styles.adminNote}>{product.description}</Text> : null}
        <View style={styles.badgeRow}>
          <View style={[styles.stockBadge, { backgroundColor: badge.backgroundColor, borderColor: badge.borderColor }]}>
            <Text style={[styles.stockBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
          {promo ? (
            <View style={[styles.promoBadge, { backgroundColor: promo.backgroundColor }]}>
              <Text style={styles.promoText}>{promo.label}</Text>
            </View>
          ) : null}
        </View>
        <PhotoGallery photos={product.photos?.length ? product.photos : [product.photo].filter(Boolean)} />
        <View style={styles.priceRow}>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
          {orderable ? (
            <Pressable onPress={addToCart} style={styles.addButton}>
              <Text style={styles.addText}>{cartQty > 0 ? `В заявке · ${cartQty}` : 'В заявку'}</Text>
            </Pressable>
          ) : (
            <View style={[styles.addButton, styles.addButtonDisabled]}>
              <Text style={styles.addText}>Нет в наличии</Text>
            </View>
          )}
        </View>

        {specs.length ? (
          <View style={styles.specGrid}>
            {specs.map((spec) => (
              <View key={spec} style={styles.specChip}>
                <Text style={styles.specText}>{spec}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {product.benefits.length ? (
          <View style={styles.benefits}>
            <Text style={styles.sectionTitle}>ПРЕИМУЩЕСТВА</Text>
            {product.benefits.map((benefit) => (
              <Text key={benefit} style={styles.benefit}>✓  {benefit}</Text>
            ))}
          </View>
        ) : null}

        <View style={styles.shareRow}>
          <Pressable onPress={() => void Linking.openURL(urls.max)} style={[styles.shareButton, styles.maxButton]}>
            <Text style={styles.shareText}>MAX</Text>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL(urls.telegram)} style={[styles.shareButton, styles.telegramButton]}>
            <Text style={styles.shareText}>Telegram</Text>
          </Pressable>
          <Pressable onPress={() => void Linking.openURL(urls.email)} style={[styles.shareButton, styles.emailButton]}>
            <Text style={styles.shareText}>Email</Text>
          </Pressable>
          <Pressable onPress={() => void copyLink()} style={[styles.shareButton, styles.copyButton]}>
            <Text style={styles.copyText}>Ссылка</Text>
          </Pressable>
        </View>

        <View style={styles.qtyRow}>
          <Text style={styles.qtyLabel}>Количество</Text>
          <View style={styles.qtyControls}>
            <Pressable onPress={() => setQty((current) => Math.max(1, current - 1))} style={styles.qtyButton}>
              <Text style={styles.qtyText}>−</Text>
            </Pressable>
            <Text style={styles.qtyValue}>{qty}</Text>
            <Pressable onPress={() => setQty((current) => current + 1)} style={[styles.qtyButton, styles.qtyButtonActive]}>
              <Text style={[styles.qtyText, styles.qtyTextActive]}>+</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <StackBottomTabs active="home" />
    </>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    backgroundColor: colors.background,
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  brand: {
    color: colors.muted,
    fontWeight: '800',
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  description: {
    color: colors.muted,
  },
  adminNote: {
    color: '#4B5563',
    fontStyle: 'italic',
  },
  badgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  promoBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  promoText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  addButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  stockBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  stockBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  priceRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  price: {
    color: '#2563EB',
    fontSize: 28,
    fontWeight: '900',
  },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  addText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  specGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  specChip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.sm,
  },
  specText: {
    color: colors.text,
    fontSize: 13,
  },
  benefits: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    color: colors.muted,
    fontWeight: '900',
    letterSpacing: 1,
  },
  benefit: {
    color: colors.text,
    fontSize: 16,
  },
  shareRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  shareButton: {
    alignItems: 'center',
    borderRadius: 12,
    padding: spacing.md,
    width: '48%',
  },
  maxButton: {
    backgroundColor: '#5B42EF',
  },
  telegramButton: {
    backgroundColor: '#4B9FD1',
  },
  emailButton: {
    backgroundColor: '#C98A42',
  },
  copyButton: {
    backgroundColor: '#E5E7EB',
  },
  shareText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  copyText: {
    color: colors.text,
    fontWeight: '800',
  },
  qtyRow: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  qtyLabel: {
    color: colors.text,
    fontWeight: '800',
  },
  qtyControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  qtyButton: {
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  qtyButtonActive: {
    backgroundColor: colors.accent,
  },
  qtyText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  qtyTextActive: {
    color: '#FFFFFF',
  },
  qtyValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    minWidth: 24,
    textAlign: 'center',
  },
});
