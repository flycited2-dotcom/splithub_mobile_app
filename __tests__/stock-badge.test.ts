import { stockBadge } from '../src/features/catalog/stock-badge';

describe('stockBadge', () => {
  it('uses a green in-stock chip with a check mark', () => {
    const badge = stockBadge({ stock: 'in_stock', stockLabel: 'В наличии' });
    expect(badge.label).toBe('✓ В наличии');
    expect(badge.color).toBe('#047857');
  });

  it('maps each order code to its own label and color', () => {
    expect(stockBadge({ stock: 'days_1_2', stockLabel: '' }).label).toBe('Под заказ · 1–2 дня');
    expect(stockBadge({ stock: 'days_3_5', stockLabel: '' }).label).toBe('Под заказ · 3–5 дней');
    expect(stockBadge({ stock: 'order_7', stockLabel: '' }).label).toBe('Под заказ · 7 дней');
    expect(stockBadge({ stock: 'out', stockLabel: '' }).label).toBe('Нет в наличии');
    // distinct colors so the statuses never look the same
    const colors = ['days_1_2', 'days_3_5', 'order_7', 'out', 'in_stock'].map(
      (stock) => stockBadge({ stock, stockLabel: '' }).color,
    );
    expect(new Set(colors).size).toBe(colors.length);
  });

  it('falls back to the server label for an unknown code', () => {
    expect(stockBadge({ stock: 'weird', stockLabel: 'Скоро' }).label).toBe('Скоро');
    expect(stockBadge({ stock: 'weird', stockLabel: '' }).label).toBe('✓ В наличии');
  });
});
