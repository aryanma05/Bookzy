import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CATEGORIES, formatPrice, formatRating, toSalon, type Salon } from '@/lib/salons';

async function fetchSalons(): Promise<Salon[]> {
  const querySnapshot = await getDocs(collection(db, 'salons'));
  return querySnapshot.docs
    .map((doc) => toSalon(doc.id, doc.data()))
    .sort((a, b) => a.name.localeCompare(b.name, 'nb'));
}

function matchesSearch(salon: Salon, search: string) {
  const fields = [salon.name, salon.category, salon.address, ...salon.services.map((s) => s.name)];
  return fields.some((field) => field.toLowerCase().includes(search));
}

export default function ExploreScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [salons, setSalons] = useState<Salon[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    fetchSalons()
      .then((list) => {
        if (!active) return;
        setSalons(list);
        setLoadError(false);
      })
      .catch((error) => {
        console.error('Feil ved henting av salonger: ', error);
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = () => {
    setRefreshing(true);
    setReloadKey((key) => key + 1);
  };

  if (salons === null) {
    return (
      <View style={styles.loadingContainer}>
        {loadError ? (
          <>
            <Ionicons name="cloud-offline-outline" size={48} color="#ccc" />
            <Text style={styles.loadingText}>Kunne ikke laste salonger.</Text>
            <Pressable style={styles.retryButton} onPress={reload} disabled={refreshing}>
              <Text style={styles.retryText}>Prøv igjen</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Laster salonger...</Text>
          </>
        )}
      </View>
    );
  }

  const search = searchQuery.trim().toLowerCase();
  const filteredSalons = salons.filter(
    (salon) =>
      (!selectedCategory || salon.category === selectedCategory) &&
      (!search || matchesSearch(salon, search))
  );

  const header = (
    <>
      <View style={styles.header}>
        {/* Søkefelt */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="gray" />
          <TextInput
            style={styles.searchInput}
            placeholder="Søk etter salong, behandling, sted..."
            placeholderTextColor="gray"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="gray" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Kategori-badges (trykk igjen for å fjerne filteret) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hva ser du etter?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {CATEGORIES.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <Pressable
                key={category}
                style={({ pressed }) => [
                  styles.categoryBadge,
                  pressed && styles.categoryBadgePressed,
                  isActive && styles.categoryBadgeActive,
                ]}
                onPress={() => setSelectedCategory(isActive ? null : category)}
              >
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{category}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loadError && (
        <Text style={styles.inlineError}>Kunne ikke oppdatere listen. Dra ned for å prøve igjen.</Text>
      )}

      <View style={styles.resultsHeader}>
        <Text style={styles.sectionTitle}>{search || selectedCategory ? 'Resultater' : 'Alle salonger'}</Text>
        <Text style={styles.resultsCount}>
          {filteredSalons.length} {filteredSalons.length === 1 ? 'salong' : 'salonger'}
        </Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={filteredSalons}
        keyExtractor={(salon) => salon.id}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <Text style={styles.noResultsText}>
            {search ? `Fant dessverre ingen treff for «${searchQuery.trim()}»` : 'Ingen salonger her ennå.'}
          </Text>
        }
        refreshing={refreshing}
        onRefresh={reload}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item: salon }) => (
          <Pressable
            style={styles.businessCard}
            onPress={() => router.push(`/business/${salon.id}`)}
          >
            {salon.imageUrl ? (
              <Image
                source={{ uri: salon.imageUrl }}
                style={styles.salonImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="image-outline" size={40} color="#ccc" />
              </View>
            )}

            <View style={styles.businessInfo}>
              <Text style={styles.businessName}>{salon.name}</Text>
              <Text style={styles.businessType}>{salon.category} • {salon.address}</Text>

              <View style={styles.ratingContainer}>
                {salon.rating !== null ? (
                  <>
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <Text style={styles.ratingText}>{formatRating(salon.rating)}</Text>
                    <Text style={styles.reviewText}>({salon.reviewCount} anmeldelser)</Text>
                  </>
                ) : (
                  <Text style={styles.newBadge}>Ny</Text>
                )}
              </View>

              {salon.services.length > 0 && (
                <Text style={styles.priceFrom}>
                  Fra {formatPrice(Math.min(...salon.services.map((s) => s.priceNok)))}
                </Text>
              )}
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 15, fontSize: 16, color: 'gray' },
  retryButton: { marginTop: 20, backgroundColor: '#007AFF', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 20 },
  retryText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  // Header
  header: { padding: 20, paddingTop: 12, backgroundColor: '#fff' },

  // Søkefelt
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 12, padding: 12 },
  searchInput: { marginLeft: 10, fontSize: 16, flex: 1 },

  // Seksjoner
  section: { marginTop: 10, paddingBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginBottom: 15 },
  inlineError: { color: '#FF3B30', marginHorizontal: 20, marginBottom: 15 },

  // Kategori-badges
  categoryScroll: { paddingLeft: 20 },
  categoryBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryBadgePressed: { opacity: 0.7, transform: [{ scale: 0.95 }] },
  categoryBadgeActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  categoryText: { color: '#333', fontWeight: '600', fontSize: 14 },
  categoryTextActive: { color: 'white' },

  // Resultat-header
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginRight: 20,
  },
  resultsCount: { fontSize: 14, color: '#666', fontWeight: '500', marginBottom: 15 },

  // Salong-kort
  businessCard: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  imagePlaceholder: {
    width: 100,
    height: 100,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  salonImage: { width: 100, height: 100, borderRadius: 16, backgroundColor: '#f0f0f0' },
  businessInfo: { marginLeft: 15, flex: 1, justifyContent: 'center' },
  businessName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  businessType: { color: 'gray', fontSize: 14, marginBottom: 8 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontWeight: 'bold', marginLeft: 4 },
  reviewText: { color: 'gray', marginLeft: 4 },
  newBadge: { color: '#007AFF', fontWeight: 'bold' },
  priceFrom: { color: '#333', marginTop: 6, fontSize: 14 },
  noResultsText: { marginHorizontal: 20, color: 'gray', fontStyle: 'italic', fontSize: 16 }
});
