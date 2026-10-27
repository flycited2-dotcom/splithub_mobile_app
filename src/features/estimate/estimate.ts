// Client estimate ("смета") built from the cart: the installer's resale price
// (wholesale + markup) for equipment plus installation works.

export type EstimateWork = { id: string; name: string; price: number; qty: number; unit?: string };
export type EstimateItem = { name: string; price: number; qty: number };
export type EstimateLine = { name: string; qty: number; unitPrice: number; total: number; unit?: string };

export type Estimate = {
  equipment: EstimateLine[];
  works: EstimateLine[];
  equipmentTotal: number;
  worksTotal: number;
  total: number;
  // Installer's margin on equipment; shown only to the installer, never in the PDF.
  margin: number;
};

// Wholesale + markup, rounded up so the client sees tidy prices.
export function clientUnitPrice(wholesale: number, markupPercent: number, roundTo = 10) {
  const markup = Math.max(0, markupPercent);
  return Math.ceil((wholesale * (100 + markup)) / 100 / roundTo) * roundTo;
}

export function computeEstimate(input: { items: EstimateItem[]; works: EstimateWork[]; markupPercent: number }): Estimate {
  const equipment = input.items.map((item) => {
    const unitPrice = clientUnitPrice(item.price, input.markupPercent);
    return { name: item.name, qty: item.qty, unitPrice, total: unitPrice * item.qty };
  });
  const works = input.works
    .filter((work) => work.qty > 0 && work.price > 0)
    .map((work) => ({ name: work.name, qty: work.qty, unit: work.unit, unitPrice: work.price, total: work.price * work.qty }));
  const equipmentTotal = equipment.reduce((sum, line) => sum + line.total, 0);
  const worksTotal = works.reduce((sum, line) => sum + line.total, 0);
  const wholesale = input.items.reduce((sum, item) => sum + item.price * item.qty, 0);
  return { equipment, works, equipmentTotal, worksTotal, total: equipmentTotal + worksTotal, margin: equipmentTotal - wholesale };
}

// Typical installer services; prices are a starting point, every line is editable.
export function defaultWorks(): EstimateWork[] {
  return [
    { id: 'install', name: 'Монтаж сплит-системы (стандартный, до 3 м трассы)', price: 8000, qty: 1 },
    { id: 'meter', name: 'Дополнительный метр трассы', price: 1200, qty: 0, unit: 'м' },
    { id: 'dismantle', name: 'Демонтаж старого кондиционера', price: 2500, qty: 0 },
    { id: 'chase', name: 'Штробление стены', price: 1000, qty: 0, unit: 'м' },
    { id: 'drain', name: 'Дренажная помпа (установка)', price: 1500, qty: 0 },
  ];
}
