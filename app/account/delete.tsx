import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { colors, radius } from '@/constants/theme';
import { authErrorMessage, useAuth } from '@/context/AuthContext';
import { canCancel, useBookings } from '@/context/BookingContext';
import { useBusiness } from '@/context/BusinessContext';
import { useNow } from '@/hooks/use-now';
import { fetchUpcomingBookings } from '@/hooks/use-salon-bookings';
import { showAlert } from '@/lib/alert';
import { toDateKey } from '@/lib/schedule';

// Firebase krever nylig innlogging for å slette en konto. Med SMS har vi ikke passord å spørre om.
const RECENT_SIGN_IN_MS = 4 * 60 * 1000;

const CONSEQUENCES = [
  'Profilen, favorittene og innloggingen din slettes for godt.',
  'Kommende timer som fortsatt kan avbestilles, avbestilles automatisk.',
  'Anmeldelser du har skrevet blir liggende, uten kobling til deg.',
];

export default function DeleteAccountScreen() {
  const router = useRouter();
  const now = useNow();
  const { user, reauthenticate, deleteAccount } = useAuth();
  const usesPassword = !!user?.email;
  const { bookings, cancelBooking } = useBookings();
  const { salon, saveSalon } = useBusiness();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const consequences = salon
    ? [...CONSEQUENCES, `Siden til ${salon.name} skjules, så ingen kan booke nye timer der.`]
    : CONSEQUENCES;

  const remove = async () => {
    if ((usesPassword && !password) || deleting) return;
    setError(null);
    // Sjekkes før noe avbestilles, så kontoen ikke blir halvveis slettet
    if (!usesPassword && Date.now() - Date.parse(user?.metadata.lastSignInTime ?? '') > RECENT_SIGN_IN_MS) {
      setError('Av sikkerhetshensyn må du logge ut og inn igjen med SMS-koden før du sletter kontoen.');
      return;
    }
    setDeleting(true);
    try {
      // Uten eier får ingen vite om timene, så kundene må få beskjed først
      if (salon) {
        const customers = (await fetchUpcomingBookings(salon.id, toDateKey(new Date()))).filter(
          (booking) => booking.userId !== user?.uid && booking.endAt.getTime() > Date.now()
        );
        if (customers.length > 0) {
          showAlert(
            `${salon.name} har ${customers.length} kommende ${customers.length === 1 ? 'time' : 'timer'}`,
            'Avbestill dem i kalenderen først, så kundene får beskjed.'
          );
          return;
        }
      }
      if (usesPassword) await reauthenticate(password);
      // Uten eier er det ingen som ser bookingene, så siden skjules.
      // shortcut: bildene i Storage (salons/{id}/) blir liggende, rydd dem med en Cloud Function hvis det blir mange.
      if (salon?.published) await saveSalon({ published: false });
      for (const booking of bookings.filter((item) => canCancel(item, now))) {
        await cancelBooking(booking);
      }
      await deleteAccount();
      router.dismissAll();
      router.replace('/explore');
      showAlert('Kontoen er slettet', 'Takk for at du brukte Bookzy.');
    } catch (deleteError) {
      console.error('Kunne ikke slette konto:', deleteError);
      setError(authErrorMessage(deleteError));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Slett konto" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.icon}>
            <Ionicons name="warning-outline" size={30} color={colors.danger} />
          </View>
          <Text variant="title">Er du sikker?</Text>
          <View style={styles.list}>
            {consequences.map((text) => (
              <View key={text} style={styles.item}>
                <Ionicons name="ellipse" size={6} color={colors.textSecondary} style={styles.bullet} />
                <Text variant="body" color={colors.textSecondary} style={styles.flex}>{text}</Text>
              </View>
            ))}
          </View>
          {usesPassword ? (
            <TextField
              label="Skriv inn passordet ditt for å bekrefte"
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              error={error}
            />
          ) : (
            error && <Text variant="caption" color={colors.danger}>{error}</Text>
          )}
          <Button title="Slett kontoen min" variant="danger" disabled={usesPassword && !password} loading={deleting} onPress={remove} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 24, gap: 18 },
  icon: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: 10 },
  item: { flexDirection: 'row', gap: 10 },
  bullet: { marginTop: 9 },
});
