import type { Product } from './types';

const groupOrder = ['inv', 'onoff', 'pac_inv', 'pac_onoff', 'truba', 'poluprom', 'rashod', 'multi'];

const groupLabels: Record<string, string> = {
  inv: 'ИНВЕРТОРНЫЕ',
  onoff: 'ON/OFF',
  pac_inv: 'ПОЛУПРОМ ИНВЕРТОР',
  pac_onoff: 'ПОЛУПРОМ ON/OFF',
  truba: 'МЕДНАЯ ТРУБА',
  poluprom: 'ПОЛУПРОМ',
  rashod: 'РАСХОДНИКИ',
  multi: 'ЧЁРНЫЕ СПЛИТЫ',
};

export function groupProducts(products: Product[]) {
  return groupOrder.flatMap((group) => {
    const matching = products.filter((product) => product.group === group);
    if (!matching.length) return [];
    const brandNames = [...new Set(matching.map((product) => product.brand))];
    return [{
      id: group,
      label: groupLabels[group],
      brands: brandNames.map((brand) => {
        const branded = matching.filter((product) => product.brand === brand);
        const seriesNames = [...new Set(branded.map((product) => product.series || 'Другие модели'))];
        return {
          name: brand,
          factory: branded.find((product) => product.factory)?.factory,
          series: seriesNames.map((name) => ({
            name,
            description: branded.find((product) => (product.series || 'Другие модели') === name)?.cardBenef,
            products: branded.filter((product) => (product.series || 'Другие модели') === name),
          })),
        };
      }),
    }];
  });
}
