import { useEffect, useState } from 'react';
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
import { showAlert } from '@/lib/alert';
import { getRemindersEnabled, remindersSupported, setRemindersEnabled } from '@/lib/reminders';

function useReminderSetting() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    getRemindersEnabled().then(setEnabled).catch(() => {});
  }, []);

  const toggle = async (value: boolean) => {
    setEnabled(value);
    const actual = await setRemindersEnabled(value);
    setEnabled(actual);
    if (value && !actual) {
      showAlert('Varsler er slått av', 'Gi Timeflyt lov til å sende varsler i innstillingene på telefonen for å få påminnelser.');
    }
  };

  return { enabled, toggle };
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, displayName, signOut } = useAuth();
  const { favoriteIds } = useFavorites();
  const { salon, setBusinessMode } = useBusiness();
  const reminders = useReminderSetting();
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
            <Text variant="caption" numberOfLines={1}>{user.email}</Text>
            {profile?.phone ? <Text variant="caption">{profile.phone}</Text> : null}
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
        <Section title="Konto">
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
            value={remindersSupported ? undefined : 'Bare i appen'}
            last
            right={
              remindersSupported ? (
                <Switch
                  value={reminders.enabled}
                  onValueChange={reminders.toggle}
                />
              ) : undefined
            }
          />
        </Section>
      )}

      {salon && (
        <Section title="Bedrift">
          <ListRow icon="storefront-outline" label="Gå til bedriftsmodus" value={salon.name} onPress={openBusiness} last />
        </Section>
      )}

      <Section title="Hjelp">
        <ListRow icon="help-circle-outline" label="Vanlige spørsmål" onPress={() => router.push('/help')} last={!!salon} />
        {!salon && <ListRow icon="storefront-outline" label="Timeflyt for bedrifter" onPress={openBusiness} last />}
      </Section>

      {user && (
        <Section title="Innlogging">
          <ListRow icon="log-out-outline" label="Logg ut" onPress={confirmSignOut} />
          <ListRow icon="trash-outline" label="Slett konto" destructive last onPress={() => router.push('/account/delete')} />
        </Section>
      )}

      <Text variant="caption" color={colors.textMuted} align="center" style={styles.version}>
        Timeflyt {version}
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
