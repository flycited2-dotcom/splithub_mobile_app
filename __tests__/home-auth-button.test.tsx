import { fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Modal, ScrollView, StyleSheet } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';

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

function pressableStyleForText(node: ReactTestInstance) {
  let current: ReactTestInstance | null = node;

  while (current && !current.props.onPress) {
    current = current.parent;
  }

  return StyleSheet.flatten(current?.props.style);
}

function hasAncestor(node: ReactTestInstance, ancestor: ReactTestInstance) {
  let current: ReactTestInstance | null = node.parent;

  while (current) {
    if (current === ancestor) return true;
    current = current.parent;
  }

  return false;
}

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

test('keeps the home screen inside the safe area without scroll overshoot', () => {
  mockedUseSession.mockReturnValue({
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    refreshProfile: jest.fn(),
    register: jest.fn(),
    user: null,
  });

  const { UNSAFE_getByType } = render(<HomeScreen />);
  const scrollView = UNSAFE_getByType(ScrollView);
  const rootStyle = StyleSheet.flatten(scrollView.parent?.props.style);
  const contentStyle = StyleSheet.flatten(scrollView.props.contentContainerStyle);

  expect(rootStyle.paddingTop).toBe(16);
  expect(scrollView.props.bounces).toBe(false);
  expect(scrollView.props.alwaysBounceVertical).toBe(false);
  expect(scrollView.props.overScrollMode).toBe('never');
  expect(contentStyle.paddingBottom).toBe(16);
});

test('colors the home quick filters by product group', () => {
  mockedUseSession.mockReturnValue({
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    refreshProfile: jest.fn(),
    register: jest.fn(),
    user: null,
  });

  const { getByText } = render(<HomeScreen />);

  expect(pressableStyleForText(getByText('Медная труба'))).toMatchObject({
    backgroundColor: 'rgba(184, 115, 51, 0.16)',
    borderColor: 'rgba(184, 115, 51, 0.42)',
  });
  expect(pressableStyleForText(getByText('On/Off 7–9'))).toMatchObject({
    backgroundColor: 'rgba(45, 212, 191, 0.14)',
    borderColor: 'rgba(20, 184, 166, 0.42)',
  });
  expect(pressableStyleForText(getByText('On/Off 18'))).toMatchObject({
    backgroundColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(5, 150, 105, 0.42)',
  });
  expect(pressableStyleForText(getByText('Расходники'))).toMatchObject({
    backgroundColor: 'rgba(226, 232, 240, 0.72)',
    borderColor: '#CBD5E1',
  });
});

test('keeps the closed poluprom modal outside the home scroll content', () => {
  mockedUseSession.mockReturnValue({
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    refreshProfile: jest.fn(),
    register: jest.fn(),
    user: null,
  });

  const { UNSAFE_getByType } = render(<HomeScreen />);
  const scrollView = UNSAFE_getByType(ScrollView);
  const modal = UNSAFE_getByType(Modal);

  expect(hasAncestor(modal, scrollView)).toBe(false);
});
