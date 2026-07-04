import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { loadCatalog } from './catalog-repository';
import type { CatalogSnapshot } from './types';

const RETRY_INTERVAL_MS = 30_000;

type CatalogContextValue = {
  snapshot: CatalogSnapshot | null;
  loading: boolean;
  offline: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState<CatalogSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const appState = useRef(AppState.currentState);
  const inFlight = useRef(false);

  const load = useCallback(async (silent: boolean) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const result = await loadCatalog();
      setSnapshot(result.snapshot);
      setOffline(result.offline);
      if (!result.offline) setError(null);
    } catch {
      setError('Не удалось загрузить каталог. Проверьте интернет (VPN может мешать)');
    } finally {
      inFlight.current = false;
      if (!silent) setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => load(false), [load]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasInactive = appState.current !== 'active';
      appState.current = nextAppState;
      if (wasInactive && nextAppState === 'active') {
        void refresh();
      }
    });
    return () => subscription.remove();
  }, [refresh]);

  // While the catalog is missing or served from cache, quietly retry in the
  // background so the data recovers as soon as the connection comes back
  // (without flashing the pull-to-refresh spinner every attempt).
  useEffect(() => {
    if (!error && !offline) return;
    const interval = setInterval(() => {
      void load(true);
    }, RETRY_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [error, offline, load]);

  const value = useMemo(
    () => ({ snapshot, loading, offline, error, refresh }),
    [snapshot, loading, offline, error, refresh],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) {
    throw new Error('useCatalog must be used inside CatalogProvider');
  }
  return value;
}
