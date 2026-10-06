import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { colors } from '@/constants/theme';
import { authErrorMessage, useAuth } from '@/context/AuthContext';
import { showAlert } from '@/lib/alert';
import { haptics } from '@/lib/haptics';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, displayName, saveProfile, resetPassword } = useAuth();

  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameValue = name ?? (profile?.name || displayName);
  const phoneValue = phone ?? profile?.phone ?? '';

  const save = async () => {
    if (!nameValue.trim()) {
      setError('Navnet kan ikke være tomt.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await saveProfile({ name: nameValue, phone: phoneValue });
      haptics.success();
      router.back();
    } catch (saveError) {
      console.error('Kunne ikke lagre profil:', saveError);
      showAlert('Noe gikk galt', 'Kunne ikke lagre endringene. Prøv igjen.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = () => {
    if (!user?.email) return;
    resetPassword(user.email)
      .then(() => showAlert('Sjekk e-posten din', `Vi har sendt en lenke for å lage nytt passord til ${user.email}.`))
      .catch((resetError) => showAlert('Noe gikk galt', authErrorMessage(resetError)));
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Personlige opplysninger" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.avatar}>
            <Avatar name={nameValue || '?'} size={84} />
          </View>
          <TextField label="Navn" icon="person-outline" value={nameValue} onChangeText={setName} autoComplete="name" error={error} />
          <TextField
            label="Telefonnummer"
            icon="call-outline"
            value={phoneValue}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            hint="Brukes av salongene hvis noe endrer seg med timen din."
          />
          <TextField label="E-post" icon="mail-outline" value={user?.email ?? ''} editable={false} />
          <Button title="Endre passord" variant="ghost" size="md" onPress={changePassword} />
          <Text variant="caption" color={colors.textMuted} align="center">
            Vi deler bare navn og telefonnummer med salongene du booker hos.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
        <Button title="Lagre" loading={saving} onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: { padding: 20, gap: 16 },
  avatar: { alignItems: 'center', marginVertical: 8 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
