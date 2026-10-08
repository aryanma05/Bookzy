import type { ColorValue } from 'react-native';
import { useWindowDimensions } from 'react-native';
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

export default function BusinessTabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // På PC og nettbrett på tvers ligger menyen til venstre
  const sidebar = width >= 900;
  const bottomPadding = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenListeners={{ tabPress: () => haptics.select() }}
      screenOptions={{
        headerShown: false,
        tabBarPosition: sidebar ? 'left' : 'bottom',
        tabBarActiveTintColor: sidebar ? colors.primaryDark : colors.primary,
        tabBarInactiveTintColor: sidebar ? colors.textSecondary : colors.textMuted,
        tabBarActiveBackgroundColor: sidebar ? colors.primarySoft : undefined,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: sidebar ? 15 : 11, lineHeight: sidebar ? 20 : 15 },
        tabBarStyle: sidebar
          ? {
              backgroundColor: colors.surface,
              borderRightColor: colors.border,
              width: 232,
              minWidth: 232,
              paddingTop: insets.top + 20,
            }
          : {
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
    </Tabs>
  );
}
