import { isOrderable, promoBadge } from '../src/features/catalog/promo-badge';

describe('promoBadge', () => {
  it('maps the admin badge codes to the website labels and colors', () => {
    expect(promoBadge({ badge: 'sale' })).toEqual({ label: 'Акция', backgroundColor: 'rgba(245,158,11,0.95)' });
    expect(promoBadge({ badge: 'new' })?.label).toBe('Новинка');
    expect(promoBadge({ badge: 'clearance' })?.label).toBe('Распродажа');
  });

  it('prefers the custom admin label', () => {
    expect(promoBadge({ badge: 'clearance', badge_label: 'Последние' })?.label).toBe('Последние');
    expect(promoBadge({ badge: 'sale', badge_label: '' })?.label).toBe('Акция');
  });

  it('shows nothing without a badge or for an unknown code without a label', () => {
    expect(promoBadge({})).toBeNull();
    expect(promoBadge({ badge: '' })).toBeNull();
    expect(promoBadge({ badge: 'weird' })).toBeNull();
    expect(promoBadge({ badge: 'weird', badge_label: 'Хит' })?.label).toBe('Хит');
  });
});

describe('isOrderable', () => {
  it('blocks only out-of-stock products, like the website', () => {
    expect(isOrderable({ stock: 'out' })).toBe(false);
    expect(isOrderable({ stock: 'in_stock' })).toBe(true);
    expect(isOrderable({ stock: 'order_7' })).toBe(true);
  });
});
