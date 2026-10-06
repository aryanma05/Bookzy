import { useState } from 'react';
import {
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authErrorMessage, useAuth } from '@/context/AuthContext';

type Mode = 'signIn' | 'signUp' | 'reset';

const TITLES: Record<Mode, string> = {
  signIn: 'Logg inn',
  signUp: 'Opprett konto',
  reset: 'Glemt passord',
};

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
        setInfo('Vi har sendt deg en e-post med en lenke for å lage nytt passord.');
      } else {
        if (mode === 'signIn') {
          await signIn(email, password);
        } else {
          await signUp(name, email, password);
        }
        close();
      }
    } catch (e) {
      setError(authErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.closeButton} onPress={close} accessibilityLabel="Lukk">
            <Ionicons name="close" size={28} color="#333" />
          </Pressable>

          <Text style={styles.title}>{TITLES[mode]}</Text>
          <Text style={styles.subtitle}>
            {mode === 'reset'
              ? 'Skriv inn e-postadressen din, så sender vi deg en lenke.'
              : 'Du trenger en konto for å bestille og se timene dine.'}
          </Text>

          {mode === 'signUp' && (
            <TextInput
              style={styles.input}
              placeholder="Navn"
              placeholderTextColor="gray"
              value={name}
              onChangeText={setName}
              autoComplete="name"
              textContentType="name"
            />
          )}

          <TextInput
            style={styles.input}
            placeholder="E-post"
            placeholderTextColor="gray"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />

          {mode !== 'reset' && (
            <TextInput
              style={styles.input}
              placeholder="Passord"
              placeholderTextColor="gray"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
              textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
              onSubmitEditing={handleSubmit}
            />
          )}

          {error && <Text style={styles.error}>{error}</Text>}
          {info && <Text style={styles.info}>{info}</Text>}

          <Pressable
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitText}>
                {mode === 'reset' ? 'Send lenke' : TITLES[mode]}
              </Text>
            )}
          </Pressable>

          {mode === 'signIn' && (
            <Pressable onPress={() => switchMode('reset')}>
              <Text style={styles.link}>Glemt passordet?</Text>
            </Pressable>
          )}

          <Pressable onPress={() => switchMode(mode === 'signIn' ? 'signUp' : 'signIn')}>
            <Text style={styles.link}>
              {mode === 'signIn' ? 'Ny her? Opprett konto' : 'Har du konto? Logg inn'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24 },
  closeButton: { alignSelf: 'flex-end', padding: 4, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 30, lineHeight: 22 },
  input: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  error: { color: '#FF3B30', fontSize: 15, marginBottom: 12 },
  info: { color: '#2E7D32', fontSize: 15, marginBottom: 12 },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  link: { color: '#007AFF', fontSize: 16, textAlign: 'center', paddingVertical: 10 },
});
