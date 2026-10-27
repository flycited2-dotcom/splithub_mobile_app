import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../../lib/theme';
import type { PriceListFormat } from './price-list-download';

type Props = {
  visible: boolean;
  onPick: (format: PriceListFormat) => void;
  onClose: () => void;
};

// Format brand colours: PDF red, Excel green.
const formats: { format: PriceListFormat; label: string; ext: string; hint: string; color: string; dark: string }[] = [
  { format: 'pdf', label: 'PDF', ext: 'PDF', hint: 'Для просмотра и печати', color: '#E5252A', dark: '#B91C1C' },
  { format: 'excel', label: 'Excel', ext: 'XLS', hint: 'Таблица для расчётов и фильтров', color: '#1D9A55', dark: '#107C41' },
];

// File icon: a sheet with a folded corner and the format label.
function FileGlyph({ ext, color }: { ext: string; color: string }) {
  return (
    <View style={styles.glyph}>
      <View style={[styles.glyphFold, { borderBottomColor: color }]} />
      <View style={[styles.glyphTag, { backgroundColor: color }]}>
        <Text style={styles.glyphTagText}>{ext}</Text>
      </View>
      <View style={[styles.glyphLine, { backgroundColor: color, opacity: 0.35 }]} />
      <View style={[styles.glyphLine, styles.glyphLineShort, { backgroundColor: color, opacity: 0.35 }]} />
    </View>
  );
}

export function PriceFormatSheet({ visible, onPick, onClose }: Props) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.backdrop}>
        <Pressable style={styles.sheet}>
          <Text style={styles.title}>Скачать прайс</Text>
          <Text style={styles.subtitle}>Выберите формат — файл сохранится в «Загрузки» на телефоне.</Text>
          {formats.map((item) => (
            <Pressable
              accessibilityLabel={`Скачать прайс в ${item.label}`}
              key={item.format}
              onPress={() => {
                onClose();
                onPick(item.format);
              }}
              style={({ pressed }) => [styles.formatButton, { backgroundColor: item.color, shadowColor: item.dark }, pressed && styles.pressed]}>
              <FileGlyph color={item.dark} ext={item.ext} />
              <View style={styles.formatText}>
                <Text style={styles.formatLabel}>{item.label}</Text>
                <Text style={styles.formatHint}>{item.hint}</Text>
              </View>
              <Text style={styles.download}>⇩</Text>
            </Pressable>
          ))}
          <Pressable onPress={onClose} style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
            <Text style={styles.cancelText}>Отмена</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(15,23,42,0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: 24,
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    marginBottom: spacing.xs,
  },
  formatButton: {
    alignItems: 'center',
    borderRadius: 18,
    elevation: 4,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  formatText: {
    flex: 1,
  },
  formatLabel: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
  },
  formatHint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
  },
  download: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  glyph: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderTopRightRadius: 0,
    gap: 4,
    height: 56,
    justifyContent: 'flex-end',
    paddingBottom: 8,
    paddingHorizontal: 6,
    width: 46,
  },
  glyphFold: {
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderLeftWidth: 12,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  glyphTag: {
    alignItems: 'center',
    borderRadius: 4,
    left: -6,
    paddingVertical: 2,
    position: 'absolute',
    right: 6,
    top: 16,
  },
  glyphTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  glyphLine: {
    borderRadius: 2,
    height: 3,
  },
  glyphLineShort: {
    width: '60%',
  },
  cancel: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
  },
  cancelText: {
    color: '#B91C1C',
    fontSize: 16,
    fontWeight: '800',
  },
});
