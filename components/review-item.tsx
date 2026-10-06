import { StyleSheet, View } from 'react-native';
import { Avatar } from '@/components/ui/avatar';
import { Stars } from '@/components/ui/stars';
import { Text } from '@/components/ui/text';
import { colors, fonts } from '@/constants/theme';
import type { Review } from '@/lib/reviews';
import { formatFullDate } from '@/lib/schedule';

export function ReviewItem({ review, last = false }: { review: Review; last?: boolean }) {
  return (
    <View style={[styles.item, !last && styles.divider]}>
      <View style={styles.header}>
        <Avatar name={review.authorName} size={38} />
        <View style={styles.headerText}>
          <Text variant="label">{review.authorName}</Text>
          <Text variant="caption" color={colors.textMuted}>{formatFullDate(review.createdAt)}</Text>
        </View>
        <Stars rating={review.rating} size={13} />
      </View>
      {review.comment ? <Text variant="body" style={styles.comment}>{review.comment}</Text> : null}
      {review.serviceName ? <Text variant="caption" color={colors.textMuted}>{review.serviceName}</Text> : null}
    </View>
  );
}

export function RatingSummary({ rating, count, reviews }: { rating: number; count: number; reviews: Review[] }) {
  // Fordelingen regnes ut fra anmeldelsene som er lastet, snittet fra salongens totaltall
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    share: reviews.length ? reviews.filter((review) => review.rating === stars).length / reviews.length : 0,
  }));

  return (
    <View style={styles.summary}>
      <View style={styles.average}>
        <Text style={styles.averageValue}>{rating.toFixed(1).replace('.', ',')}</Text>
        <Stars rating={rating} size={15} />
        <Text variant="caption" color={colors.textMuted} style={styles.count}>
          {count} {count === 1 ? 'anmeldelse' : 'anmeldelser'}
        </Text>
      </View>
      <View style={styles.bars}>
        {distribution.map(({ stars, share }) => (
          <View key={stars} style={styles.barRow}>
            <Text variant="caption" style={styles.barLabel}>{stars}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.round(share * 100)}%` }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { paddingVertical: 16, gap: 8 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1 },
  comment: { color: colors.text },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 24, paddingVertical: 8 },
  average: { alignItems: 'center', gap: 4 },
  averageValue: { fontSize: 40, lineHeight: 46, fontFamily: fonts.extrabold, color: colors.ink },
  count: { marginTop: 2 },
  bars: { flex: 1, gap: 6 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 10, textAlign: 'right' },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.divider, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.star },
});
