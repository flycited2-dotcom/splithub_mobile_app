import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';

import { useFavorites } from '../favorites/favorites-context';
import { colors, formatPrice, spacing } from '../../lib/theme';
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

  return (
    <View style={styles.card}>
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
          <Text style={[styles.stock, product.stock !== 'in_stock' && styles.stockMuted]}>
            {product.stockLabel}
          </Text>
          <Text style={styles.price}>{formatPrice(product.price)}</Text>
        </Pressable>
      </Link>
      <Pressable onPress={() => onAdd(product)} style={styles.addButton}>
        <Text style={styles.addText}>{cartQty > 0 ? `В заявке · ${cartQty}` : 'Заказать'}</Text>
      </Pressable>
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
  stock: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '700',
  },
  stockMuted: {
    color: colors.muted,
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
  addText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
