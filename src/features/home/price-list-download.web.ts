import type { Product } from '../catalog/types';

export type PriceListFormat = 'pdf' | 'excel';

export type PriceListDownloadResult = {
  fileName: string;
  uri: string;
  savedToPhone: boolean;
};

// pdf-lib/@pdf-lib/fontkit target native only; web downloads go through the
// site instead, so this platform variant keeps the web bundle from crashing.
export async function downloadPriceList(
  _format: PriceListFormat,
  _products: Product[],
): Promise<PriceListDownloadResult> {
  throw new Error('Скачивание прайса доступно в мобильном приложении на Android и iOS.');
}

export function getPriceListDownloadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'Не удалось сохранить прайс. Попробуйте ещё раз.';
}
