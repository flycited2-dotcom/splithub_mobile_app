import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Application from 'expo-application';

import { colors, spacing } from '../../lib/theme';
import { checkForUpdate, type UpdateManifest, type UpdateStatus } from './app-update';

// Re-check when the app comes back, but not more often than this.
const RECHECK_MS = 6 * 60 * 60 * 1000;

type Props = {
  // Injected in tests; the app uses the real check and the installed build number.
  check?: typeof checkForUpdate;
  currentVersionCode?: number;
};

const installedVersionCode = () => Number(Application.nativeBuildVersion) || 0;

export function UpdatePrompt({ check = checkForUpdate, currentVersionCode }: Props) {
  const [offer, setOffer] = useState<{ status: Exclude<UpdateStatus, 'none'>; manifest: UpdateManifest } | null>(null);
  const dismissed = useRef<number | null>(null);
  const lastCheck = useRef(0);
  const versionCode = currentVersionCode ?? installedVersionCode();

  const run = useCallback(async () => {
    lastCheck.current = Date.now();
    const result = await check(versionCode);
    // "Later" hides an optional update until a newer one appears.
    if (result && !(result.status === 'optional' && dismissed.current === result.manifest.versionCode)) {
      setOffer(result);
    }
  }, [check, versionCode]);

  useEffect(() => {
    if (!versionCode) return;
    void run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && Date.now() - lastCheck.current > RECHECK_MS) void run();
    });
    return () => subscription.remove();
  }, [run, versionCode]);

  if (!offer) return null;
  const required = offer.status === 'required';

  return (
    <Modal animationType="fade" transparent visible onRequestClose={() => !required && setOffer(null)}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Доступна новая версия {offer.manifest.versionName}</Text>
          {offer.manifest.notes ? <Text style={styles.notes}>{offer.manifest.notes}</Text> : null}
          {required ? <Text style={styles.required}>Это обновление обязательно для работы приложения.</Text> : null}
          <Text style={styles.hint}>Файл скачается с splithub.ru, затем Android предложит установить обновление.</Text>
          <Pressable onPress={() => void Linking.openURL(offer.manifest.url)} style={styles.primary}>
            <Text style={styles.primaryText}>Обновить</Text>
          </Pressable>
          {required ? null : (
            <Pressable
              onPress={() => {
                dismissed.current = offer.manifest.versionCode;
                setOffer(null);
              }}
              style={styles.secondary}>
              <Text style={styles.secondaryText}>Позже</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

// The APK self-update applies to the sideloaded Android build only; iOS updates come from the App Store.
export function AppUpdatePrompt() {
  return Platform.OS === 'android' ? <UpdatePrompt /> : null;
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.45)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    gap: spacing.md,
    padding: spacing.lg,
    width: '100%',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  notes: {
    color: colors.text,
  },
  required: {
    color: colors.accentDark,
    fontWeight: '700',
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
  },
  primary: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 14,
    padding: spacing.md,
  },
  primaryText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  secondary: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  secondaryText: {
    color: colors.muted,
    fontWeight: '700',
  },
});
