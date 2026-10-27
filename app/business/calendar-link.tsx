import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { httpsCallable } from 'firebase/functions';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { colors, radius, shadows } from '@/constants/theme';
import { useBusiness } from '@/context/BusinessContext';
import { showAlert } from '@/lib/alert';
import { functions } from '@/lib/firebase';
import { haptics } from '@/lib/haptics';
import { calendarFeedLink, openPhoneLink, shareBookingLink } from '@/lib/links';

// Nøkkelen lages på serveren, siden appen ikke har en sikker tilfeldighetsgenerator på mobil
const getCalendarLink = httpsCallable<{ salonId: string; renew?: boolean }, { token: string }>(functions, 'calendarLink');

/** Lenken salongen abonnerer på i Kalender-appen eller Google Kalender, så timene vises sammen med resten av avtalene. */
export default function CalendarLinkScreen() {
  const { salon } = useBusiness();
  const salonId = salon?.id;
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    if (!salonId) return;
    let active = true;
    getCalendarLink({ salonId })
      .then((result) => active && setToken(result.data.token))
      .catch((error) => {
        console.error('Kunne ikke hente kalenderlenken:', error);
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [salonId, attempt]);

  if (!salon) return null;

  const link = token ? calendarFeedLink(salon.id, token) : null;

  const retry = () => {
    setFailed(false);
    setAttempt(attempt + 1);
  };

  const subscribe = (url: string) =>
    openPhoneLink(url.replace(/^https?:/, 'webcal:')).catch(() =>
      showAlert('Fant ikke Kalender-appen', 'Følg fremgangsmåten for Google Kalender i stedet.')
    );

  const renew = () =>
    showAlert(
      'Lage ny lenke?',
      'Den gamle lenken slutter å virke med en gang. Har du lagt den inn i en kalender, må du legge inn den nye.',
      [
        { text: 'Avbryt', style: 'cancel' },
        {
          text: 'Lag ny',
          style: 'destructive',
          onPress: async () => {
            setRenewing(true);
            try {
              const result = await getCalendarLink({ salonId: salon.id, renew: true });
              setToken(result.data.token);
              haptics.success();
              showAlert('Ny lenke er laget', 'Legg den inn i kalenderen på nytt.');
            } catch (error) {
              console.error('Kunne ikke lage ny kalenderlenke:', error);
              showAlert('Noe gikk galt', 'Kunne ikke lage ny lenke. Prøv igjen.');
            } finally {
              setRenewing(false);
            }
          },
        },
      ]
    );

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Kalender på telefonen" backTo="/business/salon" />

      {failed ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Kunne ikke hente lenken"
          message="Sjekk nettet og prøv igjen."
          actionLabel="Prøv igjen"
          onAction={retry}
        />
      ) : !token ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : !link ? (
        <EmptyState icon="calendar-outline" title="Ikke tilgjengelig her" message="Kalenderlenken virker bare i den publiserte appen." />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text variant="body" color={colors.textSecondary}>
            Se timene fra Bookzy i kalenderen du allerede bruker, sammen med resten av avtalene dine. Nye og avbestilte timer
            oppdateres av seg selv.
          </Text>

          <View style={styles.card}>
            <Text variant="heading">iPhone, iPad og Mac</Text>
            <Text variant="caption">Trykk på knappen, og velg «Abonner» i Kalender.</Text>
            <Button title="Legg til i Kalender" icon="calendar-outline" onPress={() => subscribe(link)} style={styles.button} />
          </View>

          <View style={styles.card}>
            <Text variant="heading">Google Kalender</Text>
            <Text variant="caption">
              Kopier lenken. Åpne calendar.google.com, trykk + ved «Andre kalendere», velg «Fra nettadresse» (URL) og lim inn
              lenken. Da vises timene også i Google Kalender-appen på mobilen.
            </Text>
            <Button
              title={Platform.OS === 'web' ? 'Kopier lenke' : 'Del lenke'}
              variant="secondary"
              icon={Platform.OS === 'web' ? 'copy-outline' : 'share-outline'}
              onPress={() => shareBookingLink(link)}
              style={styles.button}
            />
          </View>

          <Text variant="caption" color={colors.textMuted}>
            Kalenderen henter nye timer selv. På iPhone tar det vanligvis under en time, i Google Kalender kan det ta opptil et
            døgn. Varslene om nye bookinger kommer fortsatt fra Bookzy med en gang.
          </Text>

          <View style={styles.notice}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
            <Text variant="caption" style={styles.flex}>
              Lenken viser kundenes navn og telefonnummer, så ikke del den med andre. Har den kommet på avveie, lager du en ny,
              så slutter den gamle å virke.
            </Text>
          </View>
          <Button title="Lag ny lenke" variant="ghost" size="sm" loading={renewing} onPress={renew} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 40, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  card: { padding: 16, gap: 6, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  button: { marginTop: 8 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
