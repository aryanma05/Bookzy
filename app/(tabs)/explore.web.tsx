import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LogoMark } from '@/components/logo';
import { SalonCard } from '@/components/salon-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors, radius, shadows } from '@/constants/theme';
import { useLocation } from '@/context/LocationContext';
import { useSalons } from '@/context/SalonsContext';
import { distanceKm } from '@/lib/geo';
import { CATEGORIES } from '@/lib/salons';

const MAX_WIDTH = 1120;
const PADDING = 20;
const GAP = 16;

const STEPS: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }[] = [
  {
    icon: 'search-outline',
    title: 'Finn en salong',
    text: 'Søk på behandling eller sted, og se priser, anmeldelser og åpningstider.',
  },
  {
    icon: 'time-outline',
    title: 'Velg en ledig tid',
    text: 'Du ser bare tider som faktisk er ledige. Ingen meldinger frem og tilbake.',
  },
  {
    icon: 'checkmark-circle-outline',
    title: 'Ferdig',
    text: 'Timen er bekreftet med en gang, og du får påminnelse før du skal dit.',
  },
];

/** Forsiden på nettsiden. Appen bruker explore.tsx. */
export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { salons, loading, error, retry } = useSalons();
  const { coords } = useLocation();

  const pageWidth = Math.min(width, MAX_WIDTH) - PADDING * 2;
  const columns = width >= 1000 ? 4 : width >= 640 ? 2 : 1;
  const cardWidth = (pageWidth - GAP * (columns - 1)) / columns;
  const wide = width >= 760;

  const featured = (
    coords
      ? salons.filter((salon) => salon.location).sort((a, b) => distanceKm(coords, a.location!) - distanceKm(coords, b.location!))
      : [...salons].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount)
  ).slice(0, columns * 2);

  const search = (params: Record<string, string>) => router.navigate({ pathname: '/search', params });

  // I starten finnes det ingen eller bare noen få salonger. Da heter de ikke «populære»,
  // og uten salonger flyttes oppfordringen til bedrifter opp dit salongene ellers står.
  const empty = !loading && !error && salons.length === 0;
  const few = salons.length < 4;

  const pitch = (
    <View style={[styles.business, wide && styles.businessWide]}>
      <View style={[styles.businessText, wide && styles.flex]}>
        <Text variant="overline" color={colors.primary}>{empty ? 'Bookzy er nytt' : 'Bookzy for bedrifter'}</Text>
        <Text variant="title">{empty ? 'Bli en av de første salongene' : 'Driver du salong?'}</Text>
        <Text variant="body" color={colors.textSecondary}>
          {empty
            ? 'Vi har akkurat startet, og de første salongene er på vei. Få en egen bookingside med kalender og en lenke du kan legge i bioen. Det er gratis.'
            : 'Få en egen bookingside med kalender og en lenke du kan legge i bioen. Jobber du hjemmefra eller alene, er du i gang på noen minutter.'}
        </Text>
      </View>
      <Button title="Kom i gang" onPress={() => router.push('/business')} />
    </View>
  );

  return (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>
        <View style={styles.heroInner}>
          <Text variant="display" align="center" style={wide && styles.heroTitle}>
            Book time hos salonger nær deg
          </Text>
          <Text variant="body" align="center" color={colors.textSecondary} style={styles.heroText}>
            Frisør, barber, negler, massasje og hudpleie, også hjemmesalonger. Se ledige tider og book direkte.
          </Text>
          <PressableScale
            style={styles.search}
            scaleTo={0.99}
            onPress={() => search({ focus: String(Date.now()) })}
            accessibilityRole="search"
          >
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <Text variant="body" color={colors.textMuted}>Søk etter salong eller behandling</Text>
          </PressableScale>

          <View style={styles.categories}>
            {CATEGORIES.map((category) => (
              <PressableScale
                key={category.name}
                style={styles.category}
                scaleTo={0.94}
                onPress={() => search({ category: category.name })}
              >
                <Image source={{ uri: category.image }} style={styles.categoryImage} contentFit="cover" transition={200} />
                <Text variant="label" align="center">{category.name}</Text>
              </PressableScale>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.page}>
        {empty ? (
          pitch
        ) : (
          <View style={styles.section}>
            <SectionHeader
              title={coords ? 'I nærheten' : few ? 'Salonger på Bookzy' : 'Populære salonger'}
              actionLabel="Se alle"
              onAction={() => search(coords ? { sort: 'distance' } : { sort: 'rating' })}
            />
            {loading ? (
              <View style={styles.grid}>
                {Array.from({ length: columns }, (_, index) => (
                  <View key={index} style={{ width: cardWidth, gap: 10 }}>
                    <Skeleton height={cardWidth * 0.62} borderRadius={radius.lg} />
                    <Skeleton height={16} width="70%" />
                    <Skeleton height={12} width="45%" />
                  </View>
                ))}
              </View>
            ) : error && salons.length === 0 ? (
              <EmptyState
                icon="cloud-offline-outline"
                title="Kunne ikke laste salonger"
                message="Sjekk internettforbindelsen og prøv igjen."
                actionLabel="Prøv igjen"
                onAction={retry}
              />
            ) : (
              <View style={styles.grid}>
                {featured.map((salon) => (
                  <SalonCard key={salon.id} salon={salon} width={cardWidth} />
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <SectionHeader title="Slik fungerer det" />
          <View style={styles.grid}>
            {STEPS.map((step) => (
              <View key={step.title} style={[styles.step, { width: wide ? (pageWidth - GAP * 2) / 3 : pageWidth }]}>
                <View style={styles.stepIcon}>
                  <Ionicons name={step.icon} size={22} color={colors.primary} />
                </View>
                <Text variant="subheading" color={colors.ink}>{step.title}</Text>
                <Text variant="body" color={colors.textSecondary}>{step.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {!empty && pitch}
      </View>

      <View style={styles.footer}>
        <View style={[styles.footerInner, wide && styles.footerWide]}>
          <View style={styles.footerBrand}>
            <LogoMark height={20} />
            <Text variant="caption">© {new Date().getFullYear()} Bookzy</Text>
          </View>
          <View style={styles.footerLinks}>
            <Link href="/help"><Text variant="caption">Hjelp</Text></Link>
            <Link href="/business"><Text variant="caption">For bedrifter</Text></Link>
            <Link href="/privacy"><Text variant="caption">Personvern og vilkår</Text></Link>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: {
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  heroInner: {
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    paddingTop: 56,
    paddingBottom: 40,
  },
  heroTitle: { fontSize: 44, lineHeight: 52, letterSpacing: -1 },
  heroText: { marginTop: 12, maxWidth: 520 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'stretch',
    height: 56,
    marginTop: 28,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  categories: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 18, marginTop: 32 },
  category: { width: 76, alignItems: 'center', gap: 8 },
  categoryImage: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.divider },
  page: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', paddingTop: 40 },
  section: { marginBottom: 48 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: PADDING },
  step: { gap: 8, padding: 20, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  stepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 4,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  business: {
    gap: 20,
    marginHorizontal: PADDING,
    marginBottom: 56,
    padding: 28,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
  },
  businessWide: { flexDirection: 'row', alignItems: 'center', padding: 40 },
  businessText: { gap: 8 },
  flex: { flex: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.surface },
  footerInner: { width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center', gap: 16, padding: PADDING, paddingVertical: 28 },
  footerWide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerLinks: { flexDirection: 'row', gap: 24 },
});
