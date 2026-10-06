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
import { useNow } from '@/hooks/use-now';
import { showAlert } from '@/lib/alert';

const CONSEQUENCES = [
  'Profilen, favorittene og innloggingen din slettes for godt.',
  'Kommende timer som fortsatt kan avbestilles, avbestilles automatisk.',
  'Anmeldelser du har skrevet blir liggende, uten kobling til deg.',
];

export default function DeleteAccountScreen() {
  const router = useRouter();
  const now = useNow();
  const { reauthenticate, deleteAccount } = useAuth();
  const { bookings, cancelBooking } = useBookings();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    if (!password || deleting) return;
    setError(null);
    setDeleting(true);
    try {
      await reauthenticate(password);
      for (const booking of bookings.filter((item) => canCancel(item, now))) {
        await cancelBooking(booking);
      }
      await deleteAccount();
      router.dismissAll();
      router.replace('/explore');
      showAlert('Kontoen er slettet', 'Takk for at du brukte Timeflyt.');
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
            {CONSEQUENCES.map((text) => (
              <View key={text} style={styles.item}>
                <Ionicons name="ellipse" size={6} color={colors.textSecondary} style={styles.bullet} />
                <Text variant="body" color={colors.textSecondary} style={styles.flex}>{text}</Text>
              </View>
            ))}
          </View>
          <TextField
            label="Skriv inn passordet ditt for å bekrefte"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            error={error}
          />
          <Button title="Slett kontoen min" variant="danger" disabled={!password} loading={deleting} onPress={remove} />
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
