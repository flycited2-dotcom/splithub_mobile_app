import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { api } from '../src/lib/api';
import { tokenStorage } from '../src/lib/token-storage';
import {
  defaultNotificationPreferences,
  ensureDeviceRegistered,
} from '../src/features/notifications/register-device';
import { SessionProvider, useSession } from '../src/features/session/session-context';

jest.mock('../src/lib/api', () => ({
  api: jest.fn(),
}));

jest.mock('../src/lib/token-storage', () => ({
  tokenStorage: {
    clear: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('../src/features/notifications/register-device', () => ({
  defaultNotificationPreferences: {
    manager_messages_enabled: true,
    order_status_enabled: true,
    promotions_enabled: true,
  },
  ensureDeviceRegistered: jest.fn(),
}));

const mockedApi = jest.mocked(api);
const mockedTokenStorage = jest.mocked(tokenStorage);
const mockedEnsureDeviceRegistered = jest.mocked(ensureDeviceRegistered);

function Probe() {
  const { user } = useSession();
  return <Text>{user?.name ?? 'guest'}</Text>;
}

beforeEach(() => {
  mockedApi.mockReset();
  mockedTokenStorage.clear.mockResolvedValue(undefined);
  mockedTokenStorage.get.mockResolvedValue('saved-token');
  mockedTokenStorage.set.mockResolvedValue(undefined);
  mockedEnsureDeviceRegistered.mockResolvedValue('ExponentPushToken[test]');
});

test('registers the device for push after restoring a signed-in session', async () => {
  mockedApi.mockResolvedValue({
    user: { id: 7, name: 'Test_mob', phone: '79781234567' },
  });

  render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );

  await waitFor(() => {
    expect(mockedEnsureDeviceRegistered).toHaveBeenCalledWith(defaultNotificationPreferences);
  });
});
