import { NativeModules } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { Roboto_400Regular, Roboto_700Bold } from '@expo-google-fonts/roboto';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';

import type { Product } from '../catalog/types';

export type PriceListFormat = 'pdf' | 'excel';

export type PriceListDownloadResult = {
  fileName: string;
  uri: string;
  savedToPhone: boolean;
};

export type PriceListFileSystem = {
  cacheDirectory: string | null;
  makeDirectoryAsync: typeof FileSystem.makeDirectoryAsync;
  readAsStringAsync: typeof FileSystem.readAsStringAsync;
  writeAsStringAsync: typeof FileSystem.writeAsStringAsync;
};

type PriceListPdfRenderer = {
  renderBase64: (products: Product[], today: string) => Promise<string>;
};

// Saves a locally generated file into the public Downloads folder and returns
// its content URI. Injected so tests don't touch the native MediaStore module.
export type DownloadsSaver = (localUri: string, fileName: string, mimeType: string) => Promise<string>;

type DownloadOptions = {
  fileSystem?: PriceListFileSystem;
  now?: () => Date;
  pdfRenderer?: PriceListPdfRenderer;
  downloadsSaver?: DownloadsSaver;
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
    ? await createPdfPriceList(products, today, fileSystem, options.pdfRenderer ?? pdfRenderer)
    : await createExcelPriceList(products, today, fileSystem);

  return saveToDownloads(generated, options.downloadsSaver ?? mediaStoreDownloadsSaver);
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
  fileSystem: PriceListFileSystem,
  renderer: PriceListPdfRenderer,
): Promise<GeneratedPriceListFile> {
  const cacheDirectory = fileSystem.cacheDirectory;
  if (!cacheDirectory) {
    throw new Error('Не удалось подготовить прайс: хранилище приложения недоступно');
  }

  const fileName = buildFileName('pdf', today);
  const directoryUri = `${cacheDirectory}${priceListDirName}/`;
  const fileUri = `${directoryUri}${fileName}`;
  const pdfBase64 = await renderer.renderBase64(products, today);

  await fileSystem.makeDirectoryAsync(directoryUri, { intermediates: true });
  await fileSystem.writeAsStringAsync(fileUri, pdfBase64, { encoding: 'base64' });

  return {
    fileName,
    mimeType: formatMeta.pdf.mimeType,
    uri: fileUri,
  };
}

type DownloadsNativeModule = {
  saveToDownloads: (srcPath: string, fileName: string, mimeType: string) => Promise<string>;
};

// Save straight into the system Downloads folder (MediaStore) with no folder
// picker, like a regular Android download. Backed by the in-app native module.
const mediaStoreDownloadsSaver: DownloadsSaver = async (localUri, fileName, mimeType) => {
  const native = (NativeModules as { SplitHubDownloads?: DownloadsNativeModule }).SplitHubDownloads;
  if (!native?.saveToDownloads) {
    throw new Error('Сохранение в «Загрузки» недоступно на этом устройстве');
  }
  return native.saveToDownloads(localUri, fileName, mimeType);
};

async function saveToDownloads(
  file: GeneratedPriceListFile,
  saver: DownloadsSaver,
): Promise<PriceListDownloadResult> {
  const targetUri = await saver(file.uri, file.fileName, file.mimeType);
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

const pdfRenderer: PriceListPdfRenderer = {
  renderBase64: renderPdfPriceListBase64,
};

async function renderPdfPriceListBase64(products: Product[], today: string) {
  const [regularFontBase64, boldFontBase64] = await Promise.all([
    readAssetAsBase64(Roboto_400Regular),
    readAssetAsBase64(Roboto_700Bold),
  ]);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle('Прайс-лист СплитХаб');
  pdf.setCreator('SplitHub mobile app');

  const regular = await pdf.embedFont(regularFontBase64, { subset: true });
  const bold = await pdf.embedFont(boldFontBase64, { subset: true });
  const layout = {
    bottom: 32,
    columns: [32, 56, 128, 306, 366, 446, 514],
    height: 842,
    rowHeight: 18,
    width: 595,
  };
  let page = addPdfPage(pdf, today, products.length, bold, regular, layout.width, layout.height);
  let y = layout.height - 132;

  drawTableHeader(page, y, bold, layout.columns);
  y -= layout.rowHeight;

  products.forEach((product, index) => {
    if (y < layout.bottom + layout.rowHeight) {
      page = addPdfPage(pdf, today, products.length, bold, regular, layout.width, layout.height);
      y = layout.height - 104;
      drawTableHeader(page, y, bold, layout.columns);
      y -= layout.rowHeight;
    }

    drawProductRow(page, product, index + 1, y, regular, layout.columns);
    y -= layout.rowHeight;
  });

  return pdf.saveAsBase64();
}

async function readAssetAsBase64(moduleId: number) {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
}

function addPdfPage(
  pdf: PDFDocument,
  today: string,
  productCount: number,
  bold: PDFFont,
  regular: PDFFont,
  width: number,
  height: number,
) {
  const page = pdf.addPage([width, height]);
  page.drawText('Прайс-лист СплитХаб', {
    color: rgb(0.06, 0.09, 0.16),
    font: bold,
    size: 22,
    x: 32,
    y: height - 48,
  });
  page.drawText(`Дата: ${today} · Товаров: ${productCount}`, {
    color: rgb(0.39, 0.45, 0.55),
    font: regular,
    size: 10,
    x: 32,
    y: height - 68,
  });
  page.drawText('Оптовый прайс для монтажников и B2B', {
    color: rgb(0.71, 0.33, 0.03),
    font: bold,
    size: 11,
    x: 32,
    y: height - 88,
  });
  return page;
}

function drawTableHeader(page: PDFPage, y: number, font: PDFFont, columns: number[]) {
  page.drawRectangle({
    color: rgb(0.94, 0.96, 0.98),
    height: 18,
    width: 532,
    x: 32,
    y: y - 4,
  });
  drawCell(page, '#', columns[0], y, font, 8, 18);
  drawCell(page, 'Бренд', columns[1], y, font, 8, 66);
  drawCell(page, 'Модель', columns[2], y, font, 8, 170);
  drawCell(page, 'Группа', columns[3], y, font, 8, 52);
  drawCell(page, 'Наличие', columns[4], y, font, 8, 72);
  drawCell(page, 'Цена', columns[5], y, font, 8, 78);
}

function drawProductRow(page: PDFPage, product: Product, number: number, y: number, font: PDFFont, columns: number[]) {
  drawCell(page, String(number), columns[0], y, font, 8, 18);
  drawCell(page, product.brand, columns[1], y, font, 8, 66);
  drawCell(page, product.model || product.sku, columns[2], y, font, 8, 170);
  drawCell(page, product.group, columns[3], y, font, 8, 52);
  drawCell(page, product.stockLabel || product.stock, columns[4], y, font, 8, 72);
  drawCell(page, formatPrice(product.price), columns[5], y, font, 8, 78);
  page.drawLine({
    color: rgb(0.88, 0.9, 0.94),
    end: { x: columns[6], y: y - 6 },
    start: { x: 32, y: y - 6 },
    thickness: 0.4,
  });
}

function drawCell(page: PDFPage, value: string, x: number, y: number, font: PDFFont, size: number, width: number) {
  page.drawText(truncatePdfText(value, font, size, width), {
    color: rgb(0.06, 0.09, 0.16),
    font,
    size,
    x,
    y,
  });
}

function truncatePdfText(value: string, font: PDFFont, size: number, maxWidth: number) {
  const clean = normalizePdfText(value);
  if (font.widthOfTextAtSize(clean, size) <= maxWidth) {
    return clean;
  }

  let result = clean;
  while (result.length > 1 && font.widthOfTextAtSize(`${result}…`, size) > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
}

function normalizePdfText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function getPriceListDownloadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Не удалось сохранить прайс. Попробуйте ещё раз.';
}
