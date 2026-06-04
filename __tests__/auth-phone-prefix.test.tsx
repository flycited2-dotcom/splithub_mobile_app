import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { TextInput } from 'react-native';

import LoginScreen from '../src/app/auth/login';
import RegisterScreen from '../src/app/auth/register';
import { useSession } from '../src/features/session/session-context';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
  router: {
    replace: jest.fn(),
  },
  Stack: {
    Screen: () => null,
  },
}));

jest.mock('../src/features/session/session-context', () => ({
  useSession: jest.fn(),
}));

const mockedUseSession = jest.mocked(useSession);

beforeEach(() => {
  mockedUseSession.mockReturnValue({
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    refreshProfile: jest.fn(),
    register: jest.fn(),
    user: null,
  });
});

test('prefills the login phone with the Russian country code', () => {
  const { UNSAFE_getAllByType } = render(<LoginScreen />);

  expect(UNSAFE_getAllByType(TextInput)[0].props.value).toBe('+7');
});

test('prefills the registration phone with the Russian country code', () => {
  const { UNSAFE_getAllByType } = render(<RegisterScreen />);

  expect(UNSAFE_getAllByType(TextInput)[1].props.value).toBe('+7');
});
