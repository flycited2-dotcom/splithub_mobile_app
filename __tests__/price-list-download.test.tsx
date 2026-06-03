import { Alert, Linking } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import HomeScreen from '../src/app/(tabs)/index';
import { appConfig } from '../src/features/home/app-config';
import { downloadPriceList, type PriceListFileSystem } from '../src/features/home/price-list-download';
import { useSession } from '../src/features/session/session-context';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock('../src/features/session/session-context', () => ({
  useSession: jest.fn(),
}));

jest.mock('../src/features/home/price-list-download', () => {
  const actual = jest.requireActual('../src/features/home/price-list-download');
  return {
    ...actual,
    downloadPriceList: jest.fn(actual.downloadPriceList),
  };
});

const mockedUseSession = jest.mocked(useSession);
const mockedDownloadPriceList = jest.mocked(downloadPriceList);
const actualPriceListDownload =
  jest.requireActual<typeof import('../src/features/home/price-list-download')>(
    '../src/features/home/price-list-download',
  );

beforeEach(() => {
  jest.clearAllMocks();
  mockedDownloadPriceList.mockImplementation(actualPriceListDownload.downloadPriceList);
  mockedUseSession.mockReturnValue({
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    refreshProfile: jest.fn(),
    register: jest.fn(),
    user: null,
  });
});

test('downloads the price list from the app instead of opening a browser link', async () => {
  const openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
  mockedDownloadPriceList.mockResolvedValue({
    fileName: 'splithub-price-2026-06-03.csv',
    uri: 'file:///cache/splithub-prices/splithub-price-2026-06-03.csv',
  });

  const { getByText } = render(<HomeScreen />);

  fireEvent.press(getByText('⇩  Загрузить прайс'));

  await waitFor(() => {
    expect(mockedDownloadPriceList).toHaveBeenCalledWith(appConfig.priceListUrl);
  });
  expect(openUrlSpy).not.toHaveBeenCalled();
  expect(alertSpy).toHaveBeenCalledWith(
    'Прайс загружен',
    'Файл splithub-price-2026-06-03.csv скачан в приложение.',
  );
});

test('downloads price list into the app cache with a dated file name', async () => {
  const fileSystem: PriceListFileSystem = {
    cacheDirectory: 'file:///cache/',
    downloadAsync: jest.fn().mockResolvedValue({
      status: 200,
      uri: 'file:///cache/splithub-prices/splithub-price-2026-06-03.csv',
    }),
    makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  };

  await expect(actualPriceListDownload.downloadPriceList(appConfig.priceListUrl, {
    fileSystem,
    now: () => new Date('2026-06-03T12:00:00Z'),
  })).resolves.toEqual({
    fileName: 'splithub-price-2026-06-03.csv',
    uri: 'file:///cache/splithub-prices/splithub-price-2026-06-03.csv',
  });

  expect(fileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
    'file:///cache/splithub-prices/',
    { intermediates: true },
  );
  expect(fileSystem.downloadAsync).toHaveBeenCalledWith(
    appConfig.priceListUrl,
    'file:///cache/splithub-prices/splithub-price-2026-06-03.csv',
  );
});

test('reports server errors from the direct price-list endpoint', async () => {
  const fileSystem: PriceListFileSystem = {
    cacheDirectory: 'file:///cache/',
    downloadAsync: jest.fn().mockResolvedValue({
      status: 404,
      uri: 'file:///cache/splithub-prices/splithub-price-2026-06-03.csv',
    }),
    makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  };

  await expect(actualPriceListDownload.downloadPriceList(appConfig.priceListUrl, {
    fileSystem,
    now: () => new Date('2026-06-03T12:00:00Z'),
  })).rejects.toThrow('Не удалось скачать прайс: сервер вернул HTTP 404');
});
