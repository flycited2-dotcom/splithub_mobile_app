import {
  familyFilters,
  filterByQuickFilter,
  homeQuickFilterIds,
  rashodCategory,
  visibleQuickFilters,
} from '../src/features/catalog/quick-filters';

const products = [
  { id: '1', group: 'inv', btu: '07', type: 'split', color: 'white' },
  { id: '2', group: 'inv', btu: '12', type: 'split', color: 'white' },
  { id: '3', group: 'pac_onoff', btu: '24', type: 'cassette', color: 'white' },
  { id: '4', group: 'multi', btu: '09', type: 'split', color: 'black' },
  { id: '5', group: 'onoff', btu: '28', type: 'split', color: 'white' },
  { id: '6', group: 'pac_inv', btu: '48', type: 'split', series: 'Колонные', color: 'white' },
  { id: '7', group: 'rashod', brandCode: 'kron', brand: 'Кронштейны', model: '500x600', color: 'white' },
  { id: '8', group: 'rashod', brandCode: 'new-code', brand: 'Насос дренажный', model: 'SI-10', color: 'white' },
  { id: '9', group: 'inv', btu: '13', type: 'split', color: 'white' },
] as never[];

const ids = (filterId: string) => filterByQuickFilter(products, filterId).map((product: { id: string }) => product.id);

test('filters inverter BTU by range like the website', () => {
  expect(ids('inv79')).toEqual(['1']);
  expect(ids('inv12')).toEqual(['2', '9']);
  expect(ids('inv')).toEqual(['1', '2', '9']);
});

test('on/off 24-36 catches 28 BTU', () => {
  expect(ids('on2436')).toEqual(['5']);
});

test('filters semi-industrial kinds by type or series', () => {
  expect(ids('pac_kasseta')).toEqual(['3']);
  expect(ids('pac_column')).toEqual(['6']);
  expect(ids('poluprom')).toEqual(['3', '6']);
});

test('filters black split products', () => {
  expect(ids('multi')).toEqual(['4']);
});

test('sorts consumables into the website categories by code, then by name', () => {
  expect(rashodCategory(products[6])).toBe('r_kron');
  expect(rashodCategory(products[7])).toBe('r_pump');
  expect(rashodCategory(products[0])).toBeNull();
  expect(ids('r_kron')).toEqual(['7']);
  expect(ids('rashod')).toEqual(['7', '8']);
});

test('home buttons match the website', () => {
  expect(homeQuickFilterIds).toEqual([
    'inv79', 'inv12', 'inv18', 'inv2436', 'on79', 'on12', 'on18', 'on2436',
    'truba', 'rashod', 'r_drain', 'r_kron', 'poluprom', 'multi',
  ]);
});

test('family chips list only sub-filters that have products, with counts', () => {
  expect(familyFilters(products, 'inv12').map((chip) => [chip.id, chip.chip, chip.count])).toEqual([
    ['inv', 'Все инверторные', 3],
    ['inv79', '7–9', 1],
    ['inv12', '12', 2],
  ]);
  expect(familyFilters(products, 'truba')).toEqual([]);
});

test('keeps only quick filters that have matching products', () => {
  const visibleIds = visibleQuickFilters(products, homeQuickFilterIds).map((filter) => filter.id);

  expect(visibleIds).toContain('inv79');
  expect(visibleIds).toContain('poluprom');
  expect(visibleIds).toContain('r_kron');
  expect(visibleIds).not.toContain('r_drain');
  expect(visibleIds).not.toContain('truba');
});

test('keeps configured quick filters while catalog is still loading', () => {
  expect(visibleQuickFilters(null, ['rashod']).map((filter) => filter.id)).toEqual(['rashod']);
});
