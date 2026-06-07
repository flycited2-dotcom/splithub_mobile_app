import { productTitle } from '../src/features/catalog/product-title';
import type { Product } from '../src/features/catalog/types';

function make(overrides: Partial<Product>): Product {
  return {
    benefits: [],
    brand: '',
    descShort: '',
    group: 'inv',
    id: '1',
    model: '',
    photo: '',
    price: 0,
    sku: '',
    stock: 'in_stock',
    stockLabel: 'В наличии',
    ...overrides,
  };
}

describe('productTitle', () => {
  it('prefixes the brand for splits', () => {
    expect(productTitle(make({ group: 'inv', brand: 'Midea', model: 'MDSAG-09HRDN8' })))
      .toBe('Midea MDSAG-09HRDN8');
  });

  it('does not duplicate the brand when the model already contains it', () => {
    expect(productTitle(make({ group: 'inv', brand: 'ELYSIUM', model: 'ELYSIUM ELB-09PN' })))
      .toBe('ELYSIUM ELB-09PN');
    // brand in the middle of the model must not be prefixed again
    expect(productTitle(make({ group: 'rashod', brand: 'Ballu', model: '16 гибкий Ballu 30 м. бухта' })))
      .toBe('16 гибкий Ballu 30 м. бухта');
  });

  it('keeps the wall type for copper pipe so ГОСТ and среднестенная differ', () => {
    const gost = make({ group: 'truba', brand: 'Медная труба', model: 'Медная труба 1/4 · бухта 15 м', series: 'Толстая (ГОСТ) 15 м.' });
    const sredn = make({ group: 'truba', brand: 'Медная труба', model: 'Медная труба 1/4 · бухта 15 м', series: 'Средняя 15 м.' });
    expect(productTitle(gost)).toBe('Медная труба 1/4 · бухта 15 м · Толстая (ГОСТ) 15 м.');
    expect(productTitle(sredn)).toBe('Медная труба 1/4 · бухта 15 м · Средняя 15 м.');
    expect(productTitle(gost)).not.toBe(productTitle(sredn));
  });

  it('falls back to the model when the pipe has no series', () => {
    expect(productTitle(make({ group: 'truba', brand: 'Медная труба', model: 'Медная труба 1/4' })))
      .toBe('Медная труба 1/4');
  });
});
