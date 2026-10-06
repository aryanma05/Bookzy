import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogoMark } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { colors, radius } from '@/constants/theme';
import { authErrorMessage, useAuth } from '@/context/AuthContext';
import { haptics } from '@/lib/haptics';

type Mode = 'signIn' | 'signUp' | 'reset';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Tilbake dit brukeren kom fra (f.eks. salongen de ville booke hos)
  const close = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/explore');
    }
  };

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError(null);
    setInfo(null);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setError(null);
    setInfo(null);

    if (mode === 'signUp' && !name.trim()) {
      setError('Skriv inn navnet ditt.');
      return;
    }
    if (!email.trim()) {
      setError('Skriv inn e-postadressen din.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'reset') {
        await resetPassword(email);
        setInfo('Sjekk e-posten din – vi har sendt en lenke for å lage nytt passord.');
      } else {
        if (mode === 'signIn') {
          await signIn(email, password);
        } else {
          await signUp({ name, email, password, phone });
        }
        haptics.success();
        close();
      }
    } catch (e) {
      haptics.warning();
      setError(authErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel = mode === 'signIn' ? 'Logg inn' : mode === 'signUp' ? 'Opprett konto' : 'Send lenke';

  return (
    <View style={[styles.screen, { paddingTop: Platform.OS === 'ios' ? 12 : insets.top + 8 }]}>
      <View style={styles.topBar}>
        <IconButton icon="close" variant="soft" size={38} onPress={close} accessibilityLabel="Lukk" />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(400)} style={styles.brand}>
            <LogoMark height={52} />
            <Text variant="title" align="center">
              {mode === 'reset' ? 'Glemt passordet?' : mode === 'signUp' ? 'Lag din konto' : 'Velkommen tilbake'}
            </Text>
            <Text variant="body" color={colors.textSecondary} align="center">
              {mode === 'reset'
                ? 'Skriv inn e-postadressen din, så sender vi deg en lenke.'
                : 'Book timer, lagre favoritter og få påminnelser.'}
            </Text>
          </Animated.View>

          {mode !== 'reset' && (
            <SegmentedControl
              options={[
                { value: 'signIn', label: 'Logg inn' },
                { value: 'signUp', label: 'Ny bruker' },
              ]}
              value={mode}
              onChange={switchMode}
            />
          )}

          <View style={styles.fields}>
            {mode === 'signUp' && (
              <Animated.View entering={FadeIn.duration(250)}>
                <TextField
                  label="Navn"
                  icon="person-outline"
                  placeholder="Fornavn og etternavn"
                  value={name}
                  onChangeText={setName}
                  autoComplete="name"
                  textContentType="name"
                />
              </Animated.View>
            )}
            <TextField
              label="E-post"
              icon="mail-outline"
              placeholder="navn@eksempel.no"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
            {mode === 'signUp' && (
              <Animated.View entering={FadeIn.duration(250)}>
                <TextField
                  label="Telefon"
                  icon="call-outline"
                  placeholder="Mobilnummer"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  hint="Salongene bruker nummeret hvis noe endrer seg."
                />
              </Animated.View>
            )}
            {mode !== 'reset' && (
              <TextField
                label="Passord"
                icon="lock-closed-outline"
                placeholder={mode === 'signUp' ? 'Minst 6 tegn' : 'Passord'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
                onSubmitEditing={handleSubmit}
              />
            )}
          </View>

          {error && (
            <Animated.View entering={FadeIn} style={[styles.message, styles.errorBox]}>
              <Text variant="caption" color={colors.danger}>{error}</Text>
            </Animated.View>
          )}
          {info && (
            <Animated.View entering={FadeIn} style={[styles.message, styles.infoBox]}>
              <Text variant="caption" color={colors.success}>{info}</Text>
            </Animated.View>
          )}

          <Button title={submitLabel} loading={submitting} onPress={handleSubmit} />

          {mode === 'signIn' && (
            <Pressable onPress={() => switchMode('reset')} hitSlop={8} style={styles.link}>
              <Text variant="label" color={colors.primary} align="center">Glemt passordet?</Text>
            </Pressable>
          )}
          {mode === 'reset' && (
            <Pressable onPress={() => switchMode('signIn')} hitSlop={8} style={styles.link}>
              <Text variant="label" color={colors.primary} align="center">Tilbake til innlogging</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16 },
  content: { paddingHorizontal: 24, gap: 20, maxWidth: 480, width: '100%', alignSelf: 'center' },
  brand: { alignItems: 'center', gap: 8, marginBottom: 4 },
  fields: { gap: 14 },
  message: { padding: 12, borderRadius: radius.md },
  errorBox: { backgroundColor: colors.dangerSoft },
  infoBox: { backgroundColor: colors.successSoft },
  link: { paddingVertical: 4 },
});
