import { Platform, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { colors, radius, shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBookings, type Booking } from '@/context/BookingContext';
import { useEmailVerification } from '@/hooks/use-email-verification';
import { useNow } from '@/hooks/use-now';
import { formatPrice } from '@/lib/salons';
import { formatDay, toMinutes, toTime } from '@/lib/schedule';

const HOUR = 60 * 60 * 1000;

/** Samme regel som på serveren (functions/src/format.ts): et døgn før, eller to timer før. */
function reminderText(booking: Booking | undefined, now: Date): string {
  if (!booking) return '';
  const lead = booking.startAt.getTime() - now.getTime();
  if (lead > 25 * HOUR) return ' Vi minner deg på den dagen før.';
  if (lead > 3 * HOUR) return ' Vi minner deg på den to timer før.';
  return '';
}

export default function BookingSuccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { bookingId, moved } = useLocalSearchParams<{ bookingId: string; moved?: string }>();
  const { user, preferences, emailVerified } = useAuth();
  // Uten bekreftet e-post sendes bekreftelse og påminnelse på SMS til dem som logget inn med mobilnummer
  const bySms = !emailVerified && !!user?.phoneNumber;
  // På nettet er det ingen push, så der kommer påminnelsen bare på e-post eller SMS
  const remindable = preferences.reminders && (emailVerified || bySms || Platform.OS !== 'web');
  const { bookings } = useBookings();
  const booking = bookings.find((item) => item.id === bookingId);
  const verification = useEmailVerification();
  // Uten bekreftet e-post og uten SMS-innlogging får kunden verken bekreftelse eller påminnelse
  const unconfirmed = !!user?.email && !emailVerified && !bySms;

  const goHome = () => {
    router.dismissAll();
    router.navigate('/explore');
  };

  const openBooking = () => {
    router.dismissAll();
    router.navigate('/bookings');
    router.push(`/booking/${bookingId}`);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.center}>
        <Animated.View entering={ZoomIn.springify().damping(80)} style={styles.checkCircle}>
          <Ionicons name="checkmark" size={52} color="#FFFFFF" />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.titles}>
          <Text variant="display" align="center">{moved ? 'Timen er flyttet!' : 'Timen er booket!'}</Text>
          <Text variant="body" color={colors.textSecondary} align="center">
            Du finner den under Timer.
            {emailVerified ? ' Bekreftelsen er sendt på e-post.' : bySms ? ' Bekreftelsen er sendt på SMS.' : ''}
            {remindable ? reminderText(booking, now) : ''}
            {user && !user.email ? ' Logg inn med mobilnummeret ditt for å finne den igjen senere.' : ''}
          </Text>
        </Animated.View>

        {/* Vises når timen er hentet. Feiler det, står fortsatt «Timen er booket» og knappene, ikke et hjul som aldri stopper. */}
        {booking && (
          <Animated.View entering={FadeInDown.delay(320).duration(400)} style={styles.card}>
            <Text variant="heading">{booking.salonName}</Text>
            <View style={styles.row}>
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text variant="bodyStrong">
                {formatDay(booking.startAt, now)}, {booking.time}–{toTime(toMinutes(booking.time) + booking.durationMin)}
              </Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="cut-outline" size={18} color={colors.primary} />
              <Text variant="body">{booking.serviceName}</Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="person-outline" size={18} color={colors.primary} />
              <Text variant="body">{booking.staffName}</Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="card-outline" size={18} color={colors.primary} />
              <Text variant="body">{formatPrice(booking.priceNok)} · betales i salongen</Text>
            </View>
          </Animated.View>
        )}

        {unconfirmed && (
          <Animated.View entering={FadeInDown.delay(380).duration(400)} style={styles.notice}>
            <Ionicons name="mail-unread-outline" size={20} color={colors.primaryDark} />
            <Text variant="caption" color={colors.primaryDark} style={styles.noticeText}>
              Bekreft e-postadressen din, så får du bekreftelse og påminnelse på e-post neste gang.
            </Text>
            <Button title="Send lenke" size="sm" variant="secondary" onPress={verification.send} />
          </Animated.View>
        )}
      </View>

      <Animated.View entering={FadeInDown.delay(450).duration(400)} style={styles.actions}>
        <Button title="Se timen" onPress={openBooking} />
        <Button title="Til forsiden" variant="ghost" onPress={goHome} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
  checkCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 12px 30px rgba(31, 157, 99, 0.35)',
  },
  titles: { gap: 8, maxWidth: 340 },
  card: {
    alignSelf: 'stretch',
    padding: 20,
    gap: 12,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  notice: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  noticeText: { flex: 1 },
  actions: { gap: 8 },
});
