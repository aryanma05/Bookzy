import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { BookingProvider } from '@/context/BookingContext';
import { OnboardingProvider, useOnboarding } from '@/context/OnboardingContext';

// Må kalles her i rot-layouten, ikke på en enkelt skjerm – ellers henger splash-skjermen
// hvis appen åpnes via en lenke rett til en annen side.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <OnboardingProvider>
        <BookingProvider>
          <RootNavigator />
        </BookingProvider>
      </OnboardingProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { initializing } = useAuth();
  const { ready: onboardingReady } = useOnboarding();
  const isReady = !initializing && onboardingReady;

  // Splash-skjermen står til vi vet om brukeren er innlogget og har sett onboarding.
  useEffect(() => {
    if (isReady) {
      SplashScreen.hide();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="business/[id]" />
      <Stack.Screen name="login" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
