import { Alert, Platform, ToastAndroid } from 'react-native';

export function addedToCartMessage(model: string, qty = 1) {
  return qty > 1 ? `${model} · ${qty} шт.` : model;
}

export function showAddedToCartFeedback(model: string, qty = 1) {
  const message = addedToCartMessage(model, qty);
  if (Platform.OS === 'android') {
    ToastAndroid.show(`Добавлено в заявку: ${message}`, ToastAndroid.SHORT);
    return;
  }
  Alert.alert('Добавлено в заявку', message);
}
