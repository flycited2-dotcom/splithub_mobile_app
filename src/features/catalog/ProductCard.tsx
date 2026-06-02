import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';

import { colors, formatPrice, spacing } from '../../lib/theme';
import type { Product } from './types';

const imageBaseUrl = 'https://splithub.ru/assets/img/products/';

type ProductCardProps = {
  cartQty?: number;
  product: Product;
  onAdd: (product: Product) => void;
};

export function ProductCard({ cartQty = 0, product, onAdd }: ProductCardProps) {
  return (
    <View style={styles.card}>
      <Link href={{ pathname: '/product/[id]', params: { id: product.id } }} asChild>
        <Pressable style={styles.details}>
          <Image source={{ uri: `${imageBaseUrl}${product.photo}` }} style={styles.image} />
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
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    width: '48%',
  },
  details: {
    gap: spacing.xs,
    padding: spacing.sm,
  },
  image: {
    backgroundColor: colors.background,
    borderRadius: 10,
    height: 126,
    resizeMode: 'contain',
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
