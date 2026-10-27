import { TopTabs } from 'expo-router/js-top-tabs';

import { PagerTabBar } from '../../components/pager-tab-bar';

// Swipeable pages (native pager): swipe left/right moves between neighbouring tabs.
// Horizontal lists inside a page (filter chips, photos) scroll first.
export default function TabLayout() {
  return (
    <TopTabs
      backBehavior="initialRoute"
      initialRouteName="index"
      screenOptions={{ lazy: true, swipeEnabled: true }}
      tabBar={(props: React.ComponentProps<typeof PagerTabBar>) => <PagerTabBar {...props} />}
      tabBarPosition="bottom">
      <TopTabs.Screen name="catalog" />
      <TopTabs.Screen name="index" />
      <TopTabs.Screen name="cart" />
      <TopTabs.Screen name="orders" />
      <TopTabs.Screen name="profile" />
    </TopTabs>
  );
}
