import { useCallback, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { ListRow } from '@/components/ui/list-row';
import { PressableScale } from '@/components/ui/pressable-scale';
import { SettingsSection } from '@/components/ui/settings-section';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { colors, radius, shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import { useEmailVerification } from '@/hooks/use-email-verification';
import { showAlert } from '@/lib/alert';
import { haptics } from '@/lib/haptics';
import { pushPermissionGranted, pushSupported, registerForPush } from '@/lib/push';
import { toDateKey, WEEK } from '@/lib/schedule';

/** E-post og push om nye bookinger og avbestillinger. */
function NotificationSettings() {
  const { user, preferences, savePreferences } = useAuth();
  const verification = useEmailVerification();
  const [pushAllowed, setPushAllowed] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (pushSupported) pushPermissionGranted().then(setPushAllowed);
    }, [])
  );

  const enablePush = async () => {
    if (!user) return;
    const status = await registerForPush(user.uid, { ask: true });
    if (status === 'denied') Linking.openSettings();
    setPushAllowed(status === 'enabled');
  };

  const toggleEmails = (salonEmails: boolean) => {
    savePreferences({ salonEmails }).catch((error) => {
      console.error('Kunne ikke lagre innstillingen:', error);
      showAlert('Noe gikk galt', 'Kunne ikke lagre innstillingen. Prøv igjen.');
    });
  };

  const footer = !verification.verified
    ? 'Bekreft e-postadressen din for å få e-post når noen booker eller avbestiller.'
    : preferences.salonEmails
      ? `Vi sender e-post til ${user?.email} når noen booker, flytter eller avbestiller.${pushSupported ? '' : ' Med appen på mobilen får du også varsel med en gang.'}`
      : pushSupported
        ? 'Du får bare varsel her i appen.'
        : 'Med appen på mobilen får du varsel med en gang.';

  return (
    <SettingsSection title="Varsler" footer={footer}>
      {pushSupported && !pushAllowed && (
        <ListRow icon="notifications-off-outline" label="Slå på varsler" value="Av" onPress={enablePush} />
      )}
      {!verification.verified && (
        <ListRow icon="mail-unread-outline" label="Bekreft e-postadressen" value="Send lenke" onPress={verification.send} />
      )}
      <ListRow
        icon="mail-outline"
        label="E-post om bookinger"
        last
        right={
          <Switch value={preferences.salonEmails} onValueChange={toggleEmails} accessibilityLabel="E-post om bookinger" />
        }
      />
    </SettingsSection>
  );
}

function ChecklistItem({ done, label, onPress }: { done: boolean; label: string; onPress?: () => void }) {
  return (
    <PressableScale scaleTo={0.98} onPress={onPress} disabled={!onPress} style={styles.checkItem}>
      <Ionicons
        name={done ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={done ? colors.success : colors.textMuted}
      />
      <Text variant="body" style={styles.flex} color={done ? colors.textSecondary : colors.text}>{label}</Text>
      {onPress && !done && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </PressableScale>
  );
}

export default function SalonSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { salon, saveSalon, setBusinessMode } = useBusiness();
  const [publishing, setPublishing] = useState(false);

  if (!salon) return null;

  const openDays = WEEK.filter(({ key }) => salon.openingHours[key]).length;
  const today = toDateKey(new Date());
  const upcomingDaysOff = new Set(salon.closedDates.filter((key) => key >= today).map((key) => key.slice(0, 10))).size;
  const canPublish = salon.services.length > 0 && openDays > 0;

  const setPublished = async (published: boolean) => {
    setPublishing(true);
    try {
      await saveSalon({ published });
      haptics.success();
    } catch (error) {
      console.error('Kunne ikke endre synlighet:', error);
      showAlert('Noe gikk galt', 'Prøv igjen.');
    } finally {
      setPublishing(false);
    }
  };

  const togglePublished = (published: boolean) => {
    if (published) {
      setPublished(true);
      return;
    }
    showAlert('Skjule siden?', 'Kundene kan ikke finne deg eller booke nye timer. Timer som allerede er booket, står fortsatt.', [
      { text: 'Avbryt', style: 'cancel' },
      { text: 'Skjul', style: 'destructive', onPress: () => setPublished(false) },
    ]);
  };

  const switchToCustomer = () => {
    setBusinessMode(false);
    router.replace('/explore');
  };

  const confirmSignOut = () =>
    showAlert('Logge ut?', undefined, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Logg ut',
        style: 'destructive',
        onPress: () => {
          signOut()
            .then(() => router.replace('/explore'))
            .catch(() => showAlert('Noe gikk galt', 'Kunne ikke logge ut. Prøv igjen.'));
        },
      },
    ]);

  const go = (href: Href) => () => router.push(href);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
      <Text variant="title" style={styles.title}>Salongen</Text>

      <View style={styles.card}>
        <Text variant="heading" numberOfLines={2}>{salon.name}</Text>
        <Text variant="caption">{[salon.category, salon.locationType === 'home' ? 'Hjemmesalong' : null, salon.area].filter(Boolean).join(' · ')}</Text>
        <Button
          title="Se siden slik kundene ser den"
          variant="secondary"
          size="sm"
          icon="eye-outline"
          onPress={go(`/salon/${salon.id}`)}
          style={styles.preview}
        />
      </View>

      {!salon.published && (
        <View style={[styles.card, styles.setup]}>
          <Text variant="heading">Gjør klar siden din</Text>
          <Text variant="caption">Kundene finner deg når du har publisert.</Text>
          <View style={styles.checklist}>
            <ChecklistItem done label="Registrer bedriften" />
            <ChecklistItem
              done={salon.services.length > 0}
              label="Legg inn tjenester med pris og varighet"
              onPress={go(salon.services.length > 0 ? '/business/services' : '/business/service/new')}
            />
            <ChecklistItem done={openDays > 0} label="Sjekk åpningstidene" onPress={go('/business/hours')} />
          </View>
          <Button
            title="Publiser siden"
            icon="globe-outline"
            disabled={!canPublish}
            loading={publishing}
            onPress={() => setPublished(true)}
          />
        </View>
      )}

      <SettingsSection title="Oppsett">
        <ListRow icon="storefront-outline" label="Profil og kontaktinfo" onPress={go('/business/profile')} />
        <ListRow
          icon="time-outline"
          label="Åpningstider"
          value={openDays === 0 ? 'Stengt' : `${openDays} ${openDays === 1 ? 'dag' : 'dager'} i uka`}
          onPress={go('/business/hours')}
        />
        <ListRow
          icon="airplane-outline"
          label="Fridager og ferie"
          value={upcomingDaysOff > 0 ? `${upcomingDaysOff} kommende` : undefined}
          onPress={go('/business/days-off')}
        />
        <ListRow
          icon="people-outline"
          label="Hvem tar imot kunder"
          value={salon.staff.length === 1 ? 'Bare deg' : `${salon.staff.length} personer`}
          onPress={go('/business/staff')}
          last
        />
      </SettingsSection>

      {salon.published && (
        <SettingsSection footer="Når siden er skjult, kan ingen finne deg eller booke nye timer.">
          <ListRow
            icon="globe-outline"
            label="Synlig for kunder"
            last
            right={
              <Switch
                value={salon.published}
                disabled={publishing}
                onValueChange={togglePublished}
              />
            }
          />
        </SettingsSection>
      )}

      <NotificationSettings />

      <SettingsSection title="Konto">
        <ListRow icon="swap-horizontal-outline" label="Bytt til kundemodus" onPress={switchToCustomer} />
        <ListRow icon="log-out-outline" label="Logg ut" onPress={confirmSignOut} last />
      </SettingsSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 40, width: '100%', maxWidth: 720, alignSelf: 'center' },
  flex: { flex: 1 },
  title: { marginBottom: 16 },
  card: { padding: 16, gap: 4, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadows.card },
  preview: { alignSelf: 'flex-start', marginTop: 10 },
  setup: { marginTop: 16, gap: 6 },
  checklist: { marginVertical: 8 },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
});
