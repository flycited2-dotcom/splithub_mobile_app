import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Link, router } from 'expo-router';

import { useCart } from '../../features/cart/cart-context';
import { upsellProducts } from '../../features/cart/upsell-products';
import { useCatalog } from '../../features/catalog/catalog-context';
import { colors, formatPrice, spacing } from '../../lib/theme';

export default function CartScreen() {
  const { snapshot } = useCatalog();
  const { items, total, addProduct, setQty, checkout, checkoutError, checkingOut } = useCart();
  const [comment, setComment] = useState('');
  const installerKit = useMemo(
    () => upsellProducts(items, snapshot?.products ?? []),
    [items, snapshot],
  );
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);

  async function submit() {
    const result = await checkout(comment);
    if (!result) return;
    setComment('');
    Alert.alert('Заявка отправлена', `Номер заявки: SH-${String(result.order_id).padStart(5, '0')}`);
    router.push('/orders');
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Корзина</Text>
      {!items.length ? <Text style={styles.empty}>Корзина пока пуста</Text> : null}

      {items.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle}>{item.name}</Text>
            <Text style={styles.itemMeta}>{formatPrice(item.price)} / шт.</Text>
            <Text style={styles.price}>{formatPrice(item.price * item.qty)}</Text>
          </View>
          <View style={styles.itemActions}>
            <View style={styles.qty}>
              <Pressable onPress={() => setQty(item.id, item.qty - 1)} style={styles.qtyButton}>
                <Text style={styles.qtyText}>−</Text>
              </Pressable>
              <Text style={styles.qtyValue}>{item.qty}</Text>
              <Pressable onPress={() => setQty(item.id, item.qty + 1)} style={[styles.qtyButton, styles.qtyButtonActive]}>
                <Text style={[styles.qtyText, styles.qtyTextActive]}>+</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setQty(item.id, 0)} style={styles.remove}>
              <Text style={styles.removeText}>Удалить</Text>
            </Pressable>
          </View>
        </View>
      ))}

      {installerKit.length ? (
        <View style={styles.upsell}>
          <Text style={styles.upsellTitle}>Комплект монтажника</Text>
          <Text style={styles.upsellSubtitle}>Добавьте к сплит-системе</Text>
          {installerKit.map((product) => (
            <View key={product.id} style={styles.upsellItem}>
              <View style={styles.upsellInfo}>
                <Text style={styles.upsellName}>{product.model}</Text>
                <Text style={styles.upsellPrice}>{formatPrice(product.price)}</Text>
              </View>
              <Pressable onPress={() => addProduct(product)} style={styles.upsellButton}>
                <Text style={styles.upsellButtonText}>+ Добавить</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      {items.length ? (
        <>
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalLabel}>Итого по заявке</Text>
              <Text style={styles.totalCount}>{itemCount} шт.</Text>
            </View>
            <Text style={styles.total}>{formatPrice(total)}</Text>
          </View>
          <TextInput
            multiline
            onChangeText={setComment}
            placeholder="Добавить комментарий"
            style={styles.comment}
            value={comment}
          />
          <Text style={styles.note}>После отправки заявка сразу поступит менеджеру.</Text>
          {checkoutError ? <Text style={styles.error}>{checkoutError.message}</Text> : null}
          {checkoutError?.code === 'AUTH_REQUIRED' ? (
            <Link href="/auth/login" style={styles.loginLink}>Войти в аккаунт</Link>
          ) : null}
          <View style={styles.bottomActions}>
            <Pressable onPress={() => router.push('/catalog')} style={styles.continueButton}>
              <Text style={styles.continueText}>Продолжить покупки</Text>
            </Pressable>
            <Pressable
              disabled={checkingOut}
              onPress={() => void submit()}
              style={[styles.checkout, checkingOut && styles.checkoutDisabled]}>
              <Text style={styles.checkoutText}>{checkingOut ? 'Отправка...' : 'Отправить заявку'}</Text>
            </Pressable>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: colors.background,
    flexGrow: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  empty: {
    color: colors.muted,
  },
  card: {
    alignItems: 'center',
    backgroundColor: '#334155',
    borderRadius: 14,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  itemInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  itemTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  itemMeta: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  price: {
    color: '#FBBF24',
    fontWeight: '900',
  },
  itemActions: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  qty: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  qtyButton: {
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  qtyButtonActive: {
    backgroundColor: colors.accent,
  },
  qtyText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  qtyTextActive: {
    color: '#FFFFFF',
  },
  qtyValue: {
    color: '#FFFFFF',
    minWidth: 18,
    textAlign: 'center',
  },
  remove: {
    padding: spacing.xs,
  },
  removeText: {
    color: '#FECACA',
    fontSize: 12,
  },
  upsell: {
    backgroundColor: '#FFFDF5',
    borderColor: '#F3D6A2',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  upsellTitle: {
    color: colors.accentDark,
    fontSize: 18,
    fontWeight: '900',
  },
  upsellSubtitle: {
    color: colors.muted,
  },
  upsellItem: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  upsellInfo: {
    flex: 1,
  },
  upsellName: {
    color: colors.text,
    fontWeight: '700',
  },
  upsellPrice: {
    color: colors.accentDark,
    fontSize: 12,
    fontWeight: '800',
    marginTop: spacing.xs,
  },
  upsellButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    padding: spacing.sm,
  },
  upsellButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  totalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  totalLabel: {
    color: colors.muted,
  },
  totalCount: {
    color: colors.text,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  total: {
    color: colors.accentDark,
    fontSize: 24,
    fontWeight: '900',
  },
  comment: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 72,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  note: {
    color: colors.muted,
    fontSize: 12,
  },
  error: {
    color: '#B91C1C',
  },
  loginLink: {
    color: colors.accentDark,
    fontWeight: '800',
  },
  bottomActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  continueButton: {
    alignItems: 'center',
    borderColor: '#FECACA',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  continueText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  checkout: {
    alignItems: 'center',
    backgroundColor: '#43A047',
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  checkoutDisabled: {
    opacity: 0.6,
  },
  checkoutText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
});
