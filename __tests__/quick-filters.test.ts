import {
  filterByQuickFilter,
  homeQuickFilterIds,
  visibleQuickFilters,
} from '../src/features/catalog/quick-filters';

const products = [
  { id: '1', group: 'inv', btu: '07', type: 'split', color: 'white' },
  { id: '2', group: 'inv', btu: '12', type: 'split', color: 'white' },
  { id: '3', group: 'pac_onoff', btu: '24', type: 'cassette', color: 'white' },
  { id: '4', group: 'multi', btu: '09', type: 'split', color: 'black' },
] as never[];

test('filters inverter 7-9 BTU products', () => {
  expect(filterByQuickFilter(products, 'inv79').map((product) => product.id)).toEqual(['1']);
});

test('filters cassette semi-industrial products', () => {
  expect(filterByQuickFilter(products, 'pac_kasseta').map((product) => product.id)).toEqual(['3']);
});

test('filters black split products', () => {
  expect(filterByQuickFilter(products, 'multi').map((product) => product.id)).toEqual(['4']);
});

test('keeps only quick filters that have matching products', () => {
  const visibleIds = visibleQuickFilters(products, homeQuickFilterIds).map((filter) => filter.id);

  expect(visibleIds).toContain('inv79');
  expect(visibleIds).toContain('inv12');
  expect(visibleIds).toContain('poluprom');
  expect(visibleIds).toContain('multi');
  expect(visibleIds).not.toContain('rashod');
});

test('keeps configured quick filters while catalog is still loading', () => {
  expect(visibleQuickFilters(null, ['rashod']).map((filter) => filter.id)).toEqual(['rashod']);
});
