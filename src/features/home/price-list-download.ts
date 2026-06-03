import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';

import type { Product } from '../catalog/types';

export type PriceListFormat = 'pdf' | 'excel';

export type PriceListDownloadResult = {
  fileName: string;
  uri: string;
  savedToPhone: boolean;
};

type StorageAccess = {
  createFileAsync: typeof FileSystem.StorageAccessFramework.createFileAsync;
  getUriForDirectoryInRoot?: typeof FileSystem.StorageAccessFramework.getUriForDirectoryInRoot;
  requestDirectoryPermissionsAsync: typeof FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync;
  writeAsStringAsync: typeof FileSystem.StorageAccessFramework.writeAsStringAsync;
};

export type PriceListFileSystem = {
  cacheDirectory: string | null;
  makeDirectoryAsync: typeof FileSystem.makeDirectoryAsync;
  readAsStringAsync: typeof FileSystem.readAsStringAsync;
  writeAsStringAsync: typeof FileSystem.writeAsStringAsync;
  StorageAccessFramework?: StorageAccess;
};

type PriceListPrint = {
  printToFileAsync: typeof Print.printToFileAsync;
};

type DownloadOptions = {
  fileSystem?: PriceListFileSystem;
  now?: () => Date;
  print?: PriceListPrint;
};

type GeneratedPriceListFile = {
  fileName: string;
  mimeType: string;
  uri: string;
};

const priceListDirName = 'splithub-prices';

const formatMeta: Record<PriceListFormat, { extension: string; mimeType: string }> = {
  excel: {
    extension: 'xls',
    mimeType: 'application/vnd.ms-excel',
  },
  pdf: {
    extension: 'pdf',
    mimeType: 'application/pdf',
  },
};

export async function downloadPriceList(
  format: PriceListFormat,
  products: Product[],
  options: DownloadOptions = {},
): Promise<PriceListDownloadResult> {
  if (!products.length) {
    throw new Error('Каталог ещё не загружен. Обновите каталог и попробуйте снова.');
  }

  const fileSystem = options.fileSystem ?? FileSystem;
  const today = (options.now?.() ?? new Date()).toISOString().slice(0, 10);
  const generated = format === 'pdf'
    ? await createPdfPriceList(products, today, options.print ?? Print)
    : await createExcelPriceList(products, today, fileSystem);

  return saveToPhoneFolder(generated, fileSystem);
}

async function createExcelPriceList(
  products: Product[],
  today: string,
  fileSystem: PriceListFileSystem,
): Promise<GeneratedPriceListFile> {
  const cacheDirectory = fileSystem.cacheDirectory;
  if (!cacheDirectory) {
    throw new Error('Не удалось подготовить прайс: хранилище приложения недоступно');
  }

  const fileName = buildFileName('excel', today);
  const directoryUri = `${cacheDirectory}${priceListDirName}/`;
  const fileUri = `${directoryUri}${fileName}`;

  await fileSystem.makeDirectoryAsync(directoryUri, { intermediates: true });
  await fileSystem.writeAsStringAsync(fileUri, buildPriceListHtml(products, today));

  return {
    fileName,
    mimeType: formatMeta.excel.mimeType,
    uri: fileUri,
  };
}

async function createPdfPriceList(
  products: Product[],
  today: string,
  print: PriceListPrint,
): Promise<GeneratedPriceListFile> {
  const fileName = buildFileName('pdf', today);
  const result = await print.printToFileAsync({
    html: buildPriceListHtml(products, today),
  });

  return {
    fileName,
    mimeType: formatMeta.pdf.mimeType,
    uri: result.uri,
  };
}

async function saveToPhoneFolder(
  file: GeneratedPriceListFile,
  fileSystem: PriceListFileSystem,
): Promise<PriceListDownloadResult> {
  const storage = fileSystem.StorageAccessFramework;
  if (!storage) {
    throw new Error('Сохранение в папку телефона недоступно на этом устройстве');
  }

  const initialUri = storage.getUriForDirectoryInRoot?.('Download') ?? undefined;
  const permissions = await storage.requestDirectoryPermissionsAsync(initialUri);
  if (!permissions.granted) {
    throw new Error('Выберите папку телефона для сохранения прайса');
  }

  const base64 = await fileSystem.readAsStringAsync(file.uri, { encoding: 'base64' });
  const targetUri = await storage.createFileAsync(permissions.directoryUri, file.fileName, file.mimeType);
  await storage.writeAsStringAsync(targetUri, base64, { encoding: 'base64' });

  return {
    fileName: file.fileName,
    savedToPhone: true,
    uri: targetUri,
  };
}

function buildFileName(format: PriceListFormat, today: string) {
  return `splithub-price-${today}.${formatMeta[format].extension}`;
}

function buildPriceListHtml(products: Product[], today: string) {
  const rows = products.map((product, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(product.brand)}</td>
      <td>${escapeHtml(product.model || product.sku)}</td>
      <td>${escapeHtml(product.group)}</td>
      <td>${escapeHtml(product.btu || '')}</td>
      <td>${escapeHtml(product.stockLabel || product.stock)}</td>
      <td class="price">${formatPrice(product.price)}</td>
    </tr>
  `).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { color: #0f172a; font-family: Arial, sans-serif; padding: 24px; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    p { color: #64748b; margin: 0 0 18px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d8dee8; font-size: 11px; padding: 7px; text-align: left; }
    th { background: #f1f5f9; color: #334155; }
    .price { color: #b45309; font-weight: 700; white-space: nowrap; }
  </style>
</head>
<body>
  <h1>Прайс-лист СплитХаб</h1>
  <p>Дата: ${escapeHtml(today)} · Товаров: ${products.length}</p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Бренд</th>
        <th>Модель</th>
        <th>Группа</th>
        <th>BTU</th>
        <th>Наличие</th>
        <th>Цена</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatPrice(price: number) {
  return `${new Intl.NumberFormat('ru-RU').format(price)} ₽`;
}

export function getPriceListDownloadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Не удалось сохранить прайс. Попробуйте ещё раз.';
}
