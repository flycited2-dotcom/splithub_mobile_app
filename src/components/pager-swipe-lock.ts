import { useMemo } from 'react';
import { useNavigation } from 'expo-router';

// The tab pager (ViewPager2) grabs horizontal drags before a nested horizontal
// ScrollView can, so swiping the filter chips flipped the whole page. Spread these
// handlers on such a list: page swiping is paused while a finger is on it.
export function usePagerSwipeLock() {
  const navigation = useNavigation();
  return useMemo(() => {
    const set = (swipeEnabled: boolean) => navigation.setOptions({ swipeEnabled } as never);
    return {
      onTouchStart: () => set(false),
      onTouchEnd: () => set(true),
      onTouchCancel: () => set(true),
      onMomentumScrollEnd: () => set(true),
    };
  }, [navigation]);
}
