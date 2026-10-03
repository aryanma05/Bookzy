import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function ExploreScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [salons, setSalons] = useState([]);
  const [loading, setLoading] = useState(true);

  const categories = ['Frisør', 'Massasje', 'Negler', 'Hudpleie', 'Voksing'];

  useEffect(() => {
    const fetchSalons = async () => {
      console.log("Prøver a hente salonger fra Firebase...");
      try {
        const querySnapshot = await getDocs(collection(db, 'salons'));
        const salonsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSalons(salonsList);
      } catch (error) {
        console.error("Feil ved henting av salonger: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalons();
  }, []);

  const filteredSalons = salons.filter(salon => {
    const lowerCaseSearch = searchQuery.toLowerCase();
    return (
      salon.name?.toLowerCase().includes(lowerCaseSearch) ||
      salon.category?.toLowerCase().includes(lowerCaseSearch) ||
      salon.address?.toLowerCase().includes(lowerCaseSearch)
    );
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Laster salonger...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        {/* Sokefelt */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="gray" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Sek etter frisr, massasje, sted..." 
            placeholderTextColor="gray"
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text)} 
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="gray" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Kategori-badges */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hva ser du etter?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((category, index) => (
            <Pressable 
              key={index} 
              style={({ pressed }) => [
                styles.categoryBadge,
                pressed && styles.categoryBadgePressed,
                searchQuery === category && styles.categoryBadgeActive,
              ]} 
              onPress={() => setSearchQuery(category)}
            >
              <Text style={styles.categoryText}>{category}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Salong-liste */}
      <View style={styles.section}>
        <View style={styles.resultsHeader}>
          <Text style={styles.sectionTitle}>Anbefalt nær deg</Text>
          <Text style={styles.resultsCount}>
            {filteredSalons.length} {filteredSalons.length === 1 ? 'salong' : 'salonger'}
          </Text>
        </View>
        
        {filteredSalons.length === 0 ? (
          <Text style={styles.noResultsText}>Fant dessverre ingen treff for "{searchQuery}"</Text>
        ) : (
          filteredSalons.map((salon) => (
            <Pressable 
              key={salon.id} 
              style={styles.businessCard}
              onPress={() => router.push(`/business/${salon.id}`)}
            >
              {salon.imageUrl ? (
                <Image 
                  source={{ uri: salon.imageUrl }} 
                  style={styles.salonImage}
                  resizeMode="cover"
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
                  <Ionicons name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingText}>{salon.rating || '5.0'}</Text>
                  <Text style={styles.reviewText}>({salon.reviews || 0} anmeldelser)</Text>
                </View>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 16, color: 'gray' },
  
  // Header
  header: { padding: 20, backgroundColor: '#fff', paddingTop: 50 },
  
  // Sokefelt
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 12, padding: 12 },
  searchInput: { marginLeft: 10, fontSize: 16, flex: 1 },
  
  // Seksjoner
  section: { marginTop: 10, paddingBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginBottom: 15 },
  
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
  
  // Resultat-header
  resultsHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginLeft: 20, 
    marginRight: 20, 
    marginBottom: 15 
  },
  resultsCount: { fontSize: 14, color: '#666', fontWeight: '500' },
  
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
  noResultsText: { marginHorizontal: 20, color: 'gray', fontStyle: 'italic', fontSize: 16 }
});