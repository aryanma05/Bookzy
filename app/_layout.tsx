import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { BookingProvider } from '@/context/BookingContext';
import { BusinessProvider, useBusiness } from '@/context/BusinessContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { LocationProvider } from '@/context/LocationContext';
import { OnboardingProvider, useOnboarding } from '@/context/OnboardingContext';
import { SalonsProvider } from '@/context/SalonsContext';

// Må kalles her i rot-layouten, ikke på en enkelt skjerm – ellers henger splash-skjermen
// hvis appen åpnes via en lenke rett til en annen side.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  return (
    <AuthProvider>
      <OnboardingProvider>
        <LocationProvider>
          <SalonsProvider>
            <FavoritesProvider>
              <BookingProvider>
                <BusinessProvider>
                  <RootNavigator fontsReady={fontsLoaded || !!fontError} />
                </BusinessProvider>
              </BookingProvider>
            </FavoritesProvider>
          </SalonsProvider>
        </LocationProvider>
      </OnboardingProvider>
    </AuthProvider>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { initializing } = useAuth();
  const { ready: onboardingReady } = useOnboarding();
  const { modeReady } = useBusiness();
  const isReady = fontsReady && !initializing && onboardingReady && modeReady;

  useEffect(() => {
    if (isReady) {
      SplashScreen.hide();
    }
  }, [isReady]);

  useOpenBookingFromNotification(isReady);

  if (!isReady) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="business" options={{ animation: 'fade' }} />
        <Stack.Screen name="login" options={{ presentation: 'modal' }} />
        <Stack.Screen name="review/[bookingId]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="book/success" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
    </>
  );
}

/** Trykk på en påminnelse åpner timen den gjelder. */
function useOpenBookingFromNotification(enabled: boolean) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;

    const open = (response: Notifications.NotificationResponse) => {
      const bookingId = response.notification.request.content.data?.bookingId;
      if (typeof bookingId === 'string') router.push(`/booking/${bookingId}`);
    };

    const last = Notifications.getLastNotificationResponse();
    if (last) {
      open(last);
      Notifications.clearLastNotificationResponse();
    }
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [enabled, router]);
}
