import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { ConfirmationResult } from 'firebase/auth';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { colors } from '@/constants/theme';
import { authErrorMessage, useAuth } from '@/context/AuthContext';
import { showAlert } from '@/lib/alert';
import { sendSmsCode, smsSignInSupported } from '@/lib/auth';
import { haptics } from '@/lib/haptics';
import { formatPhone, toE164 } from '@/lib/phone';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, displayName, saveProfile, resetPassword, confirmSmsCode } = useAuth();

  const [name, setName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [code, setCode] = useState('');
  const [smsError, setSmsError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  const nameValue = name ?? (profile?.name || displayName);
  // Logget inn med SMS: nummeret er bekreftet og følger innloggingen
  const verifiedPhone = user?.phoneNumber ?? null;
  const phoneValue = verifiedPhone ?? phone ?? profile?.phone ?? '';
  // Ellers gir SMS-innlogging en ny, tom konto ved siden av e-postkontoen
  const canLink = smsSignInSupported && !!user?.email && !verifiedPhone;

  const linkPhone = async () => {
    if (!user || linking) return;
    const number = toE164(phoneValue);
    if (!number) {
      setSmsError('Skriv inn et gyldig mobilnummer.');
      return;
    }
    if (confirmation && !/^\d{6}$/.test(code.trim())) {
      setSmsError('Skriv inn den sekssifrede koden fra SMS-en.');
      return;
    }
    setSmsError(null);
    setLinking(true);
    try {
      if (!confirmation) {
        setConfirmation(await sendSmsCode(number, user));
        return;
      }
      await confirmSmsCode(confirmation, code, nameValue);
      setConfirmation(null);
      setCode('');
      haptics.success();
    } catch (linkError) {
      haptics.warning();
      setSmsError(authErrorMessage(linkError));
    } finally {
      setLinking(false);
    }
  };

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
          <TextField label="Navn" icon="person-outline" value={nameValue} onChangeText={setName} autoComplete="name" maxLength={80} error={error} />
          <TextField
            label="Telefonnummer"
            icon="call-outline"
            value={verifiedPhone ? formatPhone(verifiedPhone) : phoneValue}
            onChangeText={(value) => {
              setPhone(value);
              setSmsError(null);
            }}
            editable={!verifiedPhone && !confirmation}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={20}
            error={confirmation ? undefined : smsError}
            hint={
              verifiedPhone
                ? 'Bekreftet med SMS. Du kan logge inn med dette nummeret.'
                : canLink
                  ? 'Bekreft nummeret med SMS, så kan du også logge inn med det.'
                  : 'Brukes av salongene hvis noe endrer seg med timen din.'
            }
          />
          {confirmation && (
            <>
              <TextField
                label="Kode fra SMS"
                icon="keypad-outline"
                value={code}
                onChangeText={(value) => {
                  setCode(value);
                  setSmsError(null);
                }}
                keyboardType="number-pad"
                autoComplete="sms-otp"
                textContentType="oneTimeCode"
                placeholder="123456"
                maxLength={6}
                autoFocus
                error={smsError}
                onSubmitEditing={linkPhone}
              />
              <Pressable
                onPress={() => {
                  setConfirmation(null);
                  setCode('');
                  setSmsError(null);
                }}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text variant="label" color={colors.primary}>Endre nummer eller send ny kode</Text>
              </Pressable>
            </>
          )}
          {canLink && (
            <Button
              title={confirmation ? 'Bekreft koden' : 'Bekreft med SMS'}
              variant="outline"
              size="md"
              icon="chatbubble-outline"
              loading={linking}
              onPress={linkPhone}
            />
          )}
          {user?.email && (
            <>
              <TextField label="E-post" icon="mail-outline" value={user.email} editable={false} />
              <Button title="Endre passord" variant="ghost" size="md" onPress={changePassword} />
            </>
          )}
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
