import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { api } from '../../lib/api';
import { tokenStorage } from '../../lib/token-storage';
import {
  defaultNotificationPreferences,
  ensureDeviceRegistered,
} from '../notifications/register-device';

export type User = {
  id: number;
  name: string;
  phone: string;
  telegram?: string;
  email?: string;
  role?: string;
  created_at?: string;
};

type SessionContextValue = {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (
    name: string,
    phone: string,
    password: string,
    telegram: string,
    email: string,
  ) => Promise<void>;
  requestPasswordReset: (identifier: string) => Promise<{ state: string; email_masked?: string }>;
  resetPassword: (identifier: string, code: string, password: string) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

async function registerSessionDevice() {
  try {
    await ensureDeviceRegistered(defaultNotificationPreferences);
  } catch {
    // Push is useful, but it must not block auth/session restore.
  }
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const token = await tokenStorage.get();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const result = await api<{ user: User }>('profile');
      setUser(result.user);
      void registerSessionDevice();
    } catch (error) {
      // Only a rejected token ends the session. A network failure (offline
      // launch, flaky connection) must not log the user out — keep the token
      // and retry when the app returns to the foreground.
      const code = (error as { data?: { code?: string } }).data?.code;
      if (code === 'SESSION_EXPIRED') {
        await tokenStorage.clear();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const wasInactive = appState.current !== 'active';
      appState.current = nextAppState;
      if (wasInactive && nextAppState === 'active') {
        void refreshProfile();
      }
    });
    return () => subscription.remove();
  }, [refreshProfile]);

  const value = useMemo<SessionContextValue>(
    () => ({
      user,
      loading,
      refreshProfile,
      login: async (phone, password) => {
        const result = await api<{ token: string; user: User }>('login', {
          method: 'POST',
          body: JSON.stringify({ phone, password }),
        });
        await tokenStorage.set(result.token);
        setUser(result.user);
        void registerSessionDevice();
      },
      register: async (name, phone, password, telegram, email) => {
        const result = await api<{ token: string; user: User }>('register', {
          method: 'POST',
          body: JSON.stringify({ name, phone, password, telegram, email }),
        });
        await tokenStorage.set(result.token);
        setUser(result.user);
        void registerSessionDevice();
      },
      requestPasswordReset: (identifier) =>
        api<{ state: string; email_masked?: string }>('request_password_reset', {
          method: 'POST',
          body: JSON.stringify({ identifier }),
        }),
      resetPassword: async (identifier, code, password) => {
        const result = await api<{ token: string; user: User }>('reset_password', {
          method: 'POST',
          body: JSON.stringify({ identifier, code, password }),
        });
        await tokenStorage.set(result.token);
        setUser(result.user);
        void registerSessionDevice();
      },
      updateEmail: async (email) => {
        await api('update_email', { method: 'POST', body: JSON.stringify({ email }) });
        await refreshProfile();
      },
      logout: async () => {
        try {
          await api('logout', { method: 'POST' });
        } finally {
          await tokenStorage.clear();
          setUser(null);
        }
      },
      deleteAccount: async () => {
        try {
          await api('delete_account', { method: 'POST' });
        } finally {
          await tokenStorage.clear();
          setUser(null);
        }
      },
    }),
    [loading, refreshProfile, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used inside SessionProvider');
  }
  return value;
}
