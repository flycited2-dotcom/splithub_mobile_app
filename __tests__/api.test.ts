import { api, buildHeaders } from '../src/lib/api';
import { tokenStorage } from '../src/lib/token-storage';

jest.mock('../src/lib/token-storage', () => ({
  tokenStorage: {
    clear: jest.fn(),
    get: jest.fn(),
  },
}));

const mockedTokenStorage = jest.mocked(tokenStorage);
const fetchMock = jest.fn();

beforeEach(() => {
  jest.useRealTimers();
  fetchMock.mockReset();
  mockedTokenStorage.get.mockResolvedValue(null);
  mockedTokenStorage.clear.mockResolvedValue(undefined);
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

test('adds bearer token when present', () => {
  expect(buildHeaders('secret')).toEqual({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: 'Bearer secret',
  });
});

test('maps non-json server responses to a stable api error', async () => {
  fetchMock.mockResolvedValue({
    ok: false,
    status: 502,
    text: () => Promise.resolve('<html>bad gateway</html>'),
  });

  await expect(api('orders')).rejects.toMatchObject({
    data: { code: 'HTTP_502', status: 502 },
    message: 'HTTP_502',
  });
});

test('clears the stored token when the server returns unauthorized', async () => {
  mockedTokenStorage.get.mockResolvedValue('expired-token');
  fetchMock.mockResolvedValue({
    ok: false,
    status: 401,
    text: () => Promise.resolve('{"ok":false,"code":"AUTH_REQUIRED"}'),
  });

  await expect(api('orders')).rejects.toMatchObject({
    data: { code: 'SESSION_EXPIRED', status: 401 },
  });
  expect(mockedTokenStorage.clear).toHaveBeenCalledTimes(1);
});

test('aborts a hanging request with a timeout error', async () => {
  jest.useFakeTimers();
  fetchMock.mockImplementation((_url: string, init: RequestInit) => (
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => {
        reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
      });
    })
  ));

  const request = api('orders', {}, {}, { timeoutMs: 50 });
  const assertion = expect(request).rejects.toMatchObject({
    data: { code: 'REQUEST_TIMEOUT' },
    message: 'REQUEST_TIMEOUT',
  });

  await jest.advanceTimersByTimeAsync(50);

  await assertion;
});
