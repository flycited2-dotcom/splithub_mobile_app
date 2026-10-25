import { checkForUpdate, parseUpdateManifest, updateStatus } from '../src/features/updates/app-update';

const manifest = {
  versionCode: 5,
  versionName: '1.2.0',
  url: 'https://splithub.ru/app/splithub.apk',
  notes: 'Каталог как на сайте',
};

test('accepts only a well-formed manifest that points to splithub.ru', () => {
  expect(parseUpdateManifest(manifest)).toEqual({ ...manifest, minVersionCode: 0 });
  expect(parseUpdateManifest({ ...manifest, minVersionCode: 4 })?.minVersionCode).toBe(4);
  expect(parseUpdateManifest({ ...manifest, url: 'https://evil.example/app.apk' })).toBeNull();
  expect(parseUpdateManifest({ ...manifest, url: 'http://splithub.ru/app/splithub.apk' })).toBeNull();
  expect(parseUpdateManifest({ ...manifest, versionCode: '5' })).toBeNull();
  expect(parseUpdateManifest(null)).toBeNull();
});

test('a newer build is optional, below the minimum it is required', () => {
  const parsed = parseUpdateManifest({ ...manifest, minVersionCode: 4 })!;
  expect(updateStatus(parsed, 5)).toBe('none');
  expect(updateStatus(parsed, 6)).toBe('none');
  expect(updateStatus(parsed, 4)).toBe('optional');
  expect(updateStatus(parsed, 3)).toBe('required');
});

test('fetches the manifest without cache and never throws', async () => {
  const fetchImpl = jest.fn().mockResolvedValue({ ok: true, json: async () => manifest });
  await expect(checkForUpdate(3, fetchImpl)).resolves.toEqual({
    status: 'optional',
    manifest: { ...manifest, minVersionCode: 0 },
  });
  expect(fetchImpl.mock.calls[0][0]).toMatch(/^https:\/\/splithub\.ru\/app\/version\.json\?t=\d+$/);

  await expect(checkForUpdate(3, jest.fn().mockRejectedValue(new Error('offline')))).resolves.toBeNull();
  await expect(checkForUpdate(3, jest.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))).resolves.toBeNull();
  await expect(checkForUpdate(5, fetchImpl)).resolves.toBeNull();
});
