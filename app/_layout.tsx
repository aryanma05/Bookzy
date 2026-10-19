import { useEffect, type ReactElement, type ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
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
import { WebHeader } from '@/components/web-header';
import { colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { BookingProvider } from '@/context/BookingContext';
import { BusinessProvider, useBusiness } from '@/context/BusinessContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { LocationProvider } from '@/context/LocationContext';
import { OnboardingProvider, useOnboarding } from '@/context/OnboardingContext';
import { SalonsProvider } from '@/context/SalonsContext';
import { usePushRegistration } from '@/lib/push';

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
  const { user, initializing } = useAuth();
  const { ready: onboardingReady } = useOnboarding();
  const { modeReady } = useBusiness();
  const isReady = fontsReady && !initializing && onboardingReady && modeReady;

  useEffect(() => {
    if (isReady) {
      SplashScreen.hide();
    }
  }, [isReady]);

  usePushRegistration(user?.uid ?? null);
  useOpenBookingFromNotification(isReady);

  if (!isReady) {
    return null;
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
        screenLayout={Platform.OS === 'web' ? webScreenLayout : undefined}
      >
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

// Bestillingsflyten på nettsiden: toppmeny og en smal kolonne på PC i stedet for full bredde
const WEB_COLUMN_ROUTES = new Set(['book/[salonId]', 'book/confirm', 'book/success', 'booking/[id]', 'login']);

function webScreenLayout({ route, children }: { route: { name: string }; children: ReactElement }) {
  return WEB_COLUMN_ROUTES.has(route.name) ? <WebColumn>{children}</WebColumn> : children;
}

function WebColumn({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  // Samme oppbygning på alle bredder, så skjermen ikke starter på nytt når vinduet endrer størrelse
  return (
    <View style={styles.webScreen}>
      {wide && <WebHeader />}
      <View style={[styles.webContent, wide && styles.webColumn]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  webScreen: { flex: 1, backgroundColor: colors.background },
  webContent: { flex: 1, width: '100%' },
  webColumn: { maxWidth: 640, alignSelf: 'center' },
});

const BOOKING_ID = /^[A-Za-z0-9_-]{1,100}$/;

/** Trykk på et varsel åpner timen det gjelder – i kalenderen hvis varselet var til salongen. */
function useOpenBookingFromNotification(enabled: boolean) {
  const router = useRouter();
  const { setBusinessMode } = useBusiness();

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;

    const open = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data ?? {};
      const bookingId = data.bookingId;
      if (typeof bookingId !== 'string' || !BOOKING_ID.test(bookingId)) return;
      if (data.view === 'salon') {
        setBusinessMode(true);
        router.push(`/business/booking/${bookingId}`);
      } else {
        router.push(`/booking/${bookingId}`);
      }
    };

    const last = Notifications.getLastNotificationResponse();
    if (last) {
      open(last);
      Notifications.clearLastNotificationResponse();
    }
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [enabled, router, setBusinessMode]);
}
