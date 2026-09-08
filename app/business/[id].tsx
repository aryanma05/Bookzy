import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig'; // Samme database-import som explore.tsx
import { useBookings } from '../context/BookingContext'; // Henter minnebanken vår

export default function BusinessScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  // Henter funksjonen for å legge til bestillinger fra Context
  const { addBooking } = useBookings();

  // State: Husker hvilken tid brukeren har klikket på akkurat nå
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Henter riktig salong fra Firestore basert på id fra URL-en.
  // Erstatter de gamle hardkodede verdiene (businessName, availableTimes, etc).
  const [salon, setSalon] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalon = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'salons', id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSalon({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.warn('Fant ingen salong med id:', id);
        }
      } catch (error) {
        console.error('Feil ved henting av salong: ', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSalon();
  }, [id]);

  // Funksjonen som kjører når man trykker på den store blå knappen
  const handleBooking = () => {
    if (!selectedTime) {
      Alert.alert("Obs!", "Vennligst velg et tidspunkt først.");
      return;
    }

    if (!salon) return;

    // Lager et bestillingsobjekt basert på ekte salongdata
    const newBooking = {
      id: Math.random().toString(), // Genererer en tilfeldig ID
      businessName: salon.name,
      time: selectedTime,
      service: salon.services?.[0]?.name || "Behandling",
      price: salon.services?.[0]?.price || "—"
    };

    // Legger bestillingen i "ryggsekken"
    addBooking(newBooking);
    
    Alert.alert(
      "Suksess!", 
      `Du har bestilt time hos ${salon.name} kl ${selectedTime}.`,
      [
        { 
          text: "OK", 
          // Sender brukeren rett til oversikten over bestillinger!
          onPress: () => router.navigate('/bookings') 
        }
      ]
    );
  };

  // Viser en laste-spinner mens vi henter salongen fra Firestore
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Laster salong...</Text>
      </View>
    );
  }

  // Viser en feilmelding hvis salongen ikke finnes
  if (!salon) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Fant ikke denne salongen.</Text>
        <Pressable style={styles.backButtonFallback} onPress={() => router.back()}>
          <Text style={styles.bookButtonText}>Gå tilbake</Text>
        </Pressable>
      </View>
    );
  }

  const availableTimes = salon.availableTimes || [];

  return (
    <View style={styles.container}>
      <View style={styles.coverImage}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </Pressable>
        
        {/* Viser ekte bilde hvis salon.imageUrl finnes, ellers grå plassholder */}
        {salon.imageUrl ? (
          <Image 
            source={{ uri: salon.imageUrl }} 
            style={styles.coverImagePhoto}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="image-outline" size={60} color="#ccc" />
        )}
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>{salon.name}</Text>
        <Text style={styles.subtitle}>📍 {salon.address}</Text>
        
        <View style={styles.ratingBox}>
          <Ionicons name="star" size={18} color="#FFD700" />
          <Text style={styles.ratingText}>{salon.rating || '5.0'} ({salon.reviews || 0} anmeldelser)</Text>
        </View>

        <Text style={styles.sectionTitle}>Tjenester</Text>
        {(salon.services || []).map((service: any, index: number) => (
          <View key={index} style={styles.serviceItem}>
            <View>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDuration}>{service.duration}</Text>
            </View>
            <Text style={styles.servicePrice}>{service.price}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Ledige timer i dag</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
          {availableTimes.map((time: string, index: number) => {
            // Sjekker om denne knappen er den som er valgt
            const isSelected = selectedTime === time;
            
            return (
              <Pressable 
                key={index} 
                // Gir knappen blå bakgrunn hvis den er valgt, hvit hvis ikke
                style={[styles.timeBadge, isSelected && styles.timeBadgeSelected]} 
                onPress={() => setSelectedTime(time)}
              >
                <Text style={[styles.timeText, isSelected && styles.timeTextSelected]}>
                  {time}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable 
          // Gjør knappen litt grå/gjennomsiktig hvis ingen tid er valgt
          style={[styles.bookButton, !selectedTime && { opacity: 0.5 }]} 
          onPress={handleBooking}
        >
          <Text style={styles.bookButtonText}>Bestill time</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { fontSize: 16, color: 'gray', marginBottom: 20 },
  backButtonFallback: { backgroundColor: '#007AFF', padding: 15, borderRadius: 12 },
  coverImage: { height: 200, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  coverImagePhoto: { width: '100%', height: '100%', position: 'absolute' },
  backButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'white', padding: 8, borderRadius: 20, zIndex: 1 },
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: 'gray', fontSize: 16, marginTop: 5, marginBottom: 15 },
  ratingBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  ratingText: { fontWeight: 'bold', marginLeft: 5, fontSize: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
  serviceItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  serviceName: { fontSize: 16, fontWeight: '600' },
  serviceDuration: { color: 'gray', marginTop: 4 },
  servicePrice: { fontSize: 16, fontWeight: 'bold' },
  timeScroll: { marginBottom: 40 },
  
  // Styling for tids-knappene
  timeBadge: { borderWidth: 1, borderColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginRight: 10 },
  timeBadgeSelected: { backgroundColor: '#007AFF' }, // Blå bakgrunn når valgt
  timeText: { color: '#007AFF', fontWeight: 'bold', fontSize: 16 },
  timeTextSelected: { color: 'white' }, // Hvit tekst når valgt
  
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: 'white' },
  bookButton: { backgroundColor: '#007AFF', padding: 18, borderRadius: 12, alignItems: 'center' },
  bookButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
