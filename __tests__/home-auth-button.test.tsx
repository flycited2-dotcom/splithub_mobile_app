import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import HomeScreen from '../src/app/(tabs)/index';
import { useCatalog } from '../src/features/catalog/catalog-context';
import { useSession } from '../src/features/session/session-context';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock('../src/features/session/session-context', () => ({
  useSession: jest.fn(),
}));

jest.mock('../src/features/catalog/catalog-context', () => ({
  useCatalog: jest.fn(),
}));

const mockedUseSession = jest.mocked(useSession);
const mockedUseCatalog = jest.mocked(useCatalog);
const mockedRouterPush = jest.mocked(router.push);

beforeEach(() => {
  mockedRouterPush.mockClear();
  mockedUseCatalog.mockReturnValue({
    error: null,
    loading: true,
    offline: false,
    refresh: jest.fn(),
    snapshot: null,
  });
});

test('shows profile entry on home when the user is signed in', () => {
  mockedUseSession.mockReturnValue({
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    refreshProfile: jest.fn(),
    register: jest.fn(),
    user: {
      id: 1,
      name: 'Test_mob',
      phone: '79781234567',
    },
  });

  const { queryByText } = render(<HomeScreen />);

  expect(queryByText('Профиль')).toBeTruthy();
  expect(queryByText('Войти')).toBeNull();
});

test('shows login entry on home when the user is signed out', () => {
  mockedUseSession.mockReturnValue({
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    refreshProfile: jest.fn(),
    register: jest.fn(),
    user: null,
  });

  const { queryByText } = render(<HomeScreen />);

  expect(queryByText('Войти')).toBeTruthy();
  expect(queryByText('Профиль')).toBeNull();
});

test('opens the full catalog in flat mode from the home screen', () => {
  mockedUseSession.mockReturnValue({
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    refreshProfile: jest.fn(),
    register: jest.fn(),
    user: null,
  });

  const { getByText } = render(<HomeScreen />);

  fireEvent.press(getByText(/Весь каталог/));

  expect(mockedRouterPush).toHaveBeenCalledWith({
    pathname: '/catalog',
    params: { mode: 'flat' },
  });
});
