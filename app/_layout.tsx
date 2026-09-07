import { Stack } from 'expo-router';
import { BookingProvider } from './context/BookingContext';

export default function RootLayout() {
  return (
    // Nå pakker vi INN HELE APPEN i ryggsekken
    <BookingProvider>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Dette skjuler topp-menyen på innloggingssiden */}
        <Stack.Screen name="index" />
        
        {/* Dette skjuler den doble topp-menyen for fanene */}
        <Stack.Screen name="(tabs)" />
        
        {/* Dette forteller at business-siden eksisterer */}
        <Stack.Screen name="business/[id]" />
      </Stack>
    </BookingProvider>
  );
}