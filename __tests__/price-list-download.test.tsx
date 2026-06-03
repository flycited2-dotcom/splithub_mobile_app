import { Alert, Linking } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import HomeScreen from '../src/app/(tabs)/index';
import { downloadPriceList, type PriceListFileSystem } from '../src/features/home/price-list-download';
import { useSession } from '../src/features/session/session-context';
import { useCatalog } from '../src/features/catalog/catalog-context';
import type { Product } from '../src/features/catalog/types';

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

jest.mock('../src/features/catalog/catalog-context', () => ({
  useCatalog: jest.fn(),
}));

jest.mock('../src/features/home/price-list-download', () => {
  const actual = jest.requireActual('../src/features/home/price-list-download');
  return {
    ...actual,
    downloadPriceList: jest.fn(actual.downloadPriceList),
  };
});

const mockedUseSession = jest.mocked(useSession);
const mockedUseCatalog = jest.mocked(useCatalog);
const mockedDownloadPriceList = jest.mocked(downloadPriceList);
const actualPriceListDownload =
  jest.requireActual<typeof import('../src/features/home/price-list-download')>(
    '../src/features/home/price-list-download',
  );

const priceProducts = [
  {
    id: 'mdv-07',
    sku: 'MDSAG-07HRDN8',
    brand: 'MDV',
    model: 'MDSAG-07HRDN8',
    group: 'inv',
    price: 22390,
    stock: 'in_stock',
    stockLabel: 'В наличии',
    descShort: 'Инвертор 07 BTU',
    benefits: [],
    photo: '',
  },
] as Product[];

beforeEach(() => {
  jest.clearAllMocks();
  mockedDownloadPriceList.mockImplementation(actualPriceListDownload.downloadPriceList);
  mockedUseCatalog.mockReturnValue({
    error: null,
    loading: false,
    offline: false,
    refresh: jest.fn(),
    snapshot: {
      products: priceProducts,
      updated_at: '2026-06-03',
      version: 'test',
    },
  });
  mockedUseSession.mockReturnValue({
    loading: false,
    login: jest.fn(),
    logout: jest.fn(),
    refreshProfile: jest.fn(),
    register: jest.fn(),
    user: null,
  });
});

test('asks for PDF or Excel and saves the selected price list without opening a browser link', async () => {
  const openUrlSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation();
  mockedDownloadPriceList.mockResolvedValue({
    fileName: 'splithub-price-2026-06-03.xls',
    savedToPhone: true,
    uri: 'content://downloads/splithub-price-2026-06-03.xls',
  });

  const { getByText } = render(<HomeScreen />);

  fireEvent.press(getByText('⇩  Загрузить прайс'));

  const [, , actions] = alertSpy.mock.calls[0];
  await act(async () => {
    actions?.find((action) => action.text === 'Excel')?.onPress?.();
  });

  await waitFor(() => {
    expect(mockedDownloadPriceList).toHaveBeenCalledWith('excel', priceProducts);
  });
  expect(openUrlSpy).not.toHaveBeenCalled();
  expect(alertSpy).toHaveBeenLastCalledWith(
    'Прайс сохранён',
    'Файл splithub-price-2026-06-03.xls сохранён в выбранную папку телефона.',
  );
});

test('creates an Excel price list and writes it to the selected phone folder', async () => {
  const fileSystem: PriceListFileSystem = {
    cacheDirectory: 'file:///cache/',
    makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
    readAsStringAsync: jest.fn().mockResolvedValue('base64-xls'),
    writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
    StorageAccessFramework: {
      createFileAsync: jest.fn().mockResolvedValue('content://downloads/splithub-price-2026-06-03.xls'),
      requestDirectoryPermissionsAsync: jest.fn().mockResolvedValue({
        directoryUri: 'content://downloads',
        granted: true,
      }),
      writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
    },
  };

  await expect(actualPriceListDownload.downloadPriceList('excel', priceProducts, {
    fileSystem,
    now: () => new Date('2026-06-03T12:00:00Z'),
  })).resolves.toEqual({
    fileName: 'splithub-price-2026-06-03.xls',
    savedToPhone: true,
    uri: 'content://downloads/splithub-price-2026-06-03.xls',
  });

  expect(fileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
    'file:///cache/splithub-prices/',
    { intermediates: true },
  );
  expect(fileSystem.writeAsStringAsync).toHaveBeenCalledWith(
    'file:///cache/splithub-prices/splithub-price-2026-06-03.xls',
    expect.stringContaining('MDSAG-07HRDN8'),
  );
  expect(fileSystem.StorageAccessFramework!.createFileAsync).toHaveBeenCalledWith(
    'content://downloads',
    'splithub-price-2026-06-03.xls',
    'application/vnd.ms-excel',
  );
});

test('creates a PDF price list and writes it to the selected phone folder', async () => {
  const fileSystem: PriceListFileSystem = {
    cacheDirectory: 'file:///cache/',
    makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
    readAsStringAsync: jest.fn().mockResolvedValue('base64-pdf'),
    writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
    StorageAccessFramework: {
      createFileAsync: jest.fn().mockResolvedValue('content://downloads/splithub-price-2026-06-03.pdf'),
      requestDirectoryPermissionsAsync: jest.fn().mockResolvedValue({
        directoryUri: 'content://downloads',
        granted: true,
      }),
      writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
    },
  };
  const print = {
    printToFileAsync: jest.fn().mockResolvedValue({ uri: 'file:///cache/print.pdf' }),
  };

  await expect(actualPriceListDownload.downloadPriceList('pdf', priceProducts, {
    fileSystem,
    now: () => new Date('2026-06-03T12:00:00Z'),
    print,
  })).resolves.toEqual({
    fileName: 'splithub-price-2026-06-03.pdf',
    savedToPhone: true,
    uri: 'content://downloads/splithub-price-2026-06-03.pdf',
  });

  expect(print.printToFileAsync).toHaveBeenCalledWith({
    html: expect.stringContaining('MDSAG-07HRDN8'),
  });
  expect(fileSystem.StorageAccessFramework!.createFileAsync).toHaveBeenCalledWith(
    'content://downloads',
    'splithub-price-2026-06-03.pdf',
    'application/pdf',
  );
});

test('asks the user to choose a folder when phone storage access is unavailable', async () => {
  const fileSystem: PriceListFileSystem = {
    cacheDirectory: 'file:///cache/',
    makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
    readAsStringAsync: jest.fn().mockResolvedValue('base64-xls'),
    writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
    StorageAccessFramework: {
      createFileAsync: jest.fn(),
      requestDirectoryPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
      writeAsStringAsync: jest.fn(),
    },
  };

  await expect(actualPriceListDownload.downloadPriceList('excel', priceProducts, {
    fileSystem,
    now: () => new Date('2026-06-03T12:00:00Z'),
  })).rejects.toThrow('Выберите папку телефона для сохранения прайса');
});
