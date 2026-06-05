import { sessionErrorMessage } from '../src/features/session/session-errors';

test('maps invalid credentials to a Russian message', () => {
  expect(sessionErrorMessage('INVALID_CREDENTIALS')).toBe('Неверный телефон или пароль');
});

test('maps expired session to a re-login message', () => {
  expect(sessionErrorMessage('SESSION_EXPIRED')).toBe('Сессия истекла. Войдите заново.');
});
