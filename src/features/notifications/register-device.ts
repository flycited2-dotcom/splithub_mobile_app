import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { api } from '../../lib/api';

const DEVICE_TOKEN_KEY = 'splithub.expo-push-token';

export type NotificationPreferences = {
  order_status_enabled: boolean;
  promotions_enabled: boolean;
  manager_messages_enabled: boolean;
};

export const defaultNotificationPreferences: NotificationPreferences = {
  order_status_enabled: true,
  promotions_enabled: true,
  manager_messages_enabled: true,
};

function deviceBody(expoToken: string, preferences: NotificationPreferences) {
  return {
    expo_token: expoToken,
    platform: Platform.OS,
    ...preferences,
  };
}

function normalizePreferences(value: unknown): NotificationPreferences {
  const source = (
    value
    && typeof value === 'object'
    && 'preferences' in value
      ? (value as { preferences?: unknown }).preferences
      : value
  ) as Partial<NotificationPreferences> | null;

  return {
    order_status_enabled: source?.order_status_enabled ?? defaultNotificationPreferences.order_status_enabled,
    promotions_enabled: source?.promotions_enabled ?? defaultNotificationPreferences.promotions_enabled,
    manager_messages_enabled: source?.manager_messages_enabled ?? defaultNotificationPreferences.manager_messages_enabled,
  };
}

export async function getRegisteredDeviceToken() {
  return AsyncStorage.getItem(DEVICE_TOKEN_KEY);
}

export async function registerDevice(preferences: NotificationPreferences = defaultNotificationPreferences) {
  if (!Device.isDevice) return null;
  const permission = await Notifications.requestPermissionsAsync();
  if (permission.status !== 'granted') return null;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) throw new Error('EAS_PROJECT_ID_REQUIRED');
  const expoToken = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await api('register_device', {
    method: 'POST',
    body: JSON.stringify(deviceBody(expoToken, preferences)),
  });
  await AsyncStorage.setItem(DEVICE_TOKEN_KEY, expoToken);
  return expoToken;
}

export async function ensureDeviceRegistered(
  preferences: NotificationPreferences = defaultNotificationPreferences,
) {
  const savedToken = await getRegisteredDeviceToken();
  return savedToken ?? registerDevice(preferences);
}

export async function loadNotificationPreferences() {
  try {
    const data = await api<unknown>('notification_preferences');
    return normalizePreferences(data);
  } catch {
    return defaultNotificationPreferences;
  }
}

export async function updateNotificationPreferences(
  expoToken: string,
  preferences: NotificationPreferences,
) {
  await api('notification_preferences', {
    method: 'POST',
    body: JSON.stringify(deviceBody(expoToken, preferences)),
  });
}

export async function removeDevice(expoToken: string) {
  try {
    await api('remove_device', {
      method: 'POST',
      body: JSON.stringify({ expo_token: expoToken }),
    });
  } finally {
    await AsyncStorage.removeItem(DEVICE_TOKEN_KEY);
  }
}

export async function removeRegisteredDevice() {
  const expoToken = await getRegisteredDeviceToken();
  if (!expoToken) return;
  await removeDevice(expoToken);
}
