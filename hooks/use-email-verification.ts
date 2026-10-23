import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { showAlert } from '@/lib/alert';

/**
 * Om e-postadressen er bekreftet, og en funksjon som sender lenken på nytt.
 * Lenken åpnes i nettleseren, så vi sjekker på nytt hver gang skjermen kommer i fokus.
 */
export function useEmailVerification() {
  const { user, emailVerified, sendVerificationEmail, refreshEmailVerified } = useAuth();

  useFocusEffect(
    useCallback(() => {
      if (user?.email && !emailVerified) refreshEmailVerified().catch(() => {});
    }, [user, emailVerified, refreshEmailVerified])
  );

  // På nettet åpnes lenken ofte i en annen fane, og skjermen får ikke fokus på nytt når man kommer tilbake
  useEffect(() => {
    if (Platform.OS !== 'web' || !user?.email || emailVerified) return;
    const check = () => refreshEmailVerified().catch(() => {});
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, [user, emailVerified, refreshEmailVerified]);

  const send = async () => {
    try {
      await sendVerificationEmail();
      showAlert('Sjekk e-posten din', `Vi har sendt en lenke til ${user?.email}. Trykk på den, og kom tilbake hit.`);
    } catch (error) {
      const tooMany = (error as { code?: string } | null)?.code === 'auth/too-many-requests';
      showAlert(
        'Noe gikk galt',
        tooMany ? 'Vi har nettopp sendt en lenke. Vent litt før du prøver igjen.' : 'Kunne ikke sende e-posten. Prøv igjen.'
      );
    }
  };

  return { verified: emailVerified, send };
}
