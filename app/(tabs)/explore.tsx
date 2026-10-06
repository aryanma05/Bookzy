import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SalonCard, SalonRow } from '@/components/salon-card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SectionHeader } from '@/components/ui/section-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors, fonts, radius, shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBookings } from '@/context/BookingContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useLocation } from '@/context/LocationContext';
import { useSalons } from '@/context/SalonsContext';
import { useNow } from '@/hooks/use-now';
import { distanceKm } from '@/lib/geo';
import { CATEGORIES, type Salon } from '@/lib/salons';
import { formatDay } from '@/lib/schedule';

function greeting(now: Date) {
  const hour = now.getHours();
  if (hour < 5) return 'God natt';
  if (hour < 11) return 'God morgen';
  if (hour < 17) return 'God dag';
  return 'God kveld';
}

function Carousel({ title, salons, onSeeAll }: { title: string; salons: Salon[]; onSeeAll?: () => void }) {
  if (salons.length === 0) return null;
  return (
    <View style={styles.section}>
      <SectionHeader title={title} actionLabel={onSeeAll ? 'Se alle' : undefined} onAction={onSeeAll} />
      <FlatList
        horizontal
        data={salons}
        keyExtractor={(salon) => salon.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.carousel}
        renderItem={({ item }) => <SalonCard salon={item} width={236} />}
      />
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { user, displayName } = useAuth();
  const { salons, loading, error, retry } = useSalons();
  const { bookings } = useBookings();
  const { favoriteIds } = useFavorites();
  const { coords, status: locationStatus, requestLocation } = useLocation();

  const nextBooking = bookings.find(
    (booking) => booking.status === 'confirmed' && booking.endAt.getTime() > now.getTime()
  );

  const bookAgainIds = [
    ...new Set(
      bookings
        .filter((booking) => booking.endAt.getTime() <= now.getTime())
        .reverse()
        .map((booking) => booking.salonId)
    ),
  ];
  const bookAgain = bookAgainIds
    .map((id) => salons.find((salon) => salon.id === id))
    .filter((salon): salon is Salon => !!salon);

  const favorites = salons.filter((salon) => favoriteIds.has(salon.id));

  const topRated = salons
    .filter((salon) => salon.rating !== null && salon.reviewCount >= 20)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 8);

  const nearby = coords
    ? salons
        .filter((salon) => salon.location)
        .sort((a, b) => distanceKm(coords, a.location!) - distanceKm(coords, b.location!))
        .slice(0, 8)
    : [];

  const firstName = displayName.split(' ')[0];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerText}>
          <Text variant="caption" color={colors.textMuted}>
            {greeting(now)}{user && firstName ? `, ${firstName}` : ''}
          </Text>
          <Text variant="title">Hva vil du booke i dag?</Text>
        </View>
        {user ? (
          <Pressable onPress={() => router.navigate('/profile')} accessibilityLabel="Profil">
            <Avatar name={displayName || '?'} size={44} />
          </Pressable>
        ) : (
          <Button title="Logg inn" size="sm" variant="secondary" onPress={() => router.push('/login')} />
        )}
      </View>

      <PressableScale
        style={styles.search}
        scaleTo={0.98}
        onPress={() => router.navigate({ pathname: '/search', params: { focus: String(Date.now()) } })}
        accessibilityRole="search"
      >
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <Text variant="body" color={colors.textMuted}>Søk etter salong eller behandling</Text>
      </PressableScale>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        {CATEGORIES.map((category) => (
          <PressableScale
            key={category.name}
            style={styles.category}
            scaleTo={0.94}
            onPress={() => router.navigate({ pathname: '/search', params: { category: category.name } })}
          >
            <Image source={{ uri: category.image }} style={styles.categoryImage} contentFit="cover" transition={200} />
            <Text variant="label" align="center">{category.name}</Text>
          </PressableScale>
        ))}
      </ScrollView>

      {nextBooking && (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.nextWrap}>
          <PressableScale scaleTo={0.98} onPress={() => router.push(`/booking/${nextBooking.id}`)}>
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.nextCard}
            >
              <View style={styles.nextIcon}>
                <Ionicons name="calendar" size={22} color={colors.primary} />
              </View>
              <View style={styles.nextBody}>
                <Text style={styles.nextLabel}>Neste time</Text>
                <Text style={styles.nextTitle} numberOfLines={1}>
                  {nextBooking.serviceName} · {nextBooking.salonName}
                </Text>
                <Text style={styles.nextTime}>
                  {formatDay(nextBooking.startAt, now)} kl {nextBooking.time}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </PressableScale>
        </Animated.View>
      )}

      {loading ? (
        <View style={styles.section}>
          <SectionHeader title="Populære nå" />
          <View style={styles.skeletonRow}>
            {[0, 1].map((index) => (
              <View key={index} style={styles.skeletonCard}>
                <Skeleton height={146} borderRadius={radius.lg} />
                <Skeleton height={16} width="70%" />
                <Skeleton height={12} width="45%" />
              </View>
            ))}
          </View>
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
        <>
          <Carousel title="Book igjen" salons={bookAgain} />
          <Carousel title="Dine favoritter" salons={favorites} onSeeAll={() => router.push('/favorites')} />

          {coords ? (
            <Carousel
              title="I nærheten"
              salons={nearby}
              onSeeAll={() => router.navigate({ pathname: '/search', params: { sort: 'distance' } })}
            />
          ) : locationStatus !== 'denied' ? (
            <View style={styles.locationCard}>
              <View style={styles.locationIcon}>
                <Ionicons name="navigate" size={20} color={colors.primary} />
              </View>
              <View style={styles.locationText}>
                <Text variant="label">Se salonger i nærheten</Text>
                <Text variant="caption">Vi bruker posisjonen bare til å sortere etter avstand.</Text>
              </View>
              <Button
                title="Slå på"
                size="sm"
                variant="secondary"
                loading={locationStatus === 'loading'}
                onPress={requestLocation}
              />
            </View>
          ) : null}

          <Carousel title="Populære nå" salons={topRated} onSeeAll={() => router.navigate({ pathname: '/search', params: { sort: 'rating' } })} />

          <View style={styles.section}>
            <SectionHeader title="Alle salonger" />
            <View style={styles.list}>
              {salons.map((salon, index) => (
                <Animated.View key={salon.id} entering={FadeInDown.duration(350).delay(Math.min(index, 6) * 50)}>
                  <SalonRow salon={salon} />
                </Animated.View>
              ))}
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingBottom: 16 },
  headerText: { flex: 1, gap: 2 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  categories: { paddingHorizontal: 20, paddingVertical: 20, gap: 14 },
  category: { width: 72, alignItems: 'center', gap: 8 },
  categoryImage: { width: 68, height: 68, borderRadius: 34, backgroundColor: colors.divider },
  nextWrap: { paddingHorizontal: 20, marginBottom: 24 },
  nextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    ...shadows.button,
  },
  nextIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBody: { flex: 1, gap: 1 },
  nextLabel: { fontFamily: fonts.semibold, fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  nextTitle: { fontFamily: fonts.bold, fontSize: 16, color: '#FFFFFF' },
  nextTime: { fontFamily: fonts.medium, fontSize: 14, color: '#FFFFFF' },
  section: { marginBottom: 26 },
  carousel: { paddingHorizontal: 20, gap: 14, paddingBottom: 6 },
  list: { paddingHorizontal: 20, gap: 12 },
  skeletonRow: { flexDirection: 'row', gap: 14, paddingHorizontal: 20 },
  skeletonCard: { width: 236, gap: 10 },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 26,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: { flex: 1, gap: 2 },
});
