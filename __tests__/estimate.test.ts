import { clientUnitPrice, computeEstimate, defaultWorks } from '../src/features/estimate/estimate';

test('client price = wholesale + markup, rounded up to 10 ₽', () => {
  expect(clientUnitPrice(22990, 25)).toBe(28740); // 28737.5 -> 28740
  expect(clientUnitPrice(990, 0)).toBe(990);
  expect(clientUnitPrice(995, 0)).toBe(1000);
  expect(clientUnitPrice(1000, 20, 100)).toBe(1200);
  expect(clientUnitPrice(1000, -10)).toBe(1000); // negative markup is ignored
});

test('estimate totals: equipment at client prices + selected works only', () => {
  const estimate = computeEstimate({
    items: [
      { name: 'MDV MDSAG-09', price: 24690, qty: 1 },
      { name: 'Кронштейн', price: 990, qty: 2 },
    ],
    markupPercent: 25,
    works: [
      { id: 'install', name: 'Монтаж', price: 8000, qty: 1 },
      { id: 'meter', name: 'Доп. метр трассы', price: 1200, qty: 3, unit: 'м' },
      { id: 'dismantle', name: 'Демонтаж', price: 2500, qty: 0 },
    ],
  });

  expect(estimate.equipment).toEqual([
    { name: 'MDV MDSAG-09', qty: 1, unitPrice: 30870, total: 30870 },
    { name: 'Кронштейн', qty: 2, unitPrice: 1240, total: 2480 },
  ]);
  expect(estimate.works.map((w) => [w.name, w.total])).toEqual([['Монтаж', 8000], ['Доп. метр трассы', 3600]]);
  expect(estimate.equipmentTotal).toBe(33350);
  expect(estimate.worksTotal).toBe(11600);
  expect(estimate.total).toBe(44950);
  // The installer's own margin on equipment, never printed for the client.
  expect(estimate.margin).toBe(33350 - (24690 + 990 * 2));
});

test('default works are editable templates with nothing selected but the installation', () => {
  const works = defaultWorks();
  expect(works[0]).toMatchObject({ name: expect.stringMatching(/Монтаж/), qty: 1 });
  expect(works.slice(1).every((work) => work.qty === 0)).toBe(true);
  expect(new Set(works.map((work) => work.id)).size).toBe(works.length);
});
