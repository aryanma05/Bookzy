import { ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogoMark } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Text } from '@/components/ui/text';
import { colors, radius, shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';

const POINTS: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  {
    icon: 'home-outline',
    title: 'Laget for små bedrifter',
    text: 'Jobber du hjemmefra eller alene, er du i gang på noen minutter. Har du ansatte, legger du dem til etter hvert.',
  },
  {
    icon: 'calendar-outline',
    title: 'Kalender på mobil og PC',
    text: 'Se dagen og uka med kundens navn, telefonnummer og beskjed. Nye timer dukker opp med en gang.',
  },
  {
    icon: 'time-outline',
    title: 'Kundene booker selv',
    text: 'Ledige tider regnes ut fra åpningstidene, fridagene og varigheten på hver tjeneste. Ingen kan få samme tid.',
  },
  {
    icon: 'person-remove-outline',
    title: 'Oversikt over uteblivelser',
    text: 'Marker «møtte ikke», og se hvor mange ganger en kunde har vært hos deg før.',
  },
];

export default function BusinessStartScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { salon } = useBusiness();

  if (user && salon) {
    return <Redirect href="/business/calendar" />;
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}>
        <IconButton
          icon="close"
          variant="soft"
          size={38}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/explore'))}
          accessibilityLabel="Lukk"
          style={styles.close}
        />

        <View style={styles.hero}>
          <LogoMark height={48} />
          <Text variant="overline" color={colors.primary}>Timeflyt for bedrifter</Text>
          <Text variant="display" align="center">Ta imot bookinger uten meldinger frem og tilbake</Text>
          <Text variant="body" color={colors.textSecondary} align="center">
            For frisører, negleteknikere, barberer, massører og hudterapeuter – hjemme, i studio eller i salong.
          </Text>
        </View>

        <View style={styles.points}>
          {POINTS.map((point) => (
            <View key={point.title} style={styles.point}>
              <View style={styles.pointIcon}>
                <Ionicons name={point.icon} size={20} color={colors.primaryDark} />
              </View>
              <View style={styles.pointText}>
                <Text variant="bodyStrong">{point.title}</Text>
                <Text variant="caption">{point.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {user ? (
          <Button title="Registrer bedriften" icon="arrow-forward" onPress={() => router.push('/business/register')} />
        ) : (
          <View style={styles.signIn}>
            <Button title="Logg inn for å starte" onPress={() => router.push('/login')} />
            <Text variant="caption" align="center" color={colors.textMuted}>
              Du bruker samme konto som når du booker timer selv.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 24, gap: 28, width: '100%', maxWidth: 560, alignSelf: 'center' },
  close: { alignSelf: 'flex-end' },
  hero: { alignItems: 'center', gap: 10 },
  points: {
    gap: 18,
    padding: 18,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  point: { flexDirection: 'row', gap: 14 },
  pointIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: { flex: 1, gap: 2 },
  signIn: { gap: 10 },
});
