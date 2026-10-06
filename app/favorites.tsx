import { FlatList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SalonRow } from '@/components/salon-card';
import { EmptyState } from '@/components/ui/empty-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useSalons } from '@/context/SalonsContext';

export default function FavoritesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { favoriteIds } = useFavorites();
  const { salons } = useSalons();
  const favorites = salons.filter((salon) => favoriteIds.has(salon.id));

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Favoritter" />
      <FlatList
        data={favorites}
        keyExtractor={(salon) => salon.id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.duration(300).delay(Math.min(index, 6) * 40)}>
            <SalonRow salon={item} />
          </Animated.View>
        )}
        ListEmptyComponent={
          user ? (
            <EmptyState
              icon="heart-outline"
              title="Ingen favoritter ennå"
              message="Trykk på hjertet hos en salong for å lagre den her."
              actionLabel="Utforsk salonger"
              onAction={() => router.navigate('/search')}
            />
          ) : (
            <EmptyState
              icon="heart-outline"
              title="Logg inn for å lagre favoritter"
              actionLabel="Logg inn"
              onAction={() => router.push('/login')}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: 20, gap: 12 },
});
