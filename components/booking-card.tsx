import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Text } from '@/components/ui/text';
import { colors, fonts, radius, shadows } from '@/constants/theme';
import type { Booking } from '@/context/BookingContext';
import { formatDay, formatMonthShort, toMinutes, toTime } from '@/lib/schedule';

export function bookingStatus(booking: Booking, now: Date) {
  if (booking.status === 'cancelled') return { label: 'Avbestilt', color: colors.danger, background: colors.dangerSoft };
  if (booking.endAt.getTime() <= now.getTime()) return { label: 'Fullført', color: colors.textSecondary, background: colors.divider };
  return { label: 'Bekreftet', color: colors.success, background: colors.successSoft };
}

export function BookingCard({ booking, now }: { booking: Booking; now: Date }) {
  const router = useRouter();
  const status = bookingStatus(booking, now);
  const endTime = toTime(toMinutes(booking.time) + booking.durationMin);
  const upcoming = status.label === 'Bekreftet';

  return (
    <PressableScale
      style={styles.card}
      scaleTo={0.98}
      onPress={() => router.push(`/booking/${booking.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${booking.serviceName} hos ${booking.salonName}, ${formatDay(booking.startAt, now)} kl ${booking.time}`}
    >
      <View style={[styles.dateBlock, upcoming && styles.dateBlockActive]}>
        <Text style={[styles.month, upcoming && styles.onPrimary]}>{formatMonthShort(booking.startAt)}</Text>
        <Text style={[styles.day, upcoming && styles.onPrimary]}>{booking.startAt.getDate()}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant="subheading" numberOfLines={1} style={styles.salon}>{booking.salonName}</Text>
          <View style={[styles.status, { backgroundColor: status.background }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
        <Text variant="body" numberOfLines={1}>{booking.serviceName}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text variant="caption">
            {formatDay(booking.startAt, now)} · {booking.time}–{endTime}
          </Text>
        </View>
        {booking.staffName ? (
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={14} color={colors.textMuted} />
            <Text variant="caption">{booking.staffName}</Text>
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadows.card,
  },
  dateBlock: {
    width: 56,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBlockActive: { backgroundColor: colors.primary },
  month: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.8, color: colors.textMuted },
  day: { fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 28, color: colors.ink },
  onPrimary: { color: '#FFFFFF' },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  salon: { flex: 1, color: colors.ink },
  status: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  statusText: { fontFamily: fonts.bold, fontSize: 11 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
