import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, Stack } from 'expo-router';

import { apiErrorCode, sessionErrorMessage } from '../../features/session/session-errors';
import { useSession } from '../../features/session/session-context';
import { colors, spacing } from '../../lib/theme';

const MANAGER_PHONE = '+7 978 599-13-69';

export default function ResetScreen() {
  const { requestPasswordReset, resetPassword } = useSession();
  const [step, setStep] = useState<'request' | 'confirm'>('request');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function sendRequest() {
    if (!identifier.includes('@')) {
      setError('Введите ваш email');
      return;
    }
    setSubmitting(true);
    setError('');
    setInfo('');
    try {
      const result = await requestPasswordReset(identifier);
      if (result.state === 'sent') {
        setInfo(`Код отправлен на ${result.email_masked ?? 'email'}`);
        setStep('confirm');
      } else if (result.state === 'no_email') {
        setError(`К аккаунту не привязан email. Обратитесь к менеджеру: ${MANAGER_PHONE}`);
      } else if (result.state === 'rate_limited') {
        setError('Слишком много запросов. Попробуйте позже.');
      } else {
        setError('Email не найден. Если регистрировались раньше без email — обратитесь к менеджеру: +7 978 599-13-69.');
      }
    } catch (failure) {
      setError(sessionErrorMessage(apiErrorCode(failure)));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmReset() {
    setSubmitting(true);
    setError('');
    try {
      await resetPassword(identifier, code, password);
      router.replace('/profile');
    } catch (failure) {
      setError(sessionErrorMessage(apiErrorCode(failure)));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Восстановление доступа' }} />
      <View style={styles.screen}>
        {step === 'request' ? (
          <>
            <Text style={styles.title}>Забыли пароль?</Text>
            <Text style={styles.hint}>Введите email, привязанный к аккаунту — пришлём на него код.</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setIdentifier}
              placeholder="Ваш email"
              style={styles.input}
              value={identifier}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable disabled={submitting} onPress={() => void sendRequest()} style={styles.button}>
              <Text style={styles.buttonText}>{submitting ? 'Отправка...' : 'Получить код'}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>Введите код</Text>
            {info ? <Text style={styles.info}>{info}</Text> : null}
            <TextInput
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={setCode}
              placeholder="Код из письма"
              style={styles.input}
              value={code}
            />
            <TextInput
              onChangeText={setPassword}
              placeholder="Новый пароль от 4 символов"
              secureTextEntry
              style={styles.input}
              value={password}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable disabled={submitting} onPress={() => void confirmReset()} style={styles.button}>
              <Text style={styles.buttonText}>{submitting ? 'Сохранение...' : 'Сохранить и войти'}</Text>
            </Pressable>
            <Pressable onPress={() => { setStep('request'); setError(''); }}>
              <Text style={styles.link}>← Запросить код заново</Text>
            </Pressable>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    marginBottom: spacing.sm,
  },
  hint: {
    color: colors.muted,
    fontSize: 14,
  },
  info: {
    color: colors.accentDark,
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
  },
  error: {
    color: '#B91C1C',
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: spacing.md,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  link: {
    color: colors.accentDark,
    fontWeight: '700',
  },
});
