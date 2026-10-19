import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogoMark } from '@/components/logo';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ListRow } from '@/components/ui/list-row';
import { SettingsSection as Section } from '@/components/ui/settings-section';
import { Switch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import { colors, radius, shadows } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useEmailVerification } from '@/hooks/use-email-verification';
import { showAlert } from '@/lib/alert';
import { formatPhone } from '@/lib/phone';
import { pushSupported, registerForPush } from '@/lib/push';

function useReminderSetting() {
  const { user, preferences, emailVerified, savePreferences } = useAuth();

  const toggle = async (value: boolean) => {
    try {
      await savePreferences({ reminders: value });
    } catch (error) {
      console.error('Kunne ikke lagre innstillingen:', error);
      showAlert('Noe gikk galt', 'Kunne ikke lagre innstillingen. Prøv igjen.');
      return;
    }
    if (value && user && pushSupported && (await registerForPush(user.uid, { ask: true })) === 'denied') {
      showAlert(
        'Varsler er slått av på telefonen',
        `${emailVerified ? 'Påminnelsene kommer på e-post i stedet. ' : ''}Gi Bookzy lov til å sende varsler i innstillingene på telefonen for å få dem som varsel.`
      );
    }
  };

  return { enabled: preferences.reminders, toggle };
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, displayName, signOut } = useAuth();
  const { favoriteIds } = useFavorites();
  const { salon, setBusinessMode } = useBusiness();
  const reminders = useReminderSetting();
  const verification = useEmailVerification();
  const version = Constants.expoConfig?.version ?? '';

  const openBusiness = () => {
    if (salon) setBusinessMode(true);
    router.push('/business');
  };

  const confirmSignOut = () =>
    showAlert('Logge ut?', undefined, [
      { text: 'Avbryt', style: 'cancel' },
      {
        text: 'Logg ut',
        style: 'destructive',
        onPress: () => {
          signOut().catch(() => showAlert('Noe gikk galt', 'Kunne ikke logge ut. Prøv igjen.'));
        },
      },
    ]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + 14 }]}>
      <Text variant="title" style={styles.title}>Profil</Text>

      {user ? (
        <View style={styles.profileCard}>
          <Avatar name={displayName || '?'} size={64} />
          <View style={styles.profileText}>
            <Text variant="heading" numberOfLines={1}>{displayName}</Text>
            <Text variant="caption" numberOfLines={1}>{user.email ?? formatPhone(user.phoneNumber ?? '')}</Text>
            {user.email && profile?.phone ? <Text variant="caption">{profile.phone}</Text> : null}
          </View>
          <Button title="Rediger" size="sm" variant="secondary" onPress={() => router.push('/account/edit')} />
        </View>
      ) : (
        <View style={[styles.profileCard, styles.guestCard]}>
          <LogoMark height={44} />
          <Text variant="heading" align="center">Logg inn for å booke</Text>
          <Text variant="body" color={colors.textSecondary} align="center">
            Med en konto kan du booke timer, lagre favoritter og få påminnelser.
          </Text>
          <Button title="Logg inn eller opprett konto" onPress={() => router.push('/login')} style={styles.guestButton} />
        </View>
      )}

      {user && (
        <Section
          title="Konto"
          footer={
            !user.email
              ? 'Du er logget inn med mobilnummeret ditt. Bekreftelser og påminnelser sendes på SMS.'
              : verification.verified
                ? 'Bekreftelser og påminnelser sendes på e-post. Har du appen, kommer påminnelsen som varsel.'
                : 'Bekreft e-postadressen for å få bekreftelser og påminnelser på e-post.'
          }
        >
          {user.email && !verification.verified && (
            <ListRow icon="mail-unread-outline" label="Bekreft e-postadressen" value="Send lenke" onPress={verification.send} />
          )}
          <ListRow
            icon="heart-outline"
            label="Favoritter"
            value={favoriteIds.size > 0 ? String(favoriteIds.size) : undefined}
            onPress={() => router.push('/favorites')}
          />
          <ListRow icon="person-outline" label="Personlige opplysninger" onPress={() => router.push('/account/edit')} />
          <ListRow
            icon="notifications-outline"
            label="Påminnelser før timen"
            last
            right={<Switch value={reminders.enabled} onValueChange={reminders.toggle} accessibilityLabel="Påminnelser før timen" />}
          />
        </Section>
      )}

      {salon && (
        <Section title="Bedrift">
          <ListRow icon="storefront-outline" label="Gå til bedriftsmodus" value={salon.name} onPress={openBusiness} last />
        </Section>
      )}

      <Section title="Hjelp">
        <ListRow icon="help-circle-outline" label="Vanlige spørsmål" onPress={() => router.push('/help')} />
        {!salon && <ListRow icon="storefront-outline" label="Bookzy for bedrifter" onPress={openBusiness} />}
        <ListRow icon="shield-checkmark-outline" label="Personvern og vilkår" onPress={() => router.push('/privacy')} last />
      </Section>

      {user && (
        <Section title="Innlogging">
          <ListRow icon="log-out-outline" label="Logg ut" onPress={confirmSignOut} />
          <ListRow icon="trash-outline" label="Slett konto" destructive last onPress={() => router.push('/account/delete')} />
        </Section>
      )}

      <Text variant="caption" color={colors.textMuted} align="center" style={styles.version}>
        Bookzy {version}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  title: { marginBottom: 16 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  profileText: { flex: 1, gap: 1 },
  guestCard: { flexDirection: 'column', paddingVertical: 28, gap: 8 },
  guestButton: { alignSelf: 'stretch', marginTop: 12 },
  version: { marginTop: 28 },
});
