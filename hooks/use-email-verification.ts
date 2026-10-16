import { useCallback } from 'react';
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
      if (user && !emailVerified) refreshEmailVerified().catch(() => {});
    }, [user, emailVerified, refreshEmailVerified])
  );

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
