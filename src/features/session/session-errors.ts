export function apiErrorCode(error: unknown) {
  return String((error as { data?: { code?: string } }).data?.code ?? 'REQUEST_FAILED');
}

export function sessionErrorMessage(code: string) {
  if (code === 'INVALID_CREDENTIALS') return 'Неверный телефон или пароль';
  if (code === 'PHONE_ALREADY_REGISTERED') return 'Этот телефон уже зарегистрирован';
  if (code === 'INVALID_REGISTRATION') return 'Проверьте заполнение обязательных полей';
  if (code === 'CODE_EXPIRED') return 'Код истёк или неверный. Запросите новый.';
  if (code === 'INVALID_CODE') return 'Неверный код. Проверьте и попробуйте снова.';
  if (code === 'TOO_MANY_ATTEMPTS') return 'Слишком много попыток. Запросите новый код.';
  if (code === 'INVALID_EMAIL') return 'Укажите корректный email.';
  if (code === 'SESSION_EXPIRED') return 'Сессия истекла. Войдите заново.';
  return 'Не удалось выполнить запрос. Проверьте подключение к интернету.';
}
