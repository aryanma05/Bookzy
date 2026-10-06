import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { StarInput } from '@/components/ui/stars';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { colors } from '@/constants/theme';
import { publicName, useAuth } from '@/context/AuthContext';
import { useBookings } from '@/context/BookingContext';
import { showAlert } from '@/lib/alert';
import { haptics } from '@/lib/haptics';
import { submitReview } from '@/lib/reviews';
import { formatShortDate } from '@/lib/schedule';

const LABELS = ['', 'Dårlig', 'Kunne vært bedre', 'Greit', 'Veldig bra', 'Fantastisk'];
const MAX_LENGTH = 1000;

export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { displayName } = useAuth();
  const { bookings } = useBookings();
  const booking = bookings.find((item) => item.id === bookingId);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!booking) {
    return (
      <View style={styles.screen}>
        <ScreenHeader closeIcon title="Gi vurdering" />
        <EmptyState icon="star-outline" title="Fant ikke timen" />
      </View>
    );
  }

  const submit = async () => {
    if (!rating || submitting) return;
    setSubmitting(true);
    try {
      await submitReview({
        bookingId: booking.id,
        salonId: booking.salonId,
        serviceName: booking.serviceName,
        rating,
        comment,
        authorName: publicName(displayName),
      });
      haptics.success();
      router.back();
      showAlert('Takk for vurderingen!', 'Den hjelper andre med å finne riktig salong.');
    } catch (error) {
      console.error('Kunne ikke lagre anmeldelse:', error);
      showAlert('Noe gikk galt', 'Kunne ikke sende vurderingen. Kanskje du allerede har vurdert denne timen?');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader closeIcon title="Gi vurdering" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.intro}>
            <Text variant="title" align="center">Hvordan var det?</Text>
            <Text variant="body" color={colors.textSecondary} align="center">
              {booking.serviceName} hos {booking.salonName}, {formatShortDate(booking.startAt)}
            </Text>
          </View>

          <View style={styles.stars}>
            <StarInput value={rating} onChange={setRating} />
            <Text variant="label" color={rating ? colors.ink : colors.textMuted} style={styles.ratingLabel}>
              {rating ? LABELS[rating] : 'Trykk på en stjerne'}
            </Text>
          </View>

          <TextField
            label="Fortell litt mer (valgfritt)"
            value={comment}
            onChangeText={setComment}
            placeholder="Hva var bra? Hva kunne vært bedre?"
            multiline
            maxLength={MAX_LENGTH}
            hint={`Vises offentlig som «${publicName(displayName)}» · ${comment.length}/${MAX_LENGTH}`}
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <Button title="Send vurdering" disabled={!rating} loading={submitting} onPress={submit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  content: { padding: 24, gap: 28 },
  intro: { gap: 6, marginTop: 8 },
  stars: { alignItems: 'center', gap: 12 },
  ratingLabel: { minHeight: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
