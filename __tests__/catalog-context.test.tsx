import { act, render, waitFor } from '@testing-library/react-native';
import { AppState, type AppStateStatus, Text } from 'react-native';

import { CatalogProvider, useCatalog } from '../src/features/catalog/catalog-context';
import { loadCatalog } from '../src/features/catalog/catalog-repository';

jest.mock('../src/features/catalog/catalog-repository', () => ({
  loadCatalog: jest.fn(),
}));

const mockedLoadCatalog = jest.mocked(loadCatalog);

function Probe() {
  const { snapshot } = useCatalog();
  return <Text>{snapshot?.version ?? 'loading'}</Text>;
}

beforeEach(() => {
  mockedLoadCatalog.mockReset();
  mockedLoadCatalog.mockResolvedValue({
    offline: false,
    snapshot: { products: [], updated_at: '2026-06-22T00:00:00Z', version: 'current' },
  });
});

test('refreshes the catalog after the app returns to the foreground', async () => {
  let onAppStateChange: ((state: AppStateStatus) => void) | undefined;
  const remove = jest.fn();
  const addEventListener = jest.spyOn(AppState, 'addEventListener').mockImplementation((type, listener) => {
    if (type === 'change') {
      onAppStateChange = listener;
    }
    return { remove };
  });

  render(
    <CatalogProvider>
      <Probe />
    </CatalogProvider>,
  );

  await waitFor(() => {
    expect(mockedLoadCatalog).toHaveBeenCalledTimes(1);
  });
  expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

  act(() => {
    onAppStateChange?.('background');
    onAppStateChange?.('active');
  });

  await waitFor(() => {
    expect(mockedLoadCatalog).toHaveBeenCalledTimes(2);
  });

  addEventListener.mockRestore();
});
