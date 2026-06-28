# App Store / TestFlight — материалы SplitHub

Подготовлено для первой iOS-сборки `ru.splithub.mobile` и загрузки в TestFlight.

## Технические параметры

- App name: `SplitHub` / `СплитХаб`
- Bundle ID: `ru.splithub.mobile`
- SKU: `ru.splithub.mobile`
- Version: `1.1.0`
- Privacy policy URL: `https://splithub.ru/privacy/`
- Категория: `Business` (альтернатива: `Shopping`)
- Возрастной рейтинг: без ограниченного контента; выбрать минимальный рейтинг,
  который App Store Connect рассчитает по анкете.

## TestFlight

What to Test:

```text
Проверьте регистрацию и вход, открытие каталога, карточку товара, добавление
товара в заявку, оформление заказа, восстановление пароля по email, экран
заказов и получение push-уведомлений о статусах.
```

Beta App Review notes:

```text
SplitHub is a B2B catalog and ordering app for professional air-conditioner
installers and wholesale customers in Crimea. The app uses the production API at
https://splithub.ru/api/mobile.php. Testers can register with phone and email or
use a provided test account if needed.
```

## Карточка приложения

Название:

```text
СплитХаб
```

Краткое описание:

```text
Оптовый каталог для монтажников
```

Полное описание:

```text
СплитХаб — мобильный оптовый каталог климатической техники для монтажников и
установщиков кондиционеров. Заказывайте сплит-системы, медную трубу и расходники
оптом прямо с телефона.

Возможности приложения:
• Полный каталог: инверторные и On/Off сплит-системы, медная труба, расходники
• Актуальные оптовые цены и наличие на складе
• Оформление заказа в пару касаний
• Отслеживание статуса заказа с push-уведомлениями
• Бонусная программа для постоянных клиентов
• Скачивание прайс-листа на телефон

Только для профессиональных монтажников и B2B-клиентов. Работаем в Симферополе и
по всему Крыму.

Сайт: splithub.ru
```

Что нового:

```text
Первый iOS-выпуск SplitHub: каталог, оптовые заявки, статусы заказов,
восстановление пароля по email и push-уведомления.
```

## Что понадобится перед отправкой

- Активный Apple Developer Program account с доступом к Team ID.
- Интерактивный вход в Apple Developer/App Store Connect для EAS credentials.
- Distribution Certificate и Provisioning Profile, желательно managed by EAS.
- APNs Auth Key для iOS push через Expo.
- Скриншоты iPhone для App Store Connect.
- Тестовый аккаунт, если Apple Beta App Review не должен регистрироваться сам.
