import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCart } from '../features/cart/cart-context';
import { computeEstimate, defaultWorks, type EstimateWork } from '../features/estimate/estimate';
import { saveEstimatePdf, shareEstimatePdf, type EstimateMeta } from '../features/estimate/estimate-pdf';
import { useSession } from '../features/session/session-context';
import { stackScreenPadding } from '../lib/safe-area';
import { estimateSettingsStorage } from '../lib/storage';
import { colors, formatPrice, spacing } from '../lib/theme';

type Settings = {
  markupPercent: number;
  works: EstimateWork[];
  contractorName: string;
  contractorPhone: string;
  validDays: number;
};

const markupPresets = [0, 15, 20, 25, 30];
const toNumber = (value: string) => Math.max(0, Number(value.replace(/[^\d]/g, '')) || 0);

// Estimate for the installer's client: cart equipment at resale prices + works, as a PDF.
export default function EstimateScreen() {
  const insets = useSafeAreaInsets();
  const { items } = useCart();
  const { user } = useSession();
  const [settings, setSettings] = useState<Settings>({
    markupPercent: 25,
    works: defaultWorks(),
    contractorName: user?.company_name || user?.name || '',
    contractorPhone: user?.phone || '',
    validDays: 7,
  });
  const [clientName, setClientName] = useState('');
  const [objectAddress, setObjectAddress] = useState('');
  const [busy, setBusy] = useState<'share' | 'save' | null>(null);

  useEffect(() => {
    void estimateSettingsStorage.read<Settings>().then((saved) => {
      if (saved?.works?.length) setSettings((current) => ({ ...current, ...saved }));
    });
  }, []);

  const update = (patch: Partial<Settings>) =>
    setSettings((current) => {
      const next = { ...current, ...patch };
      void estimateSettingsStorage.write(next);
      return next;
    });
  const updateWork = (id: string, patch: Partial<EstimateWork>) =>
    update({ works: settings.works.map((work) => (work.id === id ? { ...work, ...patch } : work)) });

  const estimate = useMemo(
    () => computeEstimate({ items: items.map(({ name, price, qty }) => ({ name, price, qty })), works: settings.works, markupPercent: settings.markupPercent }),
    [items, settings],
  );

  const meta = (): EstimateMeta => ({
    clientName: clientName.trim(),
    objectAddress: objectAddress.trim(),
    contractorName: settings.contractorName.trim(),
    contractorPhone: settings.contractorPhone.trim(),
    validDays: settings.validDays,
    date: new Date(),
  });

  async function run(kind: 'share' | 'save') {
    setBusy(kind);
    try {
      if (kind === 'share') {
        await shareEstimatePdf(estimate, meta());
      } else {
        const fileName = await saveEstimatePdf(estimate, meta());
        Alert.alert('Смета сохранена', `Файл ${fileName} сохранён в папку «Загрузки».`);
      }
    } catch (error) {
      Alert.alert('Не удалось подготовить смету', (error as Error).message || 'Попробуйте ещё раз');
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Смета для клиента' }} />
      <ScrollView contentContainerStyle={[styles.content, stackScreenPadding(insets)]} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>Цены оборудования для клиента — ваша оптовая цена плюс наценка. Оптовые цены в смете не показываются.</Text>

        <Text style={styles.section}>Клиент</Text>
        <TextInput onChangeText={setClientName} placeholder="Имя клиента" style={styles.input} value={clientName} />
        <TextInput onChangeText={setObjectAddress} placeholder="Адрес объекта" style={styles.input} value={objectAddress} />

        <Text style={styles.section}>Наценка на оборудование</Text>
        <View style={styles.chips}>
          {markupPresets.map((value) => (
            <Pressable
              key={value}
              onPress={() => update({ markupPercent: value })}
              style={[styles.chip, settings.markupPercent === value && styles.chipActive]}>
              <Text style={[styles.chipText, settings.markupPercent === value && styles.chipTextActive]}>
                {value ? `+${value}%` : 'Без наценки'}
              </Text>
            </Pressable>
          ))}
          <TextInput
            keyboardType="number-pad"
            maxLength={3}
            onChangeText={(value) => update({ markupPercent: toNumber(value) })}
            placeholder="свой %"
            style={[styles.chip, styles.chipInput]}
            value={markupPresets.includes(settings.markupPercent) ? '' : String(settings.markupPercent)}
          />
        </View>

        <Text style={styles.section}>Оборудование ({estimate.equipment.length})</Text>
        {estimate.equipment.length ? estimate.equipment.map((line) => (
          <View key={line.name} style={styles.line}>
            <Text style={styles.lineName}>{line.name}</Text>
            <Text style={styles.lineMeta}>{line.qty} × {formatPrice(line.unitPrice)}</Text>
            <Text style={styles.lineTotal}>{formatPrice(line.total)}</Text>
          </View>
        )) : <Text style={styles.muted}>Корзина пуста — добавьте оборудование в каталоге.</Text>}

        <Text style={styles.section}>Работы</Text>
        {settings.works.map((work) => (
          <View key={work.id} style={[styles.work, work.qty > 0 && styles.workOn]}>
            <TextInput multiline onChangeText={(name) => updateWork(work.id, { name })} style={styles.workName} value={work.name} />
            <View style={styles.workRow}>
              <TextInput
                keyboardType="number-pad"
                onChangeText={(value) => updateWork(work.id, { price: toNumber(value) })}
                style={styles.workPrice}
                value={String(work.price)}
              />
              <Text style={styles.muted}>₽{work.unit ? `/${work.unit}` : ''}</Text>
              <View style={styles.stepper}>
                <Pressable onPress={() => updateWork(work.id, { qty: Math.max(0, work.qty - 1) })} style={styles.stepButton}>
                  <Text style={styles.stepText}>−</Text>
                </Pressable>
                <Text style={styles.stepValue}>{work.qty}</Text>
                <Pressable onPress={() => updateWork(work.id, { qty: work.qty + 1 })} style={[styles.stepButton, styles.stepPlus]}>
                  <Text style={[styles.stepText, styles.stepPlusText]}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}
        <Pressable
          onPress={() => update({ works: [...settings.works, { id: `custom-${Date.now()}`, name: 'Своя работа', price: 0, qty: 1 }] })}
          style={styles.addWork}>
          <Text style={styles.addWorkText}>+ Добавить работу</Text>
        </Pressable>

        <Text style={styles.section}>Исполнитель (в шапке сметы)</Text>
        <TextInput onChangeText={(contractorName) => update({ contractorName })} placeholder="Ваше имя или компания" style={styles.input} value={settings.contractorName} />
        <TextInput keyboardType="phone-pad" onChangeText={(contractorPhone) => update({ contractorPhone })} placeholder="Телефон" style={styles.input} value={settings.contractorPhone} />

        <View style={styles.totals}>
          <View style={styles.totalRow}><Text style={styles.muted}>Оборудование</Text><Text style={styles.totalValue}>{formatPrice(estimate.equipmentTotal)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.muted}>Работы</Text><Text style={styles.totalValue}>{formatPrice(estimate.worksTotal)}</Text></View>
          <View style={styles.totalRow}><Text style={styles.grandLabel}>Итого клиенту</Text><Text style={styles.grandValue}>{formatPrice(estimate.total)}</Text></View>
          <Text style={styles.margin}>Ваша наценка на оборудовании: {formatPrice(estimate.margin)} (в смете не видна)</Text>
        </View>

        <Pressable disabled={!!busy || !items.length} onPress={() => void run('share')} style={[styles.primary, (!!busy || !items.length) && styles.disabled]}>
          <Text style={styles.primaryText}>{busy === 'share' ? 'Готовим PDF...' : 'Отправить смету клиенту'}</Text>
        </Pressable>
        <Pressable disabled={!!busy || !items.length} onPress={() => void run('save')} style={[styles.secondary, (!!busy || !items.length) && styles.disabled]}>
          <Text style={styles.secondaryText}>{busy === 'save' ? 'Сохраняем...' : 'Сохранить PDF в «Загрузки»'}</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: colors.background, gap: spacing.sm, padding: spacing.lg },
  hint: { color: colors.muted },
  section: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: spacing.md },
  input: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, borderWidth: 1, padding: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: 'rgba(245,158,11,0.12)', borderColor: 'rgba(245,158,11,0.4)', borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 },
  chipActive: { backgroundColor: 'rgba(245,158,11,0.95)', borderColor: 'rgba(245,158,11,1)' },
  chipText: { color: '#B45309', fontWeight: '800' },
  chipTextActive: { color: '#FFFFFF' },
  chipInput: { minWidth: 80, paddingVertical: 4, textAlign: 'center' },
  muted: { color: colors.muted },
  line: { backgroundColor: colors.card, borderRadius: 12, gap: 2, padding: spacing.md },
  lineName: { color: colors.text, fontWeight: '800' },
  lineMeta: { color: colors.muted },
  lineTotal: { color: colors.accentDark, fontWeight: '900' },
  work: { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, borderWidth: 1, gap: spacing.sm, padding: spacing.md, opacity: 0.75 },
  workOn: { borderColor: colors.accent, opacity: 1 },
  workName: { color: colors.text, fontWeight: '700', padding: 0 },
  workRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  workPrice: { backgroundColor: colors.background, borderColor: colors.border, borderRadius: 8, borderWidth: 1, minWidth: 80, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  stepper: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginLeft: 'auto' },
  stepButton: { alignItems: 'center', backgroundColor: '#E5E7EB', borderRadius: 10, height: 36, justifyContent: 'center', width: 36 },
  stepPlus: { backgroundColor: colors.accent },
  stepText: { color: colors.text, fontSize: 20, fontWeight: '900' },
  stepPlusText: { color: '#FFFFFF' },
  stepValue: { color: colors.text, fontSize: 16, fontWeight: '900', minWidth: 20, textAlign: 'center' },
  addWork: { alignItems: 'center', borderColor: colors.accent, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, padding: spacing.md },
  addWorkText: { color: colors.accentDark, fontWeight: '800' },
  totals: { backgroundColor: '#FFF7E6', borderRadius: 16, gap: spacing.sm, marginTop: spacing.md, padding: spacing.md },
  totalRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  totalValue: { color: colors.text, fontWeight: '800' },
  grandLabel: { color: colors.text, fontSize: 18, fontWeight: '900' },
  grandValue: { color: colors.accentDark, fontSize: 22, fontWeight: '900' },
  margin: { color: '#15803D', fontSize: 12, fontWeight: '700' },
  primary: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 14, marginTop: spacing.md, padding: spacing.md },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  secondary: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.accent, borderRadius: 14, borderWidth: 1, padding: spacing.md },
  secondaryText: { color: colors.accentDark, fontWeight: '800' },
  disabled: { opacity: 0.5 },
});
