# SplitHub Native Site Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить текущий Expo MVP в нативное Android-приложение SplitHub с главной по образцу сайта, быстрыми категориями, структурированным каталогом, подробной карточкой товара и полноценной корзиной с комплектом монтажника.

**Architecture:** Изменения выполняются только в мобильном репозитории. Каталог сайта уже доступен через изолированный `api/mobile.php?action=catalog`, поэтому серверные файлы сайта не меняются. Сложная логика фильтров, группировки, шаринга, комплекта монтажника и payload заявки оформляется небольшими pure helpers с unit-тестами; экраны используют существующие `CatalogProvider` и `CartProvider`.

**Tech Stack:** Expo SDK 56, React Native, Expo Router, TypeScript, Jest, `expo-clipboard`.

---

## Scope Guard

- Не менять репозиторий сайта `C:\Users\user\Documents\GitHub\splithub`.
- Не менять `send.php`, `index.html`, `products.js`, `products.json`, `config.php`.
- Не выполнять production-деплой.
- Выполнять работу в отдельном git worktree от мобильного коммита `61d33f3`.
- Не переносить в рабочую ветку текущую локальную правку `package.json` из основного worktree: она относится к прошлому локальному prebuild.
- Использовать `npm.cmd`, а не `npm`, потому что на компьютере запрещено выполнение `npm.ps1`.

## File Map

**Create:**

- `src/features/home/app-config.ts`: контакты, ссылки менеджера и прайса.
- `src/features/catalog/quick-filters.ts`: определения быстрых категорий сайта.
- `src/features/catalog/group-products.ts`: группировка полного каталога.
- `src/features/catalog/share-product.ts`: URL и текст для MAX, Telegram, Email и копирования.
- `src/features/cart/upsell-products.ts`: комплект монтажника.
- `src/features/cart/checkout-payload.ts`: JSON body заявки с комментарием.
- `src/app/catalog.tsx`: отдельный экран полного или отфильтрованного каталога.
- `__tests__/quick-filters.test.ts`
- `__tests__/group-products.test.ts`
- `__tests__/share-product.test.ts`
- `__tests__/upsell-products.test.ts`
- `__tests__/checkout-payload.test.ts`

**Modify:**

- `src/features/catalog/types.ts`
- `src/features/catalog/filter-products.ts`
- `src/features/catalog/ProductCard.tsx`
- `src/app/(tabs)/index.tsx`
- `src/app/(tabs)/_layout.tsx`
- `src/app/product/[id].tsx`
- `src/features/cart/cart-context.tsx`
- `src/app/(tabs)/cart.tsx`
- `src/app/(tabs)/profile.tsx`
- `src/features/notifications/notification-router.ts`
- `__tests__/filter-products.test.ts`
- `__tests__/notification-router.test.ts`
- `package.json`
- `package-lock.json`

## Task 1: Создать изолированный worktree и подтвердить базовую линию

**Files:** нет изменений.

- [ ] **Step 1: Создать ветку и worktree**

Run from `C:\Users\user\Documents\GitHub\VSCode\splithub_mobile_app\mobile`:

```powershell
git worktree add ..\mobile-native-parity -b codex/native-site-parity 61d33f3
```

Expected: создан каталог `C:\Users\user\Documents\GitHub\VSCode\splithub_mobile_app\mobile-native-parity`.

- [ ] **Step 2: Запустить базовые проверки**

Run from the new worktree:

```powershell
npm.cmd test -- --runInBand
npm.cmd run typecheck
npm.cmd run lint
```

Expected: `7` test suites и `8` tests проходят; TypeScript и lint завершаются без ошибок.

## Task 2: Расширить модель каталога и быстрые фильтры

**Files:**

- Modify: `src/features/catalog/types.ts`
- Create: `src/features/catalog/quick-filters.ts`
- Modify: `src/features/catalog/filter-products.ts`
- Create: `__tests__/quick-filters.test.ts`
- Modify: `__tests__/filter-products.test.ts`

- [ ] **Step 1: Написать падающие тесты быстрых фильтров**

Create `__tests__/quick-filters.test.ts`:

```ts
import { filterByQuickFilter } from '../src/features/catalog/quick-filters';

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
```

Extend `__tests__/filter-products.test.ts`:

```ts
const products = [
  { id: '1', brand: 'ULTIMA', model: 'ELYSIUM 09', group: 'inv', btu: '09' },
  { id: '2', brand: 'MIDEA', model: 'BREEZE 12', group: 'onoff', btu: '12' },
] as never[];

test('combines text search with a quick filter', () => {
  expect(filterProducts(products, 'ely', 'inv79').map((product) => product.id)).toEqual(['1']);
});
```

- [ ] **Step 2: Проверить, что тесты падают**

Run:

```powershell
npm.cmd test -- --runInBand __tests__/quick-filters.test.ts __tests__/filter-products.test.ts
```

Expected: FAIL, потому что `quick-filters.ts` ещё не существует и `filterProducts` не понимает `inv79`.

- [ ] **Step 3: Расширить тип товара и реализовать фильтры**

Add optional API fields to `Product` in `src/features/catalog/types.ts`:

```ts
  brandCode?: string;
  series?: string;
  factory?: string;
  color?: string;
  btu?: string;
  area?: number;
  cardBenef?: string;
  compressor?: string;
  freon?: string;
  type?: string;
```

Create `src/features/catalog/quick-filters.ts` with website-compatible predicates:

```ts
import type { Product } from './types';

export type QuickFilter = { id: string; label: string; matches: (product: Product) => boolean };

const inList = (value: string | undefined, values: string[]) => Boolean(value && values.includes(value));
const semiIndustrial = (product: Product) => product.group === 'pac_inv' || product.group === 'pac_onoff';

export const quickFilters: QuickFilter[] = [
  { id: 'inv79', label: 'Инвертор 7–9', matches: (p) => p.group === 'inv' && inList(p.btu, ['07', '09']) },
  { id: 'inv12', label: 'Инвертор 12', matches: (p) => p.group === 'inv' && p.btu === '12' },
  { id: 'inv18', label: 'Инвертор 18', matches: (p) => p.group === 'inv' && p.btu === '18' },
  { id: 'inv2436', label: 'Инвертор 24–36', matches: (p) => p.group === 'inv' && inList(p.btu, ['24', '30', '36']) },
  { id: 'on79', label: 'On/Off 7–9', matches: (p) => p.group === 'onoff' && inList(p.btu, ['07', '09']) },
  { id: 'on12', label: 'On/Off 12', matches: (p) => p.group === 'onoff' && p.btu === '12' },
  { id: 'on18', label: 'On/Off 18', matches: (p) => p.group === 'onoff' && p.btu === '18' },
  { id: 'on2436', label: 'On/Off 24–36', matches: (p) => p.group === 'onoff' && inList(p.btu, ['24', '28', '30', '36']) },
  { id: 'truba', label: 'Медная труба', matches: (p) => p.group === 'truba' },
  { id: 'rashod', label: 'Расходники', matches: (p) => p.group === 'rashod' },
  { id: 'poluprom', label: 'Полупром', matches: (p) => ['poluprom', 'pac_inv', 'pac_onoff'].includes(p.group) },
  { id: 'pac_kasseta', label: 'Кассетные', matches: (p) => semiIndustrial(p) && (p.type === 'cassette' || /кассет|cassette/i.test(p.series || '')) },
  { id: 'pac_kanalny', label: 'Канальные', matches: (p) => semiIndustrial(p) && (p.type === 'duct' || /канальн|duct/i.test(p.series || '')) },
  { id: 'pac_napolno', label: 'Напольно-потолочные', matches: (p) => semiIndustrial(p) && (p.type === 'floor-ceiling' || /напольно-потолочн|floor.?ceiling/i.test(p.series || '')) },
  { id: 'pac_multi', label: 'Мульти-сплит', matches: (p) => p.group === 'multi' || p.type === 'mult' },
  { id: 'multi', label: 'Чёрные сплиты', matches: (p) => p.group === 'multi' || p.group === 'black' || p.color === 'black' },
];

export const homeQuickFilterIds = ['inv79', 'inv12', 'inv18', 'inv2436', 'on79', 'on12', 'on18', 'on2436', 'truba', 'rashod', 'poluprom', 'multi'];
export const polupromQuickFilterIds = ['pac_kasseta', 'pac_kanalny', 'pac_napolno', 'pac_multi'];

export function filterByQuickFilter(products: Product[], filterId: string) {
  const filter = quickFilters.find((item) => item.id === filterId);
  return filter ? products.filter(filter.matches) : products.filter((product) => !filterId || product.group === filterId);
}
```

Update `filterProducts` to apply `filterByQuickFilter` before text search.

- [ ] **Step 4: Запустить тесты и проверки**

Run:

```powershell
npm.cmd test -- --runInBand __tests__/quick-filters.test.ts __tests__/filter-products.test.ts
npm.cmd run typecheck
```

Expected: PASS.

- [ ] **Step 5: Зафиксировать коммит**

```powershell
git add src/features/catalog/types.ts src/features/catalog/quick-filters.ts src/features/catalog/filter-products.ts __tests__/quick-filters.test.ts __tests__/filter-products.test.ts
git commit -m "feat: add website-compatible catalog filters"
```

## Task 3: Добавить группировку полного каталога

**Files:**

- Create: `src/features/catalog/group-products.ts`
- Create: `__tests__/group-products.test.ts`

- [ ] **Step 1: Написать падающий тест группировки**

Create `__tests__/group-products.test.ts`:

```ts
import { groupProducts } from '../src/features/catalog/group-products';

const product = (id: string, series: string) => ({
  id, sku: id, brand: 'MDV', brandCode: 'mdv', model: id, group: 'inv',
  price: 1, stock: 'in_stock', stockLabel: 'В наличии', descShort: '',
  benefits: [], photo: '', factory: 'MDV', series,
});

test('groups products by equipment group, brand and series', () => {
  const result = groupProducts([product('1', 'INFINI'), product('2', 'INFINI'), product('3', 'OP')]);
  expect(result[0].label).toBe('ИНВЕРТОРНЫЕ');
  expect(result[0].brands[0].factory).toBe('MDV');
  expect(result[0].brands[0].series.map((item) => [item.name, item.products.length])).toEqual([
    ['INFINI', 2],
    ['OP', 1],
  ]);
});
```

- [ ] **Step 2: Проверить падение теста**

Run:

```powershell
npm.cmd test -- --runInBand __tests__/group-products.test.ts
```

Expected: FAIL, потому что helper ещё не существует.

- [ ] **Step 3: Реализовать группировку**

Create `src/features/catalog/group-products.ts` with:

```ts
import type { Product } from './types';

const order = ['inv', 'onoff', 'pac_inv', 'pac_onoff', 'truba', 'poluprom', 'rashod', 'multi'];
const labels: Record<string, string> = {
  inv: 'ИНВЕРТОРНЫЕ', onoff: 'ON/OFF', pac_inv: 'ПОЛУПРОМ ИНВЕРТОР',
  pac_onoff: 'ПОЛУПРОМ ON/OFF', truba: 'МЕДНАЯ ТРУБА', poluprom: 'ПОЛУПРОМ',
  rashod: 'РАСХОДНИКИ', multi: 'ЧЁРНЫЕ СПЛИТЫ',
};

export function groupProducts(products: Product[]) {
  return order.flatMap((group) => {
    const matching = products.filter((product) => product.group === group);
    if (!matching.length) return [];
    const brandNames = [...new Set(matching.map((product) => product.brand))];
    return [{
      id: group,
      label: labels[group],
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
```

- [ ] **Step 4: Запустить тесты и зафиксировать коммит**

```powershell
npm.cmd test -- --runInBand __tests__/group-products.test.ts
npm.cmd run typecheck
git add src/features/catalog/group-products.ts __tests__/group-products.test.ts
git commit -m "feat: group full catalog by brand and series"
```

Expected: PASS.

## Task 4: Заменить первую вкладку на главную и добавить конфигурацию ссылок

**Files:**

- Create: `src/features/home/app-config.ts`
- Modify: `src/app/(tabs)/index.tsx`
- Modify: `src/app/(tabs)/_layout.tsx`

- [ ] **Step 1: Создать единую конфигурацию**

Create `src/features/home/app-config.ts`:

```ts
export const appConfig = {
  managerTelegramUrl: 'https://t.me/Byttehnikaopt',
  managerPhoneUrl: 'tel:+79785991369',
  priceListUrl: 'https://splithub.ru/',
  contacts: [
    { label: '+7 978 599-13-69', url: 'tel:+79785991369', kind: 'phone' },
    { label: '+7 990 002-22-30', url: 'https://t.me/Byttehnikaopt', kind: 'telegram' },
    { label: '+7 990 217-03-15', url: 'https://t.me/Byttehopt', kind: 'telegram' },
    { label: '+7 978 839-40-42', url: 'https://t.me/tsarev_simf', kind: 'telegram' },
  ],
} as const;
```

- [ ] **Step 2: Переписать `src/app/(tabs)/index.tsx` как главную**

Implement a `ScrollView` screen with:

- header row: text logo `СплитХаб`, `Войти`, `Заявка`;
- contact grid from `appConfig.contacts`;
- hero text from the website;
- `Загрузить прайс`, `Весь каталог`;
- quick buttons selected by `homeQuickFilterIds`, routing to
  `/catalog?filter=<id>&mode=flat`;
- `Полупром` button that opens a native `Modal` with `pac_kasseta`, `pac_kanalny`,
  `pac_napolno`, `pac_multi`, selected by `polupromQuickFilterIds`;
- all links opened through `Linking.openURL`;
- `Войти` routes to `/auth/login`, `Заявка` routes to `/cart`, `Весь каталог`
  routes to `/catalog`.

Use a two-column wrapping layout for contact and category buttons, matching the
mobile website screenshot.

- [ ] **Step 3: Rename the tab**

In `src/app/(tabs)/_layout.tsx`, change the first tab title from `Каталог` to
`Главная` and icon from `grid-view` to `home`.

- [ ] **Step 4: Run static checks and commit**

```powershell
npm.cmd run typecheck
npm.cmd run lint
git add src/features/home/app-config.ts 'src/app/(tabs)/index.tsx' 'src/app/(tabs)/_layout.tsx'
git commit -m "feat: add native SplitHub home screen"
```

Expected: TypeScript and lint pass.

## Task 5: Добавить отдельный экран каталога и кнопку заказа на карточке

**Files:**

- Create: `src/app/catalog.tsx`
- Modify: `src/features/catalog/ProductCard.tsx`
- Modify: `src/features/notifications/notification-router.ts`
- Modify: `__tests__/notification-router.test.ts`

- [ ] **Step 1: Исправить падающее ожидание маршрута push**

Update the promotion test in `__tests__/notification-router.test.ts`:

```ts
test('routes promotion to filtered catalog', () => {
  expect(notificationTarget({ type: 'promotion', category: 'inv79' })).toBe('/catalog?filter=inv79&mode=flat');
});
```

- [ ] **Step 2: Проверить падение теста**

```powershell
npm.cmd test -- --runInBand __tests__/notification-router.test.ts
```

Expected: FAIL with the old `/?category=inv79` route.

- [ ] **Step 3: Реализовать `/catalog`**

Create `src/app/catalog.tsx`. The screen must:

- read `{ filter?: string; mode?: string }` through `useLocalSearchParams`;
- use `filterProducts` and `groupProducts`;
- show offline state, loading state, retry state and empty state;
- show a flat two-column `FlatList` when `mode === 'flat'`;
- show grouped `ScrollView` sections in full mode;
- keep search at the top;
- pass `onAdd={addProduct}` into every `ProductCard`;
- show `Alert.alert('Добавлено в заявку', product.model)` after card-button add.

- [ ] **Step 4: Split navigation from add action in `ProductCard`**

Change `ProductCard` props to:

```ts
type ProductCardProps = {
  product: Product;
  onAdd: (product: Product) => void;
};
```

Render the product content inside a `Link` pressable and render a separate
orange `Заказать` pressable beneath it. Include `descShort` between model and
stock. This prevents the add button from opening details.

- [ ] **Step 5: Update notification route and commit**

In `notification-router.ts`, route promotions to:

```ts
return `/catalog?filter=${encodeURIComponent(String(data.category ?? ''))}&mode=flat`;
```

Run:

```powershell
npm.cmd test -- --runInBand __tests__/notification-router.test.ts
npm.cmd run typecheck
npm.cmd run lint
git add src/app/catalog.tsx src/features/catalog/ProductCard.tsx src/features/notifications/notification-router.ts __tests__/notification-router.test.ts
git commit -m "feat: add structured and filtered catalog screens"
```

Expected: PASS.

## Task 6: Расширить карточку товара и шаринг

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/features/catalog/share-product.ts`
- Create: `__tests__/share-product.test.ts`
- Modify: `src/app/product/[id].tsx`

- [ ] **Step 1: Установить clipboard зависимость**

Run:

```powershell
npx.cmd expo install expo-clipboard
```

Expected: `expo-clipboard` появляется в `package.json`, lockfile обновляется.

- [ ] **Step 2: Написать падающие тесты share helper**

Create `__tests__/share-product.test.ts`:

```ts
import { productShareData, shareUrls } from '../src/features/catalog/share-product';

const product = { id: '1245', brand: 'MDV', model: 'MDSAG-09HRDN8', price: 23490 } as never;

test('builds public website product URL', () => {
  expect(productShareData(product).url).toBe('https://splithub.ru/?p=1245');
});

test('builds Telegram and MAX share URLs', () => {
  const urls = shareUrls(product);
  expect(urls.telegram).toContain('https://t.me/share/url?');
  expect(urls.max).toContain('https://max.ru/:share?text=');
});
```

- [ ] **Step 3: Реализовать helper**

Create `src/features/catalog/share-product.ts` with:

```ts
import type { Product } from './types';

export function productShareData(product: Pick<Product, 'id' | 'brand' | 'model' | 'price'>) {
  const url = `https://splithub.ru/?p=${encodeURIComponent(product.id)}`;
  const text = `${product.brand} ${product.model} — ${Number(product.price).toLocaleString('ru-RU')} ₽ · СплитХаб`;
  return { url, text, title: product.model };
}

export function shareUrls(product: Pick<Product, 'id' | 'brand' | 'model' | 'price'>) {
  const data = productShareData(product);
  return {
    max: `https://max.ru/:share?text=${encodeURIComponent(`${data.text}\n${data.url}`)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(data.text)}`,
    email: `mailto:?subject=${encodeURIComponent(`${data.title} — СплитХаб`)}&body=${encodeURIComponent(`${data.text}\n${data.url}`)}`,
  };
}
```

- [ ] **Step 4: Обновить экран товара**

In `src/app/product/[id].tsx`:

- keep one `qty` state with minimum `1`;
- add `−`, current quantity and `+`;
- add product with `addProduct(product, qty)`;
- render spec chips only for existing `btu`, `area`, `compressor`, `freon`;
- render benefits with check marks;
- open MAX, Telegram and Email URL from `shareUrls(product)` with `Linking.openURL`;
- copy `productShareData(product).url` with `Clipboard.setStringAsync`;
- show a short `Alert` after add and copy.

- [ ] **Step 5: Run checks and commit**

```powershell
npm.cmd test -- --runInBand __tests__/share-product.test.ts
npm.cmd run typecheck
npm.cmd run lint
git add package.json package-lock.json src/features/catalog/share-product.ts __tests__/share-product.test.ts 'src/app/product/[id].tsx'
git commit -m "feat: enrich product details and sharing"
```

Expected: PASS.

## Task 7: Добавить комплект монтажника и комментарий заявки

**Files:**

- Create: `src/features/cart/upsell-products.ts`
- Create: `src/features/cart/checkout-payload.ts`
- Create: `__tests__/upsell-products.test.ts`
- Create: `__tests__/checkout-payload.test.ts`
- Modify: `src/features/cart/cart-context.tsx`
- Modify: `src/app/(tabs)/cart.tsx`

- [ ] **Step 1: Написать падающие тесты комплекта и payload**

Create `__tests__/upsell-products.test.ts`:

```ts
import { upsellProducts } from '../src/features/cart/upsell-products';

const products = [
  { id: 'split', group: 'inv', stock: 'in_stock' },
  { id: '1045', group: 'truba', stock: 'in_stock' },
  { id: '1046', group: 'truba', stock: 'out' },
] as never[];

test('offers available installer items for a split system', () => {
  expect(upsellProducts([{ id: 'split', name: 'Split', price: 1, qty: 1 }], products).map((p) => p.id)).toEqual(['1045']);
});

test('does not offer installer items without a split system', () => {
  expect(upsellProducts([], products)).toEqual([]);
});
```

Create `__tests__/checkout-payload.test.ts`:

```ts
import { checkoutPayload } from '../src/features/cart/checkout-payload';

test('sends only validated item fields and trimmed comment', () => {
  expect(checkoutPayload([{ id: '1', name: 'Model', price: 100, qty: 2 }], '  Позвонить утром  ')).toEqual({
    items: [{ id: '1', price: 100, qty: 2 }],
    comment: 'Позвонить утром',
  });
});
```

- [ ] **Step 2: Проверить падение**

```powershell
npm.cmd test -- --runInBand __tests__/upsell-products.test.ts __tests__/checkout-payload.test.ts
```

Expected: FAIL, потому что helpers ещё не существуют.

- [ ] **Step 3: Реализовать helpers**

Create `src/features/cart/upsell-products.ts`:

```ts
import type { Product } from '../catalog/types';
import type { CartItem } from './cart-reducer';

const installerKitIds = ['1045', '1046', '1047', '1069', '1063'];

export function upsellProducts(items: CartItem[], products: Product[]) {
  const byId = new Map(products.map((product) => [product.id, product]));
  const hasSplit = items.some((item) => {
    const product = byId.get(item.id);
    return product?.group === 'inv' || product?.group === 'onoff';
  });
  if (!hasSplit) return [];
  const inCart = new Set(items.map((item) => item.id));
  return installerKitIds.flatMap((id) => {
    const product = byId.get(id);
    return product && product.stock !== 'out' && !inCart.has(id) ? [product] : [];
  });
}
```

Create `src/features/cart/checkout-payload.ts`:

```ts
import type { CartItem } from './cart-reducer';

export function checkoutPayload(items: CartItem[], comment: string) {
  return {
    items: items.map(({ id, price, qty }) => ({ id, price, qty })),
    comment: comment.trim(),
  };
}
```

- [ ] **Step 4: Передать комментарий через cart context**

Change `checkout` signature to
`checkout: (comment?: string) => Promise<{ order_id: number; total: number } | null>`.
Use:

```ts
body: JSON.stringify(checkoutPayload(items, comment ?? '')),
```

Preserve current behavior: clear cart only after successful API response; keep
cart intact after request failure or `CATALOG_CHANGED`.

- [ ] **Step 5: Расширить экран корзины**

In `src/app/(tabs)/cart.tsx`:

- use `snapshot?.products ?? []` from `useCatalog`;
- derive installer kit through `upsellProducts(items, products)`;
- add remove icon button using `setQty(item.id, 0)`;
- show item quantity and line total;
- render the installer kit block with `+ Добавить`;
- add multiline comment input;
- show item count and total;
- add `Продолжить покупки`, routing to `/catalog`;
- rename submit button to `Отправить заявку`;
- call `checkout(comment)`;
- after success clear local comment and show order number.

- [ ] **Step 6: Run checks and commit**

```powershell
npm.cmd test -- --runInBand __tests__/upsell-products.test.ts __tests__/checkout-payload.test.ts __tests__/cart-reducer.test.ts
npm.cmd run typecheck
npm.cmd run lint
git add src/features/cart/upsell-products.ts src/features/cart/checkout-payload.ts __tests__/upsell-products.test.ts __tests__/checkout-payload.test.ts src/features/cart/cart-context.tsx 'src/app/(tabs)/cart.tsx'
git commit -m "feat: add installer kit and order comment"
```

Expected: PASS.

## Task 8: Привести профиль и push-переходы к новой конфигурации

**Files:**

- Modify: `src/app/(tabs)/profile.tsx`
- Modify: `src/features/notifications/notification-router.ts`
- Modify: `__tests__/notification-router.test.ts`

- [ ] **Step 1: Добавить regression test пустой promo-категории**

Append to `__tests__/notification-router.test.ts`:

```ts
test('routes promotion without category to the full catalog', () => {
  expect(notificationTarget({ type: 'promotion' })).toBe('/catalog');
});
```

- [ ] **Step 2: Проверить падение**

```powershell
npm.cmd test -- --runInBand __tests__/notification-router.test.ts
```

Expected: FAIL until the empty category branch is handled.

- [ ] **Step 3: Обновить профиль и router**

In `profile.tsx`:

- open manager Telegram, phone and price list URLs from `appConfig`;
- replace misleading EAS-only error message with
  `Не удалось подключить push-уведомления. Проверьте разрешение уведомлений и подключение.`;
- preserve the existing registration call and preference toggles.

In `notification-router.ts`, return `/catalog` when `promotion` has no category.

- [ ] **Step 4: Run checks and commit**

```powershell
npm.cmd test -- --runInBand __tests__/notification-router.test.ts
npm.cmd run typecheck
npm.cmd run lint
git add 'src/app/(tabs)/profile.tsx' src/features/notifications/notification-router.ts __tests__/notification-router.test.ts
git commit -m "fix: align profile links and promotion routes"
```

Expected: PASS.

## Task 9: Полная проверка и APK для шлифовки

**Files:**

- Modify: `docs/release-checklist.md`

- [ ] **Step 1: Запустить полный test gate**

```powershell
npm.cmd test -- --runInBand
npm.cmd run typecheck
npm.cmd run lint
npx.cmd expo-doctor
```

Expected: все Jest suites проходят; TypeScript и lint без ошибок; `expo-doctor`
не сообщает новых проблем, созданных этой веткой.

- [ ] **Step 2: Собрать preview APK**

```powershell
npx.cmd eas-cli build --platform android --profile preview --non-interactive
```

Expected: EAS сообщает успешный Android build и URL артефакта.

- [ ] **Step 3: Скачать APK в общий каталог артефактов**

Download the APK as:

```text
C:\Users\user\Documents\GitHub\VSCode\splithub_mobile_app\artifacts\SplitHub-native-parity-preview.apk
```

Record its SHA256:

```powershell
Get-FileHash ..\artifacts\SplitHub-native-parity-preview.apk -Algorithm SHA256
```

- [ ] **Step 4: Выполнить ручной Android smoke**

Verify on the physical Android device:

1. `Главная` открывается сразу и содержит контакты, прайс, каталог и категории.
2. `Инвертор 7–9` открывает плоскую выдачу.
3. `Весь каталог` показывает разделы, бренды и серии.
4. Карточка товара открывается, количество меняется, ссылки MAX/Telegram/Email
   открываются, ссылка копируется.
5. `Заказать` на карточке добавляет товар без перехода в детали.
6. В корзине показывается комплект монтажника; расходник добавляется.
7. Комментарий сохраняется в отправляемой заявке.
8. Успешная заявка появляется во вкладке `Заказы`.
9. Профиль открывает менеджера, звонок и страницу прайса.

- [ ] **Step 5: Обновить release checklist и commit**

Add a dated physical-device row to `docs/release-checklist.md`, record the APK
filename and smoke result, then commit:

```powershell
git add docs/release-checklist.md
git commit -m "docs: record native parity Android smoke"
```

## Final Review

Before merging:

```powershell
git status --short
git log --oneline --decorate 61d33f3..HEAD
git diff --check 61d33f3..HEAD
git diff --stat 61d33f3..HEAD
```

Expected: only planned mobile files changed; no website repository file changed;
diff check is clean.
