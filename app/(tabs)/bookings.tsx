import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookingCard } from '@/components/booking-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Skeleton } from '@/components/ui/skeleton';
import { Stars } from '@/components/ui/stars';
import { Text } from '@/components/ui/text';
import { colors, radius, shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { isUpcoming, useBookings } from '@/context/BookingContext';
import { useNow } from '@/hooks/use-now';
import { useReviewedBookings } from '@/hooks/use-reviewed-bookings';

type Tab = 'upcoming' | 'past';

export default function BookingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const { user } = useAuth();
  const { bookings, loading, error } = useBookings();
  const { needsReview } = useReviewedBookings(bookings, now);
  const [tab, setTab] = useState<Tab>('upcoming');

  const upcoming = bookings.filter((booking) => isUpcoming(booking, now));
  const past = bookings.filter((booking) => !upcoming.includes(booking)).reverse();
  const toReview = past.find((booking) => needsReview(booking.id));
  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text variant="title">Timer</Text>
        {user && (
          <SegmentedControl
            options={[
              { value: 'upcoming', label: `Kommende${upcoming.length ? ` (${upcoming.length})` : ''}` },
              { value: 'past', label: 'Tidligere' },
            ]}
            value={tab}
            onChange={setTab}
          />
        )}
      </View>

      {!user ? (
        <EmptyState
          icon="calendar-outline"
          title="Logg inn for å se timene dine"
          message="Her finner du kommende og tidligere timer, og kan flytte eller avbestille."
          actionLabel="Logg inn"
          onAction={() => router.push('/login')}
        />
      ) : loading ? (
        <View style={styles.list}>
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} height={96} borderRadius={radius.lg} />
          ))}
        </View>
      ) : error ? (
        <EmptyState icon="cloud-offline-outline" title="Noe gikk galt" message={error} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {tab === 'past' && toReview && (
            <PressableScale
              style={styles.reviewPrompt}
              scaleTo={0.98}
              onPress={() => router.push(`/review/${toReview.id}`)}
            >
              <View style={styles.reviewText}>
                <Text variant="label">Hvordan var {toReview.serviceName.toLowerCase()}?</Text>
                <Text variant="caption">Gi {toReview.salonName} en vurdering</Text>
              </View>
              <Stars rating={0} size={18} />
            </PressableScale>
          )}

          {list.length === 0 ? (
            tab === 'upcoming' ? (
              <EmptyState
                icon="calendar-clear-outline"
                title="Ingen kommende timer"
                message="Finn en salong og book din neste time på under ett minutt."
                actionLabel="Finn en salong"
                onAction={() => router.navigate('/search')}
              />
            ) : (
              <EmptyState icon="time-outline" title="Ingen tidligere timer" message="Timer du har hatt, vises her." />
            )
          ) : (
            list.map((booking, index) => (
              <Animated.View key={booking.id} entering={FadeInDown.duration(300).delay(Math.min(index, 6) * 40)}>
                <BookingCard booking={booking} now={now} />
                {tab === 'past' && needsReview(booking.id) && booking !== toReview && (
                  <View style={styles.inlineReview}>
                    <Ionicons name="star-outline" size={14} color={colors.primary} />
                    <Text variant="caption" color={colors.primary}>Venter på vurderingen din</Text>
                  </View>
                )}
              </Animated.View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    gap: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  list: { padding: 20, gap: 12 },
  reviewPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    ...shadows.card,
  },
  reviewText: { flex: 1, gap: 2 },
  inlineReview: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8, paddingLeft: 6 },
});
