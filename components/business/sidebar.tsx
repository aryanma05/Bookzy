import { Platform, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { PlatformPressable, useLinkBuilder } from 'expo-router/react-navigation';
import { LogoMark } from '@/components/logo';
import { SalonPhoto } from '@/components/salon-photo';
import { Text } from '@/components/ui/text';
import { colors, fonts, radius, shadows } from '@/constants/theme';
import { useBusiness } from '@/context/BusinessContext';

/** Menyen til venstre på PC og nettbrett på tvers: logoen øverst, fanene midt på og salongen nederst. */
export function Sidebar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const { buildHref } = useLinkBuilder();
  const { salon } = useBusiness();

  return (
    <View
      style={[
        styles.bar,
        { width: 232 + insets.left, paddingLeft: 16 + insets.left, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <View style={styles.brand}>
        <LogoMark height={24} />
        <Text style={styles.wordmark}>Bookzy</Text>
      </View>

      <View role="tablist" style={styles.nav}>
        {state.routes.map((route, index) => {
          const focused = index === state.index;
          const { options } = descriptors[route.key];

          return (
            <PlatformPressable
              key={route.key}
              href={buildHref(route.name, route.params)}
              // Som i standardmenyen: VoiceOver på iOS leser ikke «tab» riktig
              role={Platform.OS === 'ios' ? 'button' : 'tab'}
              aria-selected={focused}
              hoverEffect={{ color: colors.text }}
              style={[styles.item, focused && styles.itemActive]}
              onPress={() => {
                // tabPress-hendelsen gir haptikken i layouten, akkurat som bunnmenyen
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
              }}
            >
              <View style={[styles.icon, focused && styles.iconActive]}>
                {options.tabBarIcon?.({ focused, color: focused ? colors.surface : colors.primaryDark, size: 24 })}
              </View>
              <Text variant="bodyStrong" color={focused ? colors.ink : colors.textSecondary}>
                {options.title ?? route.name}
              </Text>
            </PlatformPressable>
          );
        })}
      </View>

      {salon && (
        <View style={styles.salon}>
          <SalonPhoto salon={salon} style={styles.photo} iconSize={18} />
          <View style={styles.salonText}>
            <Text variant="label" numberOfLines={1}>{salon.name}</Text>
            <Text variant="caption" numberOfLines={1}>{salon.category}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingRight: 16,
    backgroundColor: colors.surface,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  wordmark: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 24, letterSpacing: -0.4, color: colors.ink },
  nav: { flex: 1, justifyContent: 'center', gap: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 6, borderRadius: radius.md },
  itemActive: { backgroundColor: colors.background },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: { backgroundColor: colors.primary, ...shadows.button },
  salon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  photo: { width: 36, height: 36, borderRadius: radius.sm },
  salonText: { flex: 1 },
});
