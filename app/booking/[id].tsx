import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { bookingStatus } from '@/components/booking-card';
import { SalonPhoto } from '@/components/salon-photo';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PressableScale } from '@/components/ui/pressable-scale';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { colors, fonts, radius, shadows } from '@/constants/theme';
import { canCancel, isUpcoming, useBookings } from '@/context/BookingContext';
import { useSalons } from '@/context/SalonsContext';
import { useNow } from '@/hooks/use-now';
import { useReviewedBookings } from '@/hooks/use-reviewed-bookings';
import { showAlert } from '@/lib/alert';
import { haptics } from '@/lib/haptics';
import { callSalon, openDirections } from '@/lib/links';
import { displayAddress, formatCancellationPolicy, formatDuration, formatPrice } from '@/lib/salons';
import { formatDay, formatShortDate, toMinutes, toTime } from '@/lib/schedule';

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={19} color={colors.textMuted} />
      <Text variant="body" color={colors.textSecondary} style={styles.rowLabel}>{label}</Text>
      <Text variant="bodyStrong" style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function BookingDetailsScreen() {
  const router = useRouter();
  const now = useNow();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bookings, loading, cancelBooking } = useBookings();
  const { getSalon } = useSalons();
  const { needsReview, reviewed } = useReviewedBookings(bookings, now);
  const [cancelling, setCancelling] = useState(false);
  // Avbestillingen bekreftes i et skjema der kunden kan skrive hvorfor
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState('');

  const booking = bookings.find((item) => item.id === id);
  const salon = booking ? getSalon(booking.salonId) : undefined;

  if (loading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Timen din" />
        <View style={styles.content}>
          <Skeleton height={90} borderRadius={radius.lg} />
          <Skeleton height={200} borderRadius={radius.lg} />
        </View>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Timen din" />
        <EmptyState icon="calendar-outline" title="Fant ikke timen" message="Er du logget inn med riktig konto?" />
      </View>
    );
  }

  const status = bookingStatus(booking, now);
  const upcoming = isUpcoming(booking, now);
  const isCompleted = booking.status === 'confirmed' && !upcoming;
  // Hos salonger som godkjenner selv, kommer adressen med den godkjente timen
  const address = booking.address || salon?.address || '';
  const place = booking.address || (salon ? displayAddress(salon) : '');
  const cancellable = canCancel(booking, now);
  const endTime = toTime(toMinutes(booking.time) + booking.durationMin);

  const bookAgain = () =>
    router.push({
      pathname: '/book/[salonId]',
      params: { salonId: booking.salonId, serviceId: booking.serviceId, staffId: booking.staffId },
    });

  const reschedule = () =>
    router.push({
      pathname: '/book/[salonId]',
      params: { salonId: booking.salonId, serviceId: booking.serviceId, staffId: booking.staffId, replaces: booking.id },
    });

  const cancel = async () => {
    setCancelling(true);
    try {
      await cancelBooking(booking, reason);
      haptics.success();
    } catch (error) {
      console.error('Kunne ikke avbestille:', error);
      showAlert('Noe gikk galt', 'Kunne ikke avbestille timen. Prøv igjen, eller kontakt salongen.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Timen din" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <PressableScale style={styles.salonCard} scaleTo={0.98} onPress={() => router.push(`/salon/${booking.salonId}`)}>
          {salon ? <SalonPhoto salon={salon} style={styles.salonImage} iconSize={24} /> : <View style={styles.salonImage} />}
          <View style={styles.salonText}>
            <Text variant="heading" numberOfLines={1}>{booking.salonName}</Text>
            {place ? <Text variant="caption" numberOfLines={1}>{place}</Text> : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </PressableScale>

        <View style={styles.card}>
          <View style={[styles.status, { backgroundColor: status.background }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          <Text variant="title">{formatDay(booking.startAt, now)}</Text>
          <Text style={styles.time}>{booking.time}–{endTime}</Text>

          <View style={styles.rows}>
            <Row icon="cut-outline" label="Behandling" value={booking.serviceName} />
            <Row icon="person-outline" label="Hos" value={booking.staffName || 'Salongen'} />
            <Row icon="hourglass-outline" label="Varighet" value={formatDuration(booking.durationMin)} />
            <Row icon="card-outline" label="Pris" value={formatPrice(booking.priceNok)} />
          </View>
          {booking.note ? (
            <View style={styles.note}>
              <Text variant="caption" color={colors.textMuted}>Beskjed til salongen</Text>
              <Text variant="body">{booking.note}</Text>
            </View>
          ) : null}
          {booking.cancelReason ? (
            <View style={styles.note}>
              <Text variant="caption" color={colors.textMuted}>
                {booking.cancelledBy === 'salon' || booking.status === 'declined'
                  ? `Begrunnelse fra ${booking.salonName}`
                  : 'Din begrunnelse'}
              </Text>
              <Text variant="body">{booking.cancelReason}</Text>
            </View>
          ) : null}
        </View>

        {upcoming && (
          <View style={styles.actions}>
            {booking.status === 'pending' && (
              <View style={[styles.notice, styles.waiting]}>
                <Ionicons name="hourglass-outline" size={18} color={colors.primaryDark} />
                <Text variant="caption" color={colors.text} style={styles.flex}>
                  {booking.salonName} har ikke godkjent timen ennå. Adressen vises her når den er godkjent.
                </Text>
              </View>
            )}
            {cancellable && confirming ? (
              <>
                <TextField
                  label="Hvorfor avbestiller du? (valgfritt)"
                  placeholder="F.eks. at du har blitt syk"
                  hint={`${booking.salonName} ser meldingen, og tiden blir ledig for andre.`}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  maxLength={200}
                />
                <View style={styles.buttonRow}>
                  <Button title="Behold timen" variant="outline" disabled={cancelling} onPress={() => setConfirming(false)} style={styles.flex} />
                  <Button title="Avbestill" variant="danger" loading={cancelling} onPress={cancel} style={styles.flex} />
                </View>
              </>
            ) : cancellable ? (
              <>
                <View style={styles.buttonRow}>
                  <Button title="Endre tid" variant="secondary" icon="swap-horizontal" onPress={reschedule} style={styles.flex} />
                  <Button title="Avbestill" variant="danger" onPress={() => setConfirming(true)} style={styles.flex} />
                </View>
                <Text variant="caption" align="center">
                  {formatCancellationPolicy(salon?.cancellationHours ?? 24)}
                </Text>
              </>
            ) : (
              <View style={styles.notice}>
                <Ionicons name="time-outline" size={18} color={colors.warning} />
                <Text variant="caption" color={colors.text} style={styles.flex}>
                  Fristen for å endre eller avbestille i appen var {formatShortDate(booking.cancellableUntil)} kl{' '}
                  {toTime(booking.cancellableUntil.getHours() * 60 + booking.cancellableUntil.getMinutes())}. Ring salongen hvis du ikke kan komme.
                </Text>
              </View>
            )}
            <View style={styles.buttonRow}>
              {address ? <Button title="Veibeskrivelse" variant="outline" size="md" icon="navigate-outline" onPress={() => openDirections(address)} style={styles.flex} /> : null}
              {salon?.phone && <Button title="Ring" variant="outline" size="md" icon="call-outline" onPress={() => callSalon(salon)} style={styles.flex} />}
            </View>
          </View>
        )}

        {isCompleted && (
          <View style={styles.actions}>
            {needsReview(booking.id) ? (
              <Button title="Gi vurdering" icon="star-outline" onPress={() => router.push(`/review/${booking.id}`)} />
            ) : reviewed?.has(booking.id) ? (
              <View style={[styles.notice, styles.thanks]}>
                <Ionicons name="heart" size={18} color={colors.success} />
                <Text variant="caption" color={colors.text} style={styles.flex}>Takk for vurderingen din!</Text>
              </View>
            ) : null}
            <Button title="Book igjen" variant="secondary" icon="refresh" onPress={bookAgain} />
          </View>
        )}

        {booking.status === 'cancelled' && (
          <View style={styles.actions}>
            {booking.cancelledBy === 'salon' && (
              <View style={styles.notice}>
                <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
                <Text variant="caption" color={colors.text} style={styles.flex}>
                  {booking.salonName} avbestilte denne timen. Ta kontakt med dem hvis du lurer på noe.
                </Text>
              </View>
            )}
            <Button title="Book ny time" variant="secondary" onPress={bookAgain} />
          </View>
        )}

        {booking.status === 'declined' && (
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
            <Text variant="caption" color={colors.text} style={styles.flex}>
              {booking.salonName} kunne dessverre ikke ta imot denne bookingen.
            </Text>
          </View>
        )}

        {booking.status === 'noShow' && (
          <View style={styles.actions}>
            <View style={styles.notice}>
              <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
              <Text variant="caption" color={colors.text} style={styles.flex}>
                Salongen har registrert at du ikke kom til denne timen. Ta kontakt med dem hvis det ikke stemmer.
              </Text>
            </View>
            <Button title="Book ny time" variant="secondary" onPress={bookAgain} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  flex: { flex: 1 },
  salonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  salonImage: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.divider },
  salonText: { flex: 1, gap: 2 },
  card: { padding: 20, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  status: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, marginBottom: 10 },
  statusText: { fontFamily: fonts.bold, fontSize: 12 },
  time: { fontFamily: fonts.semibold, fontSize: 18, color: colors.primary, marginTop: 2 },
  rows: { marginTop: 18, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: { flex: 1 },
  rowValue: { flexShrink: 1, textAlign: 'right' },
  note: { marginTop: 18, padding: 12, borderRadius: radius.md, backgroundColor: colors.background, gap: 2 },
  actions: { gap: 12 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  notice: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
  },
  thanks: { backgroundColor: colors.successSoft },
  waiting: { backgroundColor: colors.primarySoft },
});
