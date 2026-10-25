import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { UpdatePrompt } from '../src/features/updates/UpdatePrompt';

const manifest = {
  versionCode: 5,
  versionName: '1.2.0',
  url: 'https://splithub.ru/app/splithub.apk',
  notes: 'Каталог как на сайте',
  minVersionCode: 0,
};

test('offers a newer version and opens the APK link', async () => {
  const openSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  const check = jest.fn().mockResolvedValue({ status: 'optional', manifest });

  const { findByText, getByText } = render(<UpdatePrompt check={check} currentVersionCode={3} />);

  expect(await findByText('Доступна новая версия 1.2.0')).toBeTruthy();
  expect(getByText('Каталог как на сайте')).toBeTruthy();
  fireEvent.press(getByText('Обновить'));
  expect(openSpy).toHaveBeenCalledWith('https://splithub.ru/app/splithub.apk');
  openSpy.mockRestore();
});

test('an optional update can be postponed, a required one cannot', async () => {
  const optional = render(<UpdatePrompt check={jest.fn().mockResolvedValue({ status: 'optional', manifest })} currentVersionCode={3} />);
  fireEvent.press(await optional.findByText('Позже'));
  await waitFor(() => expect(optional.queryByText('Доступна новая версия 1.2.0')).toBeNull());

  const required = render(<UpdatePrompt check={jest.fn().mockResolvedValue({ status: 'required', manifest })} currentVersionCode={3} />);
  expect(await required.findByText('Это обновление обязательно для работы приложения.')).toBeTruthy();
  expect(required.queryByText('Позже')).toBeNull();
});

test('shows nothing when there is no update', async () => {
  const check = jest.fn().mockResolvedValue(null);
  const { queryByText } = render(<UpdatePrompt check={check} currentVersionCode={5} />);
  await act(async () => {});
  expect(check).toHaveBeenCalledWith(5);
  expect(queryByText('Обновить')).toBeNull();
});
