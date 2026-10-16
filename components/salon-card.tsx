import { Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FavoriteButton } from '@/components/favorite-button';
import { SalonPhoto } from '@/components/salon-photo';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { colors, radius, shadows } from '@/constants/theme';
import { useLocation } from '@/context/LocationContext';
import { distanceKm, formatDistance } from '@/lib/geo';
import { formatPrice, formatRating, lowestPrice, type Salon } from '@/lib/salons';

// På web blir en knapp-rolle et <button>, og kortet inneholder allerede hjerteknappen
const cardRole = Platform.OS === 'web' ? undefined : 'button';

function useDistance(salon: Salon) {
  const { coords } = useLocation();
  if (!coords || !salon.location) return null;
  return formatDistance(distanceKm(coords, salon.location));
}

function RatingLine({ salon }: { salon: Salon }) {
  if (salon.rating === null) {
    return <Text variant="label" color={colors.primary}>Ny på Bookzy</Text>;
  }
  return (
    <View style={styles.ratingRow}>
      <Ionicons name="star" size={13} color={colors.star} />
      <Text variant="label" style={styles.ratingValue}>{formatRating(salon.rating)}</Text>
      <Text variant="caption" color={colors.textMuted}>({salon.reviewCount})</Text>
    </View>
  );
}

/** Kort til horisontale karuseller på forsiden. */
export function SalonCard({ salon, width = 240 }: { salon: Salon; width?: number }) {
  const router = useRouter();
  const distance = useDistance(salon);

  return (
    <PressableScale
      style={[styles.card, { width }]}
      onPress={() => router.push(`/salon/${salon.id}`)}
      accessibilityRole={cardRole}
      accessibilityLabel={salon.name}
    >
      <View>
        <SalonPhoto salon={salon} style={[styles.cardImage, { height: width * 0.62 }]} iconSize={36} />
        <View style={styles.favorite}>
          <FavoriteButton salonId={salon.id} size={34} />
        </View>
      </View>
      <View style={styles.cardBody}>
        <Text variant="subheading" numberOfLines={1} style={styles.name}>{salon.name}</Text>
        <RatingLine salon={salon} />
        <Text variant="caption" numberOfLines={1}>
          {[salon.category, salon.area, distance].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </PressableScale>
  );
}

/** Rad til lister (søk, favoritter). */
export function SalonRow({ salon }: { salon: Salon }) {
  const router = useRouter();
  const distance = useDistance(salon);
  const fromPrice = lowestPrice(salon);

  return (
    <PressableScale
      style={styles.row}
      scaleTo={0.98}
      onPress={() => router.push(`/salon/${salon.id}`)}
      accessibilityRole={cardRole}
      accessibilityLabel={salon.name}
    >
      <SalonPhoto salon={salon} style={styles.rowImage} />
      <View style={styles.rowBody}>
        <Text variant="subheading" numberOfLines={1} style={styles.name}>{salon.name}</Text>
        <RatingLine salon={salon} />
        <Text variant="caption" numberOfLines={1}>
          {[salon.category, salon.area, distance].filter(Boolean).join(' · ')}
        </Text>
        {fromPrice !== null && (
          <Text variant="caption" color={colors.text} style={styles.price}>Fra {formatPrice(fromPrice)}</Text>
        )}
      </View>
      <FavoriteButton salonId={salon.id} size={34} floating={false} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, ...shadows.card },
  cardImage: {
    width: '100%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.divider,
  },
  favorite: { position: 'absolute', top: 10, right: 10 },
  cardBody: { padding: 12, gap: 3 },
  name: { color: colors.ink },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingValue: { color: colors.ink },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadows.card,
  },
  rowImage: { width: 92, height: 92, borderRadius: radius.md, backgroundColor: colors.divider },
  rowBody: { flex: 1, gap: 3, paddingTop: 2 },
  price: { marginTop: 4 },
});
