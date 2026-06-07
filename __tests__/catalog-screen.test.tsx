import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import CatalogScreen from '../src/app/(tabs)/catalog';
import { useCart } from '../src/features/cart/cart-context';
import { useCatalog } from '../src/features/catalog/catalog-context';

let mockParams: Record<string, string> = {};

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  Link: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  return { Image };
});

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

jest.mock('../src/features/cart/cart-feedback', () => ({
  showAddedToCartFeedback: jest.fn(),
}));

jest.mock('../src/features/favorites/favorites-context', () => ({
  useFavorites: () => ({ favoriteIds: [], isFavorite: () => false, toggleFavorite: jest.fn() }),
}));

jest.mock('../src/features/cart/cart-context', () => ({ useCart: jest.fn() }));
jest.mock('../src/features/catalog/catalog-context', () => ({ useCatalog: jest.fn() }));

const mockedUseCart = jest.mocked(useCart);
const mockedUseCatalog = jest.mocked(useCatalog);

beforeEach(() => {
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
});

test('switching between grouped and flat does not crash on numColumns change', () => {
  mockParams = {}; // grouped list (single column)
  const { rerender } = render(<CatalogScreen />);

  mockParams = { mode: 'flat' }; // flat grid (two columns)
  expect(() => rerender(<CatalogScreen />)).not.toThrow();

  mockParams = {}; // back to grouped
  expect(() => rerender(<CatalogScreen />)).not.toThrow();
});
