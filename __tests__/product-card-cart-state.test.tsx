import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Image } from 'react-native';

import { ProductCard } from '../src/features/catalog/ProductCard';
import type { Product } from '../src/features/catalog/types';

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: ReactNode }) => children,
}));

jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  return { Image };
});

jest.mock('@expo/vector-icons/MaterialIcons', () => {
  const { Text } = require('react-native');
  return ({ name }: { name: string }) => <Text>{name}</Text>;
});

jest.mock('../src/features/favorites/favorites-context', () => ({
  useFavorites: () => ({
    favoriteIds: [],
    isFavorite: () => false,
    toggleFavorite: jest.fn(),
  }),
}));

const product: Product = {
  benefits: [],
  brand: 'MDV',
  descShort: '',
  group: 'inv',
  id: '1001',
  model: 'MDSAG-09HRDN8',
  photo: 'mdv.jpg',
  price: 23490,
  sku: 'MDSAG-09HRDN8',
  stock: 'in_stock',
  stockLabel: 'В наличии',
};

test('shows order button when product is not in cart', () => {
  const { queryByText } = render(<ProductCard onAdd={jest.fn()} product={product} />);

  expect(queryByText('Заказать')).toBeTruthy();
});

test('shows cart quantity when product is already in cart', () => {
  const { queryByText } = render(<ProductCard cartQty={3} onAdd={jest.fn()} product={product} />);

  expect(queryByText('В заявке · 3')).toBeTruthy();
  expect(queryByText('Заказать')).toBeNull();
});

test('uses cached image props for smoother catalog scrolling', () => {
  const { UNSAFE_getByType } = render(<ProductCard onAdd={jest.fn()} product={product} />);

  const image = UNSAFE_getByType(Image);

  expect(image.props.cachePolicy).toBe('memory-disk');
  expect(image.props.recyclingKey).toBe(product.photo);
});
