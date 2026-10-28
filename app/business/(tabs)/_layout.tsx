import { useEffect } from 'react';
import type { ColorValue } from 'react-native';
import { useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sidebar } from '@/components/business/sidebar';
import { colors, fonts } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { haptics } from '@/lib/haptics';
import { registerForPush } from '@/lib/push';

type IconName = keyof typeof Ionicons.glyphMap;
type TabIconProps = { color: ColorValue; focused: boolean };

function TabIcon({ color, focused, active, inactive }: TabIconProps & { active: IconName; inactive: IconName }) {
  return <Ionicons name={focused ? active : inactive} size={24} color={color} />;
}

export default function BusinessTabLayout() {
  const { user } = useAuth();
  const uid = user?.uid;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // På PC og nettbrett på tvers ligger menyen til venstre
  const sidebar = width >= 900;
  const bottomPadding = Math.max(insets.bottom, 8);

  // Salongen vil vite om nye bookinger med en gang, så vi spør om varsler første gang
  useEffect(() => {
    if (uid) registerForPush(uid, { ask: true });
  }, [uid]);

  return (
    <Tabs
      tabBar={sidebar ? (props) => <Sidebar {...props} /> : undefined}
      screenListeners={{ tabPress: () => haptics.select() }}
      screenOptions={{
        headerShown: false,
        tabBarPosition: sidebar ? 'left' : 'bottom',
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
        name="calendar"
        options={{
          title: 'Kalender',
          tabBarIcon: (props: TabIconProps) => <TabIcon {...props} active="calendar" inactive="calendar-outline" />,
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Tjenester',
          tabBarIcon: (props: TabIconProps) => <TabIcon {...props} active="pricetags" inactive="pricetags-outline" />,
        }}
      />
      <Tabs.Screen
        name="salon"
        options={{
          title: 'Salongen',
          tabBarIcon: (props: TabIconProps) => <TabIcon {...props} active="storefront" inactive="storefront-outline" />,
        }}
      />
      <Tabs.Screen
        name="bookzy"
        options={{
          title: 'Til Bookzy',
          tabBarIcon: (props: TabIconProps) => <TabIcon {...props} active="home" inactive="home-outline" />,
        }}
      />
    </Tabs>
  );
}
