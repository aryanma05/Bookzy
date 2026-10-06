import type { ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '@/constants/theme';
import { haptics } from '@/lib/haptics';

type IconName = keyof typeof Ionicons.glyphMap;
type TabIconProps = { color: ColorValue; focused: boolean };

function TabIcon({ color, focused, active, inactive }: TabIconProps & { active: IconName; inactive: IconName }) {
  return <Ionicons name={focused ? active : inactive} size={24} color={color} />;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // Uten safe area (web, eldre Android) havner etikettene ellers helt i kanten
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenListeners={{ tabPress: () => haptics.select() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 62 + bottomPadding,
          paddingTop: 6,
          paddingBottom: bottomPadding,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Hjem',
          tabBarIcon: (props: TabIconProps) => <TabIcon {...props} active="home" inactive="home-outline" />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Søk',
          tabBarIcon: (props: TabIconProps) => <TabIcon {...props} active="search" inactive="search-outline" />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Timer',
          tabBarIcon: (props: TabIconProps) => <TabIcon {...props} active="calendar" inactive="calendar-outline" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: (props: TabIconProps) => <TabIcon {...props} active="person" inactive="person-outline" />,
        }}
      />
    </Tabs>
  );
}
