import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';

import { useFavorites } from '../favorites/favorites-context';
import { colors, formatPrice, spacing } from '../../lib/theme';
import { isOrderable, promoBadge } from './promo-badge';
import { stockBadge } from './stock-badge';
import type { Product } from './types';

const imageBaseUrl = 'https://splithub.ru/assets/img/products/';

type ProductCardProps = {
  cartQty?: number;
  product: Product;
  onAdd: (product: Product) => void;
};

export const ProductCard = memo(function ProductCard({ cartQty = 0, product, onAdd }: ProductCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(product.id);
  const badge = stockBadge(product);
  const promo = promoBadge(product);
  const orderable = isOrderable(product);

  return (
    <View style={styles.card}>
      {promo ? (
        <View pointerEvents="none" style={[styles.promoBadge, { backgroundColor: promo.backgroundColor }]}>
          <Text numberOfLines={1} style={styles.promoText}>{promo.label}</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityLabel={favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
        hitSlop={8}
        onPress={() => toggleFavorite(product.id)}
        style={styles.heartButton}>
        <MaterialIcons
          color={favorite ? '#EF4444' : colors.muted}
          name={favorite ? 'favorite' : 'favorite-border'}
          size={22}
        />
      </Pressable>
      <Link href={{ pathname: '/product/[id]', params: { id: product.id } }} asChild>
        <Pressable style={styles.details}>
          <Image
            cachePolicy="memory-disk"
            contentFit="contain"
            recyclingKey={product.photo}
            source={{ uri: `${imageBaseUrl}${product.photo}` }}
            style={styles.image}
            transition={0}
          />
          <Text numberOfLines={1} style={styles.brand}>{product.brand}</Text>
          <Text numberOfLines={2} style={styles.model}>{product.model}</Text>
          {product.descShort ? <Text numberOfLines={2} style={styles.description}>{product.descShort}</Text> : null}
          {product.description ? <Text numberOfLines={3} style={styles.adminNote}>{product.description}</Text> : null}
          <View style={[styles.stockBadge, { backgroundColor: badge.backgroundColor, borderColor: badge.borderColor }]}>
            <Text numberOfLines={1} style={[styles.stockBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
        </Pressable>
      </Link>
      {orderable ? (
        <Pressable onPress={() => onAdd(product)} style={styles.addButton}>
          <Text style={styles.addText}>{cartQty > 0 ? `В заявке · ${cartQty}` : 'Заказать'}</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityLabel="Нет в наличии, заказать нельзя"
          accessibilityState={{ disabled: true }}
          disabled
          style={[styles.addButton, styles.addButtonDisabled]}>
          <Text style={styles.addText}>Нет в наличии</Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    width: '48%',
  },
  heartButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    position: 'absolute',
    right: spacing.sm,
    top: spacing.sm,
    width: 34,
    zIndex: 2,
  },
  details: {
    gap: spacing.xs,
    padding: spacing.sm,
  },
  image: {
    backgroundColor: colors.background,
    borderRadius: 10,
    height: 126,
    width: '100%',
  },
  brand: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  model: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    minHeight: 34,
  },
  description: {
    color: colors.muted,
    fontSize: 11,
    minHeight: 28,
  },
  stockBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    borderWidth: 1,
    elevation: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    shadowColor: '#0F172A',
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  price: {
    color: colors.accentDark,
    fontSize: 17,
    fontWeight: '900',
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    margin: spacing.sm,
    marginTop: 0,
    padding: spacing.sm,
    borderRadius: 10,
  },
  addButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  addText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  adminNote: {
    color: '#4B5563',
    fontSize: 11,
    fontStyle: 'italic',
  },
  promoBadge: {
    borderRadius: 20,
    left: spacing.sm,
    paddingHorizontal: 9,
    paddingVertical: 3,
    position: 'absolute',
    top: spacing.sm,
    zIndex: 2,
  },
  promoText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
