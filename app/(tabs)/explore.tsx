import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig'; // Henter databasen din

export default function ExploreScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [salons, setSalons] = useState([]); // Her lagrer vi dataene fra Firebase
  const [loading, setLoading] = useState(true); // For å vise en "laster..." sirkel

  const categories = ['Frisør', 'Massasje', 'Negler', 'Hudpleie', 'Voksing'];

  // Henter data fra Firebase når siden lastes
  useEffect(() => {
    const fetchSalons = async () => {
      console.log("Prøver å hente salonger fra Firebase...");
      try {
        // Henter alt fra 'salons'-samlingen i databasen
        const querySnapshot = await getDocs(collection(db, 'salons'));
        const salonsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSalons(salonsList);
      } catch (error) {
        console.error("Feil ved henting av salonger: ", error);
      } finally {
        setLoading(false); // Slutter å laste når vi har data (eller feil)
      }
    };

    fetchSalons();
  }, []);

  // Filtrerer listen basert på søkeordet (akkurat som før)
  const filteredSalons = salons.filter(salon => {
    const lowerCaseSearch = searchQuery.toLowerCase();
    return (
      salon.name?.toLowerCase().includes(lowerCaseSearch) ||
      salon.category?.toLowerCase().includes(lowerCaseSearch) ||
      salon.address?.toLowerCase().includes(lowerCaseSearch)
    );
  });

  // Hvis appen laster, vis en liten spinner
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
        <Text style={styles.greeting}>Hei, Aryan! 👋</Text>
        <Text style={styles.subGreeting}>Klar for litt velvære?</Text>
        
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="gray" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Søk etter frisør, massasje, sted..." 
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hva ser du etter?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((category, index) => (
            <Pressable key={index} style={styles.categoryBadge} onPress={() => setSearchQuery(category)}>
              <Text style={styles.categoryText}>{category}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Anbefalt nær deg</Text>
        
        {filteredSalons.length === 0 ? (
          <Text style={styles.noResultsText}>Fant dessverre ingen treff for "{searchQuery}"</Text>
        ) : (
          filteredSalons.map((salon) => (
            <Pressable 
              key={salon.id} 
              style={styles.businessCard}
              onPress={() => router.push(`/business/${salon.id}`)}
            >
              {/* Viser ekte bilde hvis salon.imageUrl finnes, ellers grå plassholder */}
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
  header: { padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  greeting: { fontSize: 24, fontWeight: 'bold' },
  subGreeting: { fontSize: 16, color: 'gray', marginTop: 5 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 12, padding: 12, marginTop: 20 },
  searchInput: { marginLeft: 10, fontSize: 16, flex: 1 },
  section: { marginTop: 10, paddingBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 20, marginBottom: 15 },
  categoryScroll: { paddingLeft: 20 },
  categoryBadge: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginRight: 10 },
  categoryText: { color: 'white', fontWeight: '600' },
  businessCard: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 20, backgroundColor: '#fff' },
  imagePlaceholder: { width: 90, height: 90, backgroundColor: '#f0f0f0', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  salonImage: { width: 90, height: 90, borderRadius: 12, backgroundColor: '#f0f0f0' },
  businessInfo: { marginLeft: 15, flex: 1, justifyContent: 'center' },
  businessName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  businessType: { color: 'gray', fontSize: 14, marginBottom: 8 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontWeight: 'bold', marginLeft: 4 },
  reviewText: { color: 'gray', marginLeft: 4 },
  noResultsText: { marginHorizontal: 20, color: 'gray', fontStyle: 'italic', fontSize: 16 }
});