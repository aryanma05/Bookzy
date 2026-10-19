import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Link, usePathname, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LogoMark } from '@/components/logo';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { colors, fonts } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

const LINKS: { href: Href; label: string; icon: keyof typeof Ionicons.glyphMap; wideOnly?: boolean }[] = [
  { href: '/search', label: 'Finn salong', icon: 'search-outline' },
  { href: '/bookings', label: 'Mine timer', icon: 'calendar-outline' },
  { href: '/business', label: 'For bedrifter', icon: 'storefront-outline', wideOnly: true },
];

/** Toppmenyen på nettsiden. Erstatter bunnmenyen i appen, med de samme adressene. */
export function WebHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const { user, displayName } = useAuth();
  // På smale skjermer vises bare ikoner, så menyen får plass på én linje
  const wide = width >= 760;

  return (
    <View style={styles.bar}>
      <View style={styles.inner}>
        <Link href="/explore" asChild>
          <Pressable style={styles.brand} accessibilityLabel="Bookzy, til forsiden">
            <LogoMark height={24} />
            <Text style={styles.wordmark}>Bookzy</Text>
          </Pressable>
        </Link>

        <View style={styles.nav}>
          {LINKS.filter((link) => wide || !link.wideOnly).map((link) => {
            const active = pathname.startsWith(String(link.href));
            return (
              <Link key={link.label} href={link.href} asChild>
                <Pressable style={wide ? styles.link : styles.iconLink} accessibilityLabel={link.label}>
                  {wide ? (
                    <Text variant="label" color={active ? colors.primaryDark : colors.textSecondary}>{link.label}</Text>
                  ) : (
                    <Ionicons name={link.icon} size={22} color={active ? colors.primary : colors.textSecondary} />
                  )}
                </Pressable>
              </Link>
            );
          })}

          {user ? (
            <Link href="/profile" asChild>
              <Pressable style={styles.avatar} accessibilityLabel="Profil">
                <Avatar name={displayName || '?'} size={36} />
              </Pressable>
            </Link>
          ) : (
            <Button title="Logg inn" size="sm" onPress={() => router.push('/login')} style={styles.login} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    height: 64,
    paddingHorizontal: 20,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wordmark: { fontFamily: fonts.semibold, fontSize: 20, lineHeight: 24, letterSpacing: -0.4, color: colors.ink },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  link: { paddingHorizontal: 12, paddingVertical: 8 },
  iconLink: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  avatar: { marginLeft: 8 },
  login: { marginLeft: 8 },
});
