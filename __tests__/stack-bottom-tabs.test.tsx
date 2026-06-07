import { render } from '@testing-library/react-native';

import { StackBottomTabs } from '../src/components/stack-bottom-tabs';
import { useCart } from '../src/features/cart/cart-context';

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock('../src/features/cart/cart-context', () => ({
  useCart: jest.fn(),
}));

const mockedUseCart = jest.mocked(useCart);

function mockCart(itemsCount: number) {
  mockedUseCart.mockReturnValue({
    addProduct: jest.fn(),
    checkout: jest.fn(),
    checkoutError: null,
    checkingOut: false,
    items: [],
    itemsCount,
    quantityByProductId: {},
    replaceItems: jest.fn(),
    setQty: jest.fn(),
    total: 0,
  });
}

test('stack bottom navigation shows all five tabs including catalog', () => {
  mockCart(0);

  const { queryByText } = render(<StackBottomTabs active="home" />);

  expect(queryByText('Каталог')).toBeTruthy();
  expect(queryByText('Главная')).toBeTruthy();
  expect(queryByText('Корзина')).toBeTruthy();
  expect(queryByText('Заказы')).toBeTruthy();
  expect(queryByText('Профиль')).toBeTruthy();
});

test('stack bottom navigation shows cart badge', () => {
  mockCart(2);

  const { queryByText } = render(<StackBottomTabs active="home" />);

  expect(queryByText('2')).toBeTruthy();
});
