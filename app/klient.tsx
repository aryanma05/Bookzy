import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';

export default function KlientScreen() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>Dette er Klient-siden</Text>
      <Button title="Gå tilbake" onPress={() => router.back()} />
    </View>
  );
}