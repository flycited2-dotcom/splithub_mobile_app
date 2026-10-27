import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Roboto_400Regular, Roboto_700Bold } from '@expo-google-fonts/roboto';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PDFFont, PDFPage, rgb } from 'pdf-lib';

import { mediaStoreDownloadsSaver, readAssetAsBase64 } from '../home/price-list-download';
import type { Estimate, EstimateLine } from './estimate';

export type EstimateMeta = {
  contractorName: string;
  contractorPhone: string;
  clientName: string;
  objectAddress: string;
  validDays: number;
  date: Date;
};

const A4 = { width: 595, height: 842, left: 40, right: 555, bottom: 70 };
const ink = rgb(0.06, 0.09, 0.16);
const muted = rgb(0.39, 0.45, 0.55);
const accent = rgb(0.85, 0.47, 0.02);
// # | name | qty | price | sum
const columns = [40, 62, 360, 420, 490];

const money = (value: number) => `${value.toLocaleString('ru-RU').replace(/ /g, ' ')} ₽`;
const dateText = (date: Date) => date.toLocaleDateString('ru-RU');

export function estimateFileName(meta: EstimateMeta) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = meta.date;
  return `smeta-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.pdf`;
}

function fit(text: string, font: PDFFont, size: number, width: number) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (font.widthOfTextAtSize(clean, size) <= width) return clean;
  let cut = clean;
  while (cut.length > 1 && font.widthOfTextAtSize(`${cut}…`, size) > width) cut = cut.slice(0, -1);
  return `${cut}…`;
}

export async function renderEstimatePdfBase64(estimate: Estimate, meta: EstimateMeta) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(await readAssetAsBase64(Roboto_400Regular), { subset: true });
  const bold = await pdf.embedFont(await readAssetAsBase64(Roboto_700Bold), { subset: true });

  let page: PDFPage = pdf.addPage([A4.width, A4.height]);
  let y = A4.height - 56;
  const text = (value: string, x: number, size: number, font = regular, color = ink) =>
    page.drawText(value, { x, y, size, font, color });
  const newPageIfNeeded = (space: number) => {
    if (y - space < A4.bottom) {
      page = pdf.addPage([A4.width, A4.height]);
      y = A4.height - 56;
    }
  };

  // Header: who offers, to whom, when.
  text('СМЕТА', A4.left, 26, bold);
  text(`от ${dateText(meta.date)}`, A4.left + 110, 12, regular, muted);
  y -= 28;
  if (meta.contractorName) { text(`Исполнитель: ${meta.contractorName}`, A4.left, 11, bold); y -= 16; }
  if (meta.contractorPhone) { text(`Телефон: ${meta.contractorPhone}`, A4.left, 11); y -= 16; }
  if (meta.clientName) { text(`Заказчик: ${meta.clientName}`, A4.left, 11); y -= 16; }
  if (meta.objectAddress) { text(`Объект: ${fit(meta.objectAddress, regular, 11, 480)}`, A4.left, 11); y -= 16; }
  y -= 10;

  const section = (title: string, lines: EstimateLine[], total: number) => {
    if (!lines.length) return;
    newPageIfNeeded(60);
    text(title, A4.left, 13, bold, accent);
    y -= 18;
    page.drawRectangle({ x: A4.left, y: y - 5, width: A4.right - A4.left, height: 18, color: rgb(0.95, 0.96, 0.98) });
    text('№', columns[0] + 2, 9, bold, muted);
    text('Наименование', columns[1], 9, bold, muted);
    text('Кол-во', columns[2], 9, bold, muted);
    text('Цена', columns[3], 9, bold, muted);
    text('Сумма', columns[4], 9, bold, muted);
    y -= 20;
    lines.forEach((line, index) => {
      newPageIfNeeded(20);
      text(String(index + 1), columns[0] + 2, 10);
      text(fit(line.name, regular, 10, columns[2] - columns[1] - 8), columns[1], 10);
      text(`${line.qty}${line.unit ? ` ${line.unit}` : ''}`, columns[2], 10);
      text(money(line.unitPrice), columns[3], 10);
      text(money(line.total), columns[4], 10, bold);
      page.drawLine({ start: { x: A4.left, y: y - 6 }, end: { x: A4.right, y: y - 6 }, thickness: 0.4, color: rgb(0.88, 0.9, 0.94) });
      y -= 20;
    });
    text(`Итого: ${money(total)}`, columns[3] - 20, 11, bold);
    y -= 26;
  };

  section('Оборудование и материалы', estimate.equipment, estimate.equipmentTotal);
  section('Работы', estimate.works, estimate.worksTotal);

  newPageIfNeeded(70);
  page.drawRectangle({ x: A4.left, y: y - 14, width: A4.right - A4.left, height: 36, color: rgb(1, 0.97, 0.9) });
  y += 2;
  text('ИТОГО К ОПЛАТЕ', A4.left + 12, 13, bold);
  text(money(estimate.total), columns[3] - 10, 16, bold, accent);
  y -= 46;
  text(`Смета действительна ${meta.validDays} дн. Цены на оборудование зафиксированы на дату составления.`, A4.left, 9, regular, muted);

  return pdf.saveAsBase64();
}

async function writeEstimateFile(estimate: Estimate, meta: EstimateMeta) {
  const dir = `${FileSystem.cacheDirectory}splithub-estimates/`;
  const fileName = estimateFileName(meta);
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  await FileSystem.writeAsStringAsync(`${dir}${fileName}`, await renderEstimatePdfBase64(estimate, meta), { encoding: 'base64' });
  return { uri: `${dir}${fileName}`, fileName };
}

// Opens the system share sheet (WhatsApp, Telegram, e-mail...) with the PDF.
export async function shareEstimatePdf(estimate: Estimate, meta: EstimateMeta) {
  const file = await writeEstimateFile(estimate, meta);
  await Sharing.shareAsync(file.uri, { dialogTitle: 'Отправить смету', mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  return file.fileName;
}

export async function saveEstimatePdf(estimate: Estimate, meta: EstimateMeta) {
  const file = await writeEstimateFile(estimate, meta);
  await mediaStoreDownloadsSaver(file.uri, file.fileName, 'application/pdf');
  return file.fileName;
}
