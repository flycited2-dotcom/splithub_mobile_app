import * as FileSystem from 'expo-file-system/legacy';

export type PriceListDownloadResult = {
  fileName: string;
  uri: string;
};

export type PriceListFileSystem = {
  cacheDirectory: string | null;
  downloadAsync: typeof FileSystem.downloadAsync;
  makeDirectoryAsync: typeof FileSystem.makeDirectoryAsync;
};

type DownloadOptions = {
  fileSystem?: PriceListFileSystem;
  now?: () => Date;
};

const priceListDirName = 'splithub-prices';

export async function downloadPriceList(
  url: string,
  options: DownloadOptions = {},
): Promise<PriceListDownloadResult> {
  const fileSystem = options.fileSystem ?? FileSystem;
  const cacheDirectory = fileSystem.cacheDirectory;
  if (!cacheDirectory) {
    throw new Error('Не удалось скачать прайс: хранилище приложения недоступно');
  }

  const today = (options.now?.() ?? new Date()).toISOString().slice(0, 10);
  const fileName = `splithub-price-${today}.csv`;
  const directoryUri = `${cacheDirectory}${priceListDirName}/`;
  const fileUri = `${directoryUri}${fileName}`;

  await fileSystem.makeDirectoryAsync(directoryUri, { intermediates: true });
  const result = await fileSystem.downloadAsync(url, fileUri);

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Не удалось скачать прайс: сервер вернул HTTP ${result.status}`);
  }

  return {
    fileName,
    uri: result.uri,
  };
}

export function getPriceListDownloadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Не удалось скачать прайс. Попробуйте позже.';
}
