import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';

import CartScreen from '../src/app/(tabs)/cart';
import OrdersScreen from '../src/app/(tabs)/orders';
import { useCart } from '../src/features/cart/cart-context';
import { useCatalog } from '../src/features/catalog/catalog-context';
import { listOrders } from '../src/features/orders/orders-repository';
import { useSession } from '../src/features/session/session-context';

const mockCheckout = jest.fn();

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
  router: {
    push: jest.fn(),
  },
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = require('react');
    useEffect(callback, [callback]);
  },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock('../src/features/cart/cart-context', () => ({
  useCart: jest.fn(),
}));

jest.mock('../src/features/catalog/catalog-context', () => ({
  useCatalog: jest.fn(),
}));

jest.mock('../src/features/orders/orders-repository', () => ({
  listOrders: jest.fn(),
}));

jest.mock('../src/features/session/session-context', () => ({
  useSession: jest.fn(),
}));

const mockedUseCart = jest.mocked(useCart);
const mockedUseCatalog = jest.mocked(useCatalog);
const mockedListOrders = jest.mocked(listOrders);
const mockedUseSession = jest.mocked(useSession);
const mockedRouterPush = jest.mocked(router.push);
const mockedUseLocalSearchParams = jest.mocked(useLocalSearchParams);

beforeEach(() => {
  mockedRouterPush.mockReset();
  mockedUseLocalSearchParams.mockReset();
  mockedListOrders.mockReset();
  mockCheckout.mockReset();

  mockedUseCatalog.mockReturnValue({
    error: null,
    loading: false,
    offline: false,
    refresh: jest.fn(),
    snapshot: { products: [], updated_at: '2026-06-03T00:00:00Z', version: 'test' },
  });

  mockedUseSession.mockReturnValue({
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    refreshProfile: jest.fn(),
    register: jest.fn(),
    requestPasswordReset: jest.fn(),
    resetPassword: jest.fn(),
    updateEmail: jest.fn(),
    user: { id: 1, name: 'Test_mob', phone: '79781234567' },
  });
});

test('routes to orders with the created order id and total after checkout', async () => {
  mockCheckout.mockResolvedValue({ order_id: 47, total: 37540 });
  mockedUseCart.mockReturnValue({
    addProduct: jest.fn(),
    checkout: mockCheckout,
    checkoutError: null,
    checkingOut: false,
    items: [{ id: 'pipe-38', name: 'РњРµРґРЅР°СЏ С‚СЂСѓР±Р° 3/8 В· Р±СѓС…С‚Р° 50 Рј', price: 14550, qty: 1 }],
    itemsCount: 1,
    quantityByProductId: {},
    replaceItems: jest.fn(),
    setQty: jest.fn(),
    total: 14550,
  });

  const { getByText } = render(<CartScreen />);

  fireEvent.press(getByText('Отправить заявку'));

  await waitFor(() => {
    expect(mockedRouterPush).toHaveBeenCalledWith({
      params: { created: '47', createdTotal: '37540' },
      pathname: '/orders',
    });
  });
});

test('continues shopping in flat catalog mode', () => {
  mockedUseCart.mockReturnValue({
    addProduct: jest.fn(),
    checkout: mockCheckout,
    checkoutError: null,
    checkingOut: false,
    items: [{ id: 'pipe-38', name: 'Медная труба 3/8 · бухта 50 м', price: 14550, qty: 1 }],
    itemsCount: 1,
    quantityByProductId: {},
    replaceItems: jest.fn(),
    setQty: jest.fn(),
    total: 14550,
  });

  const { getByText } = render(<CartScreen />);

  fireEvent.press(getByText('Продолжить покупки'));

  expect(mockedRouterPush).toHaveBeenCalledWith({
    pathname: '/catalog',
    params: { mode: 'flat' },
  });
});

test('shows a sent-order banner on the orders screen', async () => {
  mockedUseLocalSearchParams.mockReturnValue({ created: '47' });
  mockedListOrders.mockResolvedValue({
    orders: [
      {
        comment: '',
        created_at: '2026-06-02T20:10:00Z',
        id: 47,
        status: 'new',
        total: 37540,
      },
    ],
  });

  const { queryByText } = render(<OrdersScreen />);

  await waitFor(() => {
    expect(queryByText('Заявка SH-00047 отправлена')).toBeTruthy();
  });
});

test('shows the created order immediately when the first orders refresh is stale', async () => {
  mockedUseLocalSearchParams.mockReturnValue({ created: '51', createdTotal: '81870' });
  mockedListOrders.mockResolvedValue({
    orders: [
      {
        comment: '',
        created_at: '2026-06-03T09:34:00Z',
        id: 50,
        status: 'new',
        total: 109680,
      },
    ],
  });

  const { queryByText } = render(<OrdersScreen />);

  await waitFor(() => {
    expect(queryByText('SH-00051')).toBeTruthy();
    expect(queryByText('81 870 ₽')).toBeTruthy();
  });
});

test('shows order statuses as distinct colored badges', async () => {
  mockedUseLocalSearchParams.mockReturnValue({});
  mockedListOrders.mockResolvedValue({
    orders: [
      { comment: '', created_at: '2026-06-03T09:34:00Z', id: 1, status: 'new', total: 1000 },
      { comment: '', created_at: '2026-06-03T09:35:00Z', id: 2, status: 'confirmed', total: 2000 },
      { comment: '', created_at: '2026-06-03T09:36:00Z', id: 3, status: 'completed', total: 3000 },
      { comment: '', created_at: '2026-06-03T09:37:00Z', id: 4, status: 'cancelled', total: 4000 },
    ],
  });

  const { getByText } = render(<OrdersScreen />);

  await waitFor(() => {
    expect(StyleSheet.flatten(getByText('Новый').props.style)).toMatchObject({
      backgroundColor: '#DBEAFE',
      color: '#1D4ED8',
    });
    expect(StyleSheet.flatten(getByText('Подтверждён').props.style)).toMatchObject({
      backgroundColor: '#FFEDD5',
      color: '#C2410C',
    });
    expect(StyleSheet.flatten(getByText('Выполнен').props.style)).toMatchObject({
      backgroundColor: '#DCFCE7',
      color: '#15803D',
      fontWeight: '900',
    });
    expect(StyleSheet.flatten(getByText('Отменён').props.style)).toMatchObject({
      backgroundColor: '#FEE2E2',
      color: '#B91C1C',
    });
  });
});

test('pulls down to refresh order statuses', async () => {
  mockedUseLocalSearchParams.mockReturnValue({});
  mockedListOrders
    .mockResolvedValueOnce({
      orders: [
        { comment: '', created_at: '2026-06-03T09:34:00Z', id: 47, status: 'new', total: 37540 },
      ],
    })
    .mockResolvedValueOnce({
      orders: [
        { comment: '', created_at: '2026-06-03T09:34:00Z', id: 47, status: 'completed', total: 37540 },
      ],
    });

  const { UNSAFE_getByType, getByText } = render(<OrdersScreen />);

  await waitFor(() => {
    expect(getByText('Новый')).toBeTruthy();
  });

  const scrollView = UNSAFE_getByType(ScrollView);
  expect(scrollView.props.refreshControl.type).toBe(RefreshControl);

  await act(async () => {
    await scrollView.props.refreshControl.props.onRefresh();
  });

  await waitFor(() => {
    expect(getByText('Выполнен')).toBeTruthy();
  });
  expect(mockedListOrders).toHaveBeenCalledTimes(2);
});

test('shows a clear loading state when the orders refresh button is pressed', async () => {
  let resolveRefresh: ((value: { orders: [] }) => void) | undefined;
  mockedUseLocalSearchParams.mockReturnValue({});
  mockedListOrders
    .mockResolvedValueOnce({ orders: [] })
    .mockImplementationOnce(() => new Promise((resolve) => {
      resolveRefresh = resolve;
    }));

  const { getByText, queryByText } = render(<OrdersScreen />);

  await waitFor(() => {
    expect(getByText('Обновить статусы')).toBeTruthy();
  });

  fireEvent.press(getByText('Обновить статусы'));

  expect(getByText('Обновляем...')).toBeTruthy();

  await act(async () => {
    resolveRefresh?.({ orders: [] });
  });

  await waitFor(() => {
    expect(queryByText('Обновляем...')).toBeNull();
    expect(getByText('Обновить статусы')).toBeTruthy();
  });
  expect(mockedListOrders).toHaveBeenCalledTimes(2);
});

test('pulls down in the cart to refresh the catalog used by prices and upsells', async () => {
  const refreshCatalog = jest.fn().mockResolvedValue(undefined);
  mockedUseCatalog.mockReturnValue({
    error: null,
    loading: false,
    offline: false,
    refresh: refreshCatalog,
    snapshot: { products: [], updated_at: '2026-06-03T00:00:00Z', version: 'test' },
  });
  mockedUseCart.mockReturnValue({
    addProduct: jest.fn(),
    checkout: mockCheckout,
    checkoutError: null,
    checkingOut: false,
    items: [],
    itemsCount: 0,
    quantityByProductId: {},
    replaceItems: jest.fn(),
    setQty: jest.fn(),
    total: 0,
  });

  const { UNSAFE_getByType } = render(<CartScreen />);
  const scrollView = UNSAFE_getByType(ScrollView);

  expect(scrollView.props.refreshControl.type).toBe(RefreshControl);

  await act(async () => {
    await scrollView.props.refreshControl.props.onRefresh();
  });

  expect(refreshCatalog).toHaveBeenCalledTimes(1);
});
