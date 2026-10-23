import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { colors, fonts, radius, shadows } from '@/constants/theme';
import type { Booking } from '@/context/BookingContext';
import { useBusiness } from '@/context/BusinessContext';
import { useNow } from '@/hooks/use-now';
import { useCustomerHistory, useSalonBooking } from '@/hooks/use-salon-bookings';
import { showAlert } from '@/lib/alert';
import { haptics } from '@/lib/haptics';
import { openPhoneLink } from '@/lib/links';
import { formatDuration, formatPrice } from '@/lib/salons';
import { formatDay, formatFullDate, formatTimeRange } from '@/lib/schedule';

function statusFor(booking: Booking, now: Date) {
  if (booking.status === 'cancelled') {
    return {
      label: booking.cancelledBy === 'salon' ? 'Avbestilt av deg' : 'Avbestilt av kunden',
      color: colors.danger,
      background: colors.dangerSoft,
    };
  }
  if (booking.status === 'noShow') return { label: 'Møtte ikke', color: colors.warning, background: colors.warningSoft };
  if (booking.endAt.getTime() <= now.getTime()) return { label: 'Fullført', color: colors.textSecondary, background: colors.divider };
  if (booking.startAt.getTime() <= now.getTime()) return { label: 'Pågår', color: colors.primaryDark, background: colors.primarySoft };
  return { label: 'Bekreftet', color: colors.success, background: colors.successSoft };
}

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={19} color={colors.textMuted} />
      <Text variant="body" color={colors.textSecondary} style={styles.rowLabel}>{label}</Text>
      <Text variant="bodyStrong" style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function historyText(history: Booking[], currentId: string) {
  const others = history.filter((booking) => booking.id !== currentId);
  const visits = others.filter((booking) => booking.status === 'confirmed').length;
  const noShows = others.filter((booking) => booking.status === 'noShow').length;
  if (visits === 0 && noShows === 0) return 'Første gang hos deg';
  const parts = [`${visits} ${visits === 1 ? 'annen time' : 'andre timer'} hos deg`];
  if (noShows > 0) parts.push(`møtte ikke ${noShows} ${noShows === 1 ? 'gang' : 'ganger'}`);
  return parts.join(' · ');
}

export default function SalonBookingScreen() {
  const now = useNow();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { salon, cancelAsSalon, setNoShow } = useBusiness();
  const { booking, loading } = useSalonBooking(id);
  const history = useCustomerHistory(salon?.id ?? null, booking?.userId || null);
  const [busy, setBusy] = useState(false);

  if (loading) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Time" backTo="/business/calendar" />
        <View style={styles.content}>
          <Skeleton height={120} borderRadius={radius.lg} />
          <Skeleton height={200} borderRadius={radius.lg} />
        </View>
      </View>
    );
  }

  if (!salon || !booking || booking.salonId !== salon.id) {
    return (
      <View style={styles.screen}>
        <ScreenHeader title="Time" backTo="/business/calendar" />
        <EmptyState icon="calendar-outline" title="Fant ikke timen" />
      </View>
    );
  }

  const status = statusFor(booking, now);
  const started = booking.startAt.getTime() <= now.getTime();
  const phone = booking.customerPhone.replace(/\s+/g, '');
  const name = booking.customerName || 'Kunden';
  const firstName = name.split(' ')[0];
  const staffName = salon.staff.find((member) => member.id === booking.staffId)?.name ?? booking.staffName;

  const run = async (action: () => Promise<void>, failMessage: string) => {
    setBusy(true);
    try {
      await action();
      haptics.success();
    } catch (error) {
      console.error(failMessage, error);
      showAlert('Noe gikk galt', `${failMessage} Prøv igjen.`);
    } finally {
      setBusy(false);
    }
  };

  const confirmCancel = () =>
    showAlert(
      `Avbestille timen til ${firstName}?`,
      `Tiden blir ledig for andre, og ${firstName} ser i appen at du har avbestilt. Send gjerne en melding også, så ${firstName} får beskjed med en gang.`,
      [
        { text: 'Behold timen', style: 'cancel' },
        {
          text: 'Avbestill',
          style: 'destructive',
          onPress: () => run(() => cancelAsSalon(booking), 'Kunne ikke avbestille timen.'),
        },
      ]
    );

  const call = () => openPhoneLink(`tel:${phone}`).catch(() => showAlert('Kunne ikke ringe', `Nummeret er ${booking.customerPhone}.`));
  const message = () => openPhoneLink(`sms:${phone}`).catch(() => showAlert('Kunne ikke åpne meldinger', `Nummeret er ${booking.customerPhone}.`));

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Time" backTo="/business/calendar" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.customer}>
            <Avatar name={name} size={52} />
            <View style={styles.flex}>
              <Text variant="heading" numberOfLines={1}>{name}</Text>
              {booking.customerPhone ? <Text variant="body" selectable>{booking.customerPhone}</Text> : null}
              {history && <Text variant="caption">{historyText(history, booking.id)}</Text>}
            </View>
          </View>
          {phone ? (
            <View style={styles.buttonRow}>
              <Button title="Ring" icon="call-outline" variant="outline" size="md" onPress={call} style={styles.flex} />
              <Button title="Send SMS" icon="chatbubble-outline" variant="outline" size="md" onPress={message} style={styles.flex} />
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <View style={[styles.status, { backgroundColor: status.background }]}>
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          <Text variant="title">{formatDay(booking.startAt, now)}</Text>
          <Text style={styles.time}>{formatTimeRange(booking.time, booking.durationMin)}</Text>

          <View style={styles.rows}>
            <Row icon="cut-outline" label="Behandling" value={booking.serviceName} />
            {salon.staff.length > 1 && <Row icon="person-outline" label="Hos" value={staffName || '–'} />}
            <Row icon="hourglass-outline" label="Varighet" value={formatDuration(booking.durationMin)} />
            <Row icon="card-outline" label="Pris" value={formatPrice(booking.priceNok)} />
            {booking.createdAt && <Row icon="create-outline" label="Booket" value={formatFullDate(booking.createdAt)} />}
          </View>

          {booking.note ? (
            <View style={styles.note}>
              <Text variant="caption" color={colors.textMuted}>Beskjed fra kunden</Text>
              <Text variant="body">{booking.note}</Text>
            </View>
          ) : null}
        </View>

        {booking.status === 'confirmed' && !started && (
          <View style={styles.actions}>
            <Button title="Avbestill timen" variant="danger" loading={busy} onPress={confirmCancel} />
            <Text variant="caption" align="center" color={colors.textMuted}>
              Som salong kan du avbestille når som helst, også etter kundens frist.
            </Text>
          </View>
        )}

        {booking.status === 'confirmed' && started && (
          <View style={styles.actions}>
            <Button
              title="Kunden møtte ikke"
              icon="person-remove-outline"
              variant="outline"
              loading={busy}
              onPress={() => run(() => setNoShow(booking, true), 'Kunne ikke lagre.')}
            />
            <Text variant="caption" align="center" color={colors.textMuted}>
              Du ser det neste gang {firstName} booker hos deg.
            </Text>
          </View>
        )}

        {booking.status === 'noShow' && (
          <View style={styles.actions}>
            <Button
              title="Angre – kunden kom likevel"
              variant="secondary"
              loading={busy}
              onPress={() => run(() => setNoShow(booking, false), 'Kunne ikke lagre.')}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16, paddingBottom: 40, width: '100%', maxWidth: 640, alignSelf: 'center' },
  flex: { flex: 1 },
  card: { padding: 18, gap: 4, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  customer: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  status: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, marginBottom: 6 },
  statusText: { fontFamily: fonts.bold, fontSize: 12 },
  time: { fontFamily: fonts.semibold, fontSize: 18, color: colors.primary },
  rows: { marginTop: 16, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowLabel: { flex: 1 },
  rowValue: { flexShrink: 1, textAlign: 'right' },
  note: { marginTop: 16, padding: 12, borderRadius: radius.md, backgroundColor: colors.background, gap: 2 },
  actions: { gap: 10 },
});
