import { tokenStorage } from './token-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://splithub.ru/api/mobile.php';
const DEFAULT_TIMEOUT_MS = 15_000;

type ApiOptions = {
  timeoutMs?: number;
};

type ApiErrorData = {
  code: string;
  status?: number;
  [key: string]: unknown;
};

function makeApiError(code: string, data: Omit<ApiErrorData, 'code'> = {}) {
  return Object.assign(new Error(code), { data: { ...data, code } });
}

async function readResponseData(response: Response): Promise<Record<string, unknown>> {
  const text = typeof response.text === 'function' ? await response.text() : '';
  if (!text) return {};
  try {
    const data = JSON.parse(text);
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {
      code: response.status ? `HTTP_${response.status}` : 'INVALID_JSON_RESPONSE',
      ok: false,
      status: response.status,
    };
  }
}

export function buildHeaders(token?: string | null) {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function api<T>(
  action: string,
  init: RequestInit = {},
  query: Record<string, string> = {},
  options: ApiOptions = {},
): Promise<T> {
  const token = await tokenStorage.get();
  const params = new URLSearchParams({ action, ...query });
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const externalSignal = init.signal;
  const abortFromExternalSignal = () => controller.abort();

  if (externalSignal?.aborted) {
    controller.abort();
  } else {
    externalSignal?.addEventListener('abort', abortFromExternalSignal, { once: true });
  }

  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${API_URL}?${params}`, {
      ...init,
      signal: controller.signal,
      headers: { ...buildHeaders(token), ...init.headers },
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw makeApiError('REQUEST_TIMEOUT');
    }
    throw makeApiError('NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener('abort', abortFromExternalSignal);
  }

  const data = await readResponseData(response);
  if (!response.ok || data.ok === false) {
    const status = response.status || (typeof data.status === 'number' ? data.status : undefined);
    const code = response.status === 401
      ? 'SESSION_EXPIRED'
      : String(data.code ?? (status ? `HTTP_${status}` : 'REQUEST_FAILED'));
    if (code === 'SESSION_EXPIRED') {
      await tokenStorage.clear();
    }
    throw makeApiError(code, { ...data, status });
  }
  return data as T;
}
