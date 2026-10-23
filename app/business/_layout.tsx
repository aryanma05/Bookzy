import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBusiness } from '@/context/BusinessContext';

export default function BusinessLayout() {
  const { user } = useAuth();
  const { salon, loading } = useBusiness();

  // Vent til vi vet om brukeren eier en salong, ellers sendes lenker til f.eks. en time rett til forsiden
  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="register" />
      </Stack.Protected>
      <Stack.Protected guard={!!user && !!salon}>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="booking/[id]" />
        <Stack.Screen name="service/[id]" />
        <Stack.Screen name="staff/index" />
        <Stack.Screen name="staff/[id]" />
        <Stack.Screen name="hours" />
        <Stack.Screen name="days-off" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="photos" />
        <Stack.Screen name="availability" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
