import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FavoriteButton } from '@/components/favorite-button';
import { RatingSummary, ReviewItem } from '@/components/review-item';
import { SalonPhoto } from '@/components/salon-photo';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { IconButton } from '@/components/ui/icon-button';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { Stars } from '@/components/ui/stars';
import { Text } from '@/components/ui/text';
import { WebHeader } from '@/components/web-header';
import { colors, fonts, radius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useLocation } from '@/context/LocationContext';
import { useSalons } from '@/context/SalonsContext';
import { useNow } from '@/hooks/use-now';
import { useSalonReviews } from '@/hooks/use-salon-reviews';
import { distanceKm, formatDistance } from '@/lib/geo';
import { callSalon, openDirections, shareSalon } from '@/lib/links';
import type { Review } from '@/lib/reviews';
import {
  formatCancellationPolicy,
  formatDuration,
  formatPrice,
  formatRating,
  displayAddress,
  groupServices,
  type Salon,
} from '@/lib/salons';
import { capitalize, openStatus, WEEK, weekdayKey } from '@/lib/schedule';

const IMAGE_HEIGHT = 300;

type Tab = 'services' | 'reviews' | 'about';

export default function SalonScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { getSalon, loading } = useSalons();
  const salon = id ? getSalon(id) : undefined;
  // Upubliserte sider ser bare eieren, så den kan se over siden før den publiseres
  const hidden = !!salon && !salon.published && salon.ownerId !== user?.uid;

  if (loading) {
    return (
      <View style={styles.screen}>
        <Skeleton height={IMAGE_HEIGHT} borderRadius={0} />
        <View style={styles.loadingBody}>
          <Skeleton height={28} width="60%" />
          <Skeleton height={16} width="40%" />
          <Skeleton height={16} width="80%" />
        </View>
      </View>
    );
  }

  if (!salon || hidden) {
    return (
      <View style={[styles.screen, styles.center]}>
        <EmptyState
          icon="storefront-outline"
          title={hidden ? 'Salongen tar ikke imot bookinger her ennå' : 'Fant ikke salongen'}
          message={hidden ? 'Prøv igjen senere, eller kontakt salongen direkte.' : 'Den kan ha blitt fjernet, eller lenken er feil.'}
          actionLabel="Til forsiden"
          onAction={() => router.replace('/explore')}
        />
      </View>
    );
  }

  // Eieren kommer hit fra «Se siden slik kundene ser den» og skal tilbake til bedriftsmodus
  const owner = !!user && salon.ownerId === user.uid;

  // På PC viser nettsiden alt på én bred side i stedet for faner
  if (Platform.OS === 'web' && width >= 900) {
    return <SalonPage salon={salon} owner={owner} />;
  }

  return <SalonDetails salon={salon} owner={owner} />;
}

function useGoBack(owner: boolean) {
  const router = useRouter();
  return () => (router.canGoBack() ? router.back() : router.replace(owner ? '/business/salon' : '/explore'));
}

function SalonDetails({ salon, owner }: { salon: Salon; owner: boolean }) {
  const goBack = useGoBack(owner);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { reviews, loading: reviewsLoading } = useSalonReviews(salon.id, salon.reviewCount);

  const [tab, setTab] = useState<Tab>('services');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const scrollY = useSharedValue(0);
  const headerHeight = insets.top + 56;
  const fadeStart = IMAGE_HEIGHT - headerHeight - 60;
  const fadeEnd = IMAGE_HEIGHT - headerHeight;

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });

  useAnimatedReaction(
    () => scrollY.get() > fadeEnd,
    (current, previous) => {
      if (current !== previous) scheduleOnRN(setScrolled, current);
    }
  );

  const headerStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(scrollY.get(), [fadeStart, fadeEnd], ['rgba(255,255,255,0)', 'rgba(255,255,255,1)']),
    borderBottomColor: interpolateColor(scrollY.get(), [fadeStart, fadeEnd], ['rgba(227,232,238,0)', colors.border]),
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.get(), [fadeEnd - 10, fadeEnd + 20], [0, 1], Extrapolation.CLAMP),
  }));

  // Bildet strekkes når man drar ned, og glir saktere opp enn innholdet
  const imageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.get(), [-IMAGE_HEIGHT, 0, IMAGE_HEIGHT], [-IMAGE_HEIGHT / 2, 0, IMAGE_HEIGHT * 0.4]) },
      { scale: interpolate(scrollY.get(), [-IMAGE_HEIGHT, 0], [2, 1], Extrapolation.CLAMP) },
    ],
  }));

  const photos = salon.photos;

  return (
    <View style={styles.screen}>
      <StatusBar style={scrolled ? 'dark' : 'light'} />

      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.gallery, imageStyle]}>
          {photos.length > 0 ? (
            <Pressable onPress={() => setGalleryOpen(true)} accessibilityRole="button" accessibilityLabel="Se bildene">
              <Image source={{ uri: photos[0] }} style={{ width, height: IMAGE_HEIGHT }} contentFit="cover" transition={250} />
            </Pressable>
          ) : (
            <SalonPhoto salon={salon} style={{ width, height: IMAGE_HEIGHT }} iconSize={64} />
          )}
          {/* Over kanten av innholdet, som ligger litt inn over bildet */}
          {photos.length > 1 && <AllPhotosButton count={photos.length} bottom={36} onPress={() => setGalleryOpen(true)} />}
        </Animated.View>

        <View style={styles.body}>
          <SalonIntro salon={salon} onRatingPress={() => setTab('reviews')} />

          <SegmentedControl
            options={[
              { value: 'services', label: 'Tjenester' },
              { value: 'reviews', label: 'Anmeldelser' },
              { value: 'about', label: 'Om' },
            ]}
            value={tab}
            onChange={setTab}
          />

          <View style={styles.tabContent}>
            {tab === 'services' && <ServiceList salon={salon} />}
            {tab === 'reviews' && <ReviewList salon={salon} reviews={reviews} loading={reviewsLoading} />}
            {tab === 'about' && <AboutSalon salon={salon} />}
          </View>
        </View>
      </Animated.ScrollView>

      <Animated.View style={[styles.header, { paddingTop: insets.top + 8, height: headerHeight }, headerStyle]}>
        <IconButton icon="chevron-back" accessibilityLabel={owner ? 'Tilbake til salongen' : 'Tilbake'} onPress={goBack} />
        <Animated.View style={[styles.headerTitle, titleStyle]}>
          <Text variant="subheading" numberOfLines={1} align="center" style={styles.headerTitleText}>{salon.name}</Text>
        </Animated.View>
        <View style={styles.headerActions}>
          <IconButton icon="share-outline" accessibilityLabel="Del" onPress={() => shareSalon(salon)} />
          <FavoriteButton salonId={salon.id} size={40} />
        </View>
      </Animated.View>

      <PhotoGallery photos={photos} visible={galleryOpen} onClose={() => setGalleryOpen(false)} />
    </View>
  );
}

/** Salongsiden på PC: bilder øverst, tjenester og anmeldelser til venstre, info til høyre. */
function SalonPage({ salon, owner }: { salon: Salon; owner: boolean }) {
  const goBack = useGoBack(owner);
  const { reviews, loading: reviewsLoading } = useSalonReviews(salon.id, salon.reviewCount);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const photos = salon.photos;

  return (
    <View style={styles.page}>
      <WebHeader />
      <ScrollView>
        <View style={styles.pageInner}>
          {owner && (
            <Button
              title="Tilbake til salongen"
              variant="ghost"
              size="sm"
              icon="chevron-back"
              onPress={goBack}
              style={styles.pageBack}
            />
          )}
          <View style={styles.cover}>
            {photos.length === 0 ? (
              <SalonPhoto salon={salon} style={styles.photoMain} iconSize={64} />
            ) : (
              <Pressable style={styles.photoMain} onPress={() => setGalleryOpen(true)} accessibilityRole="button" accessibilityLabel="Se bildene">
                <Image source={{ uri: photos[0] }} style={styles.photoFill} contentFit="cover" transition={250} />
              </Pressable>
            )}
            {photos.length > 1 && <AllPhotosButton count={photos.length} bottom={16} onPress={() => setGalleryOpen(true)} />}
            <View style={styles.photoFavorite}>
              <FavoriteButton salonId={salon.id} size={40} />
            </View>
          </View>

          <View style={styles.columns}>
            <View style={styles.mainColumn}>
              <SalonIntro salon={salon} />
              <Text variant="title" style={styles.pageHeading}>Tjenester</Text>
              <ServiceList salon={salon} />
              <Text variant="title" style={styles.pageHeading}>Anmeldelser</Text>
              <ReviewList salon={salon} reviews={reviews} loading={reviewsLoading} />
            </View>
            <View style={styles.aside}>
              <AboutSalon salon={salon} />
            </View>
          </View>
        </View>
      </ScrollView>

      <PhotoGallery photos={photos} visible={galleryOpen} onClose={() => setGalleryOpen(false)} />
    </View>
  );
}

function AllPhotosButton({ count, bottom, onPress }: { count: number; bottom: number; onPress: () => void }) {
  return (
    <PressableScale style={[styles.allPhotos, { bottom }]} onPress={onPress} accessibilityRole="button">
      <Ionicons name="images-outline" size={15} color="#FFFFFF" />
      <Text style={styles.allPhotosText}>Se alle {count} bilder</Text>
    </PressableScale>
  );
}

/** Alle bildene salongen har lagt inn, under hverandre og uten å kutte noe. */
function PhotoGallery({ photos, visible, onClose }: { photos: string[]; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  // Formen på hvert bilde, så det vises helt. Er ikke bildet lastet ennå, gjetter vi liggende.
  const [ratios, setRatios] = useState<Record<string, number>>({});

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.galleryScreen, { paddingTop: insets.top }]}>
        <View style={styles.galleryHeader}>
          <Text variant="subheading" color="#FFFFFF">{photos.length === 1 ? '1 bilde' : `${photos.length} bilder`}</Text>
          <IconButton icon="close" accessibilityLabel="Lukk bildene" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={[styles.galleryList, { paddingBottom: insets.bottom + 24 }]}>
          {photos.map((uri) => (
            <Image
              key={uri}
              source={{ uri }}
              style={[styles.galleryPhoto, { aspectRatio: ratios[uri] ?? 4 / 3 }]}
              contentFit="contain"
              transition={200}
              onLoad={({ source }) => {
                if (source.width > 0 && source.height > 0) setRatios((current) => ({ ...current, [uri]: source.width / source.height }));
              }}
            />
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

function SalonIntro({ salon, onRatingPress }: { salon: Salon; onRatingPress?: () => void }) {
  const now = useNow();
  const { coords } = useLocation();
  const status = openStatus(salon.openingHours, now, salon.closedDates);
  const distance = coords && salon.location ? formatDistance(distanceKm(coords, salon.location)) : null;

  return (
    <>
      <Text variant="overline" color={colors.primary}>
        {salon.locationType === 'home' ? `${salon.category} · Hjemmesalong` : salon.category}
      </Text>
      <Text variant="title" style={styles.name}>{salon.name}</Text>
      {salon.description ? (
        <Text variant="body" color={colors.textSecondary} style={styles.description}>{salon.description}</Text>
      ) : null}

      <PressableScale scaleTo={0.98} style={styles.metaRow} onPress={onRatingPress} disabled={!onRatingPress}>
        {salon.rating !== null ? (
          <>
            <Stars rating={salon.rating} size={15} />
            <Text variant="label">{formatRating(salon.rating)}</Text>
            <Text variant="caption" color={colors.textMuted}>({salon.reviewCount} anmeldelser)</Text>
          </>
        ) : (
          <Text variant="label" color={colors.primary}>Ny på Bookzy</Text>
        )}
      </PressableScale>

      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={16} color={colors.textMuted} />
        <Text variant="caption" style={styles.metaText}>
          {displayAddress(salon)}{distance ? ` · ${distance}` : ''}
        </Text>
      </View>
      {salon.flexibleHours ? (
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
          <Text variant="caption">Fleksible tider</Text>
        </View>
      ) : (
        <View style={styles.metaRow}>
          <View style={[styles.statusDot, { backgroundColor: status.isOpen ? colors.success : colors.textMuted }]} />
          <Text variant="caption" color={status.isOpen ? colors.success : colors.textSecondary}>{status.text}</Text>
        </View>
      )}

      <View style={styles.actions}>
        {salon.phone && <QuickAction icon="call-outline" label="Ring" onPress={() => callSalon(salon)} />}
        {salon.address ? (
          <QuickAction icon="navigate-outline" label="Veibeskrivelse" onPress={() => openDirections(salon.address)} />
        ) : null}
        <QuickAction icon="share-outline" label="Del" onPress={() => shareSalon(salon)} />
      </View>
    </>
  );
}

function ServiceList({ salon }: { salon: Salon }) {
  const router = useRouter();
  const [category, setCategory] = useState<string | null>(null);
  const book = (serviceId: string) => router.push({ pathname: '/book/[salonId]', params: { salonId: salon.id, serviceId } });

  // Tilleggene bookes ikke alene. Kunden velger dem etter at tjenesten er valgt.
  const services = salon.services.filter((service) => !service.addOn);
  const addOns = salon.services.filter((service) => service.addOn);

  if (services.length === 0) {
    return <EmptyState icon="list-outline" title="Ingen tjenester ennå" message="Salongen har ikke lagt inn tjenester." />;
  }

  const groups = groupServices(services);
  // Som meny vises én gruppe om gangen, så der er alltid én valgt
  const menu = salon.serviceMenu && groups.length > 1;
  // Kategorien kan forsvinne hvis salongen endrer tjenestene mens siden er åpen
  const selected = groups.some((group) => group.category === category) ? category : menu ? groups[0].category : null;

  return (
    <>
      {menu ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.menu} contentContainerStyle={styles.menuTabs}>
          {groups.map((group) => (
            <Chip
              key={group.category}
              label={capitalize(group.category)}
              selected={group.category === selected}
              onPress={() => setCategory(group.category)}
            />
          ))}
        </ScrollView>
      ) : (
        groups.length > 1 && (
          <View style={styles.categoryChips}>
            {groups.map((group) => (
              <Chip
                key={group.category}
                label={capitalize(group.category)}
                selected={group.category === selected}
                onPress={() => setCategory(group.category === selected ? null : group.category)}
              />
            ))}
          </View>
        )
      )}
      {groups.filter((group) => !selected || group.category === selected).map((group) => (
        <View key={group.category} style={styles.serviceGroup}>
          {!menu && <Text variant="heading">{capitalize(group.category)}</Text>}
          <View style={styles.serviceCard}>
            {group.services.map((service, index) => {
              const divider = index < group.services.length - 1 && styles.serviceDivider;
              // Menyen er kompakt: hele raden er knappen
              return menu ? (
                <Pressable
                  key={service.id}
                  onPress={() => book(service.id)}
                  style={({ pressed }) => [styles.service, divider, pressed && styles.servicePressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Book ${service.name}, ${formatDuration(service.durationMin)}, ${formatPrice(service.priceNok)}`}
                >
                  <View style={styles.serviceText}>
                    <Text variant="bodyStrong">{service.name}</Text>
                    {service.description ? <Text variant="caption" numberOfLines={2}>{service.description}</Text> : null}
                    <Text variant="caption" color={colors.textMuted}>{formatDuration(service.durationMin)}</Text>
                  </View>
                  <Text variant="label">{formatPrice(service.priceNok)}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              ) : (
                <View key={service.id} style={[styles.service, divider]}>
                  {service.imageUrl ? (
                    <Image source={{ uri: service.imageUrl }} style={styles.serviceImage} contentFit="cover" transition={200} />
                  ) : null}
                  <View style={styles.serviceText}>
                    <Text variant="bodyStrong">{service.name}</Text>
                    {service.description ? <Text variant="caption">{service.description}</Text> : null}
                    <Text variant="caption" color={colors.textMuted}>
                      {formatDuration(service.durationMin)} · {formatPrice(service.priceNok)}
                    </Text>
                  </View>
                  <Button title="Book" size="sm" onPress={() => book(service.id)} />
                </View>
              );
            })}
          </View>
        </View>
      ))}
      {addOns.length > 0 && (
        <View style={styles.serviceGroup}>
          <Text variant="heading">Tillegg</Text>
          <Text variant="caption">Kan legges til når du booker en tjeneste.</Text>
          <View style={styles.serviceCard}>
            {addOns.map((addOn, index) => (
              <View key={addOn.id} style={[styles.service, index < addOns.length - 1 && styles.serviceDivider]}>
                <View style={styles.serviceText}>
                  <Text variant="bodyStrong">{addOn.name}</Text>
                  {addOn.description ? <Text variant="caption">{addOn.description}</Text> : null}
                  {addOn.durationMin > 0 && (
                    <Text variant="caption" color={colors.textMuted}>+{formatDuration(addOn.durationMin)}</Text>
                  )}
                </View>
                <Text variant="label">+{formatPrice(addOn.priceNok)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </>
  );
}

function ReviewList({ salon, reviews, loading }: { salon: Salon; reviews: Review[]; loading: boolean }) {
  return (
    <>
      {salon.rating !== null && (
        <RatingSummary rating={salon.rating} count={salon.reviewCount} reviews={reviews} />
      )}
      {loading ? (
        <View style={styles.reviewSkeletons}>
          <Skeleton height={70} />
          <Skeleton height={70} />
        </View>
      ) : reviews.length === 0 ? (
        <EmptyState icon="chatbubble-ellipses-outline" title="Ingen anmeldelser ennå" message="Bli den første som anmelder etter timen din." />
      ) : (
        reviews.map((review, index) => (
          <ReviewItem key={review.id} review={review} last={index === reviews.length - 1} />
        ))
      )}
    </>
  );
}

function AboutSalon({ salon }: { salon: Salon }) {
  const today = weekdayKey(useNow());

  return (
    <View style={styles.about}>
      <View style={styles.aboutBlock}>
        <Text variant="subheading">{salon.flexibleHours ? 'Tider' : 'Åpningstider'}</Text>
        {salon.flexibleHours && (
          <Text variant="body" color={colors.textSecondary}>Ingen faste åpningstider. Du ser de ledige timene når du booker.</Text>
        )}
        {!salon.flexibleHours && WEEK.map(({ key, label }) => {
          const hours = salon.openingHours[key];
          const isToday = key === today;
          return (
            <View key={key} style={styles.hoursRow}>
              <Text variant={isToday ? 'bodyStrong' : 'body'}>{label}</Text>
              <View style={styles.hoursValue}>
                <Text variant={isToday ? 'bodyStrong' : 'body'} color={hours ? undefined : colors.textMuted}>
                  {hours ? `${hours.open}–${hours.close}` : 'Stengt'}
                </Text>
                {hours?.breaks?.map((pause) => (
                  <Text key={pause.start} variant="caption">Pause {pause.start}–{pause.end}</Text>
                ))}
              </View>
            </View>
          );
        })}
      </View>

      {salon.staff.length > 0 && (
        <View style={styles.aboutBlock}>
          <Text variant="subheading">Ansatte</Text>
          {salon.staff.map((member) => (
            <View key={member.id} style={styles.staffRow}>
              <Avatar name={member.name} size={40} />
              <View>
                <Text variant="bodyStrong">{member.name}</Text>
                {member.title ? <Text variant="caption">{member.title}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.aboutBlock}>
        <Text variant="subheading">Avbestilling</Text>
        <Text variant="body" color={colors.textSecondary}>{formatCancellationPolicy(salon.cancellationHours)}</Text>
      </View>

      <View style={styles.aboutBlock}>
        <Text variant="subheading">Adresse</Text>
        {salon.address ? (
          <>
            <Text variant="body" color={colors.textSecondary}>{salon.address}</Text>
            <Button title="Vis i kart" variant="outline" size="md" icon="map-outline" onPress={() => openDirections(salon.address)} />
          </>
        ) : (
          <Text variant="body" color={colors.textSecondary}>
            {salon.area}.{' '}
            {salon.requiresApproval
              ? 'Du får adressen når timen er godkjent.'
              : `Dette er en hjemmesalong – du får nøyaktig adresse av ${salon.name}.`}
          </Text>
        )}
      </View>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <PressableScale style={styles.quickAction} onPress={onPress} accessibilityRole="button">
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={20} color={colors.primaryDark} />
      </View>
      <Text variant="caption" color={colors.text}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  center: { justifyContent: 'center' },
  loadingBody: { padding: 20, gap: 12 },
  gallery: { height: IMAGE_HEIGHT, backgroundColor: colors.divider },
  allPhotos: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(14, 26, 43, 0.6)',
  },
  allPhotosText: { fontFamily: fonts.semibold, fontSize: 13, color: '#FFFFFF' },
  galleryScreen: { flex: 1, backgroundColor: colors.ink },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  galleryList: { gap: 12, paddingHorizontal: 12, width: '100%', maxWidth: 760, alignSelf: 'center' },
  galleryPhoto: { width: '100%' },
  body: {
    marginTop: -22,
    paddingTop: 22,
    paddingHorizontal: 20,
    paddingBottom: 48,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    gap: 6,
  },
  name: { marginBottom: 4 },
  description: { marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  metaText: { flexShrink: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 20 },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContent: { marginTop: 18 },
  categoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  // Til kanten av skjermen, så det synes at menyen kan skrolles sidelengs
  menu: { flexGrow: 0, marginHorizontal: -20, marginBottom: 16 },
  menuTabs: { gap: 8, paddingHorizontal: 20 },
  servicePressed: { opacity: 0.6 },
  serviceGroup: { marginBottom: 24, gap: 10 },
  serviceCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 16 },
  service: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  serviceDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  serviceText: { flex: 1, gap: 2 },
  serviceImage: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.divider },
  reviewSkeletons: { gap: 12, marginTop: 12 },
  about: { gap: 24 },
  aboutBlock: { gap: 10 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between' },
  hoursValue: { alignItems: 'flex-end' },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { flex: 1, paddingHorizontal: 10 },
  headerTitleText: { color: colors.ink },
  headerActions: { flexDirection: 'row', gap: 10 },
  page: { flex: 1, backgroundColor: colors.surface },
  pageInner: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 64 },
  pageBack: { alignSelf: 'flex-start', marginBottom: 12, marginLeft: -12 },
  cover: { height: 400, borderRadius: radius.xl, overflow: 'hidden' },
  photoMain: { flex: 1, backgroundColor: colors.divider },
  photoFill: { width: '100%', height: '100%' },
  photoFavorite: { position: 'absolute', top: 16, right: 16 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 48, marginTop: 32 },
  mainColumn: { flex: 1, gap: 6 },
  pageHeading: { marginTop: 12, marginBottom: 4 },
  aside: {
    width: 360,
    padding: 24,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
