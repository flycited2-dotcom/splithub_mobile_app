import { render } from '@testing-library/react-native';

import CatalogScreen from '../src/app/catalog';
import { useCart } from '../src/features/cart/cart-context';
import { useCatalog } from '../src/features/catalog/catalog-context';

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  router: {
    push: jest.fn(),
  },
  useLocalSearchParams: () => ({}),
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

const mockedUseCart = jest.mocked(useCart);
const mockedUseCatalog = jest.mocked(useCatalog);

test('shows bottom navigation on the stack catalog screen', () => {
  mockedUseCart.mockReturnValue({
    addProduct: jest.fn(),
    checkout: jest.fn(),
    checkoutError: null,
    checkingOut: false,
    items: [],
    itemsCount: 0,
    quantityByProductId: {},
    replaceItems: jest.fn(),
    setQty: jest.fn(),
    total: 0,
  });
  mockedUseCatalog.mockReturnValue({
    error: null,
    loading: false,
    offline: false,
    refresh: jest.fn(),
    snapshot: { products: [], updated_at: '2026-06-03T00:00:00Z', version: 'test' },
  });

  const { queryByText } = render(<CatalogScreen />);

  expect(queryByText('Главная')).toBeTruthy();
  expect(queryByText('Корзина')).toBeTruthy();
  expect(queryByText('Заказы')).toBeTruthy();
  expect(queryByText('Профиль')).toBeTruthy();
});
