import { stackScreenPadding, tabScreenPadding } from '../src/lib/safe-area';

describe('screen safe-area padding', () => {
  it('keeps tab screens below the status bar and above the tab bar', () => {
    expect(tabScreenPadding({ top: 28, bottom: 12 })).toEqual({
      paddingBottom: 108,
      paddingTop: 44,
    });
  });

  it('keeps stack screens above the Android navigation bar', () => {
    expect(stackScreenPadding({ top: 28, bottom: 12 })).toEqual({
      paddingBottom: 92,
    });
  });
});
