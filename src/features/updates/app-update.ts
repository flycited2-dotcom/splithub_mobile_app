// Self-hosted update check for the sideloaded Android APK. The deploy script
// publishes version.json next to splithub.apk; no third-party update service
// (Expo services are partly blocked in Russia).
export const UPDATE_MANIFEST_URL = 'https://splithub.ru/app/version.json';

export type UpdateManifest = {
  versionCode: number;
  versionName: string;
  url: string;
  notes?: string;
  // Builds below this one must update (e.g. a breaking API change).
  minVersionCode: number;
};

export type UpdateStatus = 'none' | 'optional' | 'required';

const TRUSTED_APK_PREFIX = 'https://splithub.ru/';

export function parseUpdateManifest(raw: unknown): UpdateManifest | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (!Number.isInteger(data.versionCode) || typeof data.versionName !== 'string') return null;
  if (typeof data.url !== 'string' || !data.url.startsWith(TRUSTED_APK_PREFIX)) return null;
  return {
    versionCode: data.versionCode as number,
    versionName: data.versionName,
    url: data.url,
    ...(typeof data.notes === 'string' && data.notes.trim() ? { notes: data.notes.trim() } : {}),
    minVersionCode: Number.isInteger(data.minVersionCode) ? (data.minVersionCode as number) : 0,
  };
}

export function updateStatus(manifest: UpdateManifest, currentVersionCode: number): UpdateStatus {
  if (currentVersionCode >= manifest.versionCode) return 'none';
  return currentVersionCode < manifest.minVersionCode ? 'required' : 'optional';
}

type FetchLike = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

// Returns null when there is nothing to offer or the check failed; an update
// check must never break the app.
export async function checkForUpdate(
  currentVersionCode: number,
  fetchImpl: FetchLike = fetch,
): Promise<{ status: Exclude<UpdateStatus, 'none'>; manifest: UpdateManifest } | null> {
  try {
    const response = await fetchImpl(`${UPDATE_MANIFEST_URL}?t=${Date.now()}`);
    if (!response.ok) return null;
    const manifest = parseUpdateManifest(await response.json());
    if (!manifest) return null;
    const status = updateStatus(manifest, currentVersionCode);
    return status === 'none' ? null : { status, manifest };
  } catch {
    return null;
  }
}
