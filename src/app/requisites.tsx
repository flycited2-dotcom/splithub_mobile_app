import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StackBottomTabs } from '../components/stack-bottom-tabs';
import { apiErrorCode } from '../features/session/session-errors';
import { useSession } from '../features/session/session-context';
import { requisitesErrorMessage, updateRequisites, type Requisites } from '../features/session/requisites';
import { stackScreenPadding } from '../lib/safe-area';
import { colors, spacing } from '../lib/theme';

// Company requisites for invoices — the "Реквизиты" tab of the website account.
export default function RequisitesScreen() {
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useSession();
  const [form, setForm] = useState<Requisites>({
    company_name: user?.company_name ?? '',
    inn: user?.inn ?? '',
    kpp: user?.kpp ?? '',
    legal_address: user?.legal_address ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const set = (key: keyof Requisites) => (value: string) => {
    setMessage(null);
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await updateRequisites(form);
      await refreshProfile();
      setMessage({ ok: true, text: '✓ Реквизиты сохранены' });
    } catch (error) {
      setMessage({ ok: false, text: requisitesErrorMessage(apiErrorCode(error)) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Реквизиты компании' }} />
      <ScrollView contentContainerStyle={[styles.content, stackScreenPadding(insets)]} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>Нужны, чтобы менеджер выставил счёт на вашу компанию. Все поля необязательные.</Text>
        <Text style={styles.label}>Название компании / ИП</Text>
        <TextInput onChangeText={set('company_name')} placeholder="ООО «Климат»" style={styles.input} value={form.company_name} />
        <Text style={styles.label}>ИНН</Text>
        <TextInput keyboardType="number-pad" maxLength={12} onChangeText={set('inn')} placeholder="10 или 12 цифр" style={styles.input} value={form.inn} />
        <Text style={styles.label}>КПП</Text>
        <TextInput keyboardType="number-pad" maxLength={9} onChangeText={set('kpp')} placeholder="9 цифр (для ООО)" style={styles.input} value={form.kpp} />
        <Text style={styles.label}>Юридический адрес</Text>
        <TextInput multiline onChangeText={set('legal_address')} placeholder="Город, улица, дом" style={[styles.input, styles.multiline]} value={form.legal_address} />
        {message ? <Text style={message.ok ? styles.success : styles.error}>{message.text}</Text> : null}
        <Pressable disabled={saving} onPress={() => void save()} style={[styles.save, saving && styles.saveDisabled]}>
          <Text style={styles.saveText}>{saving ? 'Сохранение...' : 'Сохранить реквизиты'}</Text>
        </Pressable>
      </ScrollView>
      <StackBottomTabs active="profile" />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: colors.background,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  hint: {
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.text,
    fontWeight: '800',
    marginTop: spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
  },
  multiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  success: {
    color: '#15803D',
    fontWeight: '700',
  },
  error: {
    color: '#B91C1C',
    fontWeight: '700',
  },
  save: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  saveDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
});
