import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useBookings } from '../context/BookingContext'; // Henter minnebanken vår

export default function BusinessScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  // Henter funksjonen for å legge til bestillinger fra Context
  const { addBooking } = useBookings();

  // State: Husker hvilken tid brukeren har klikket på akkurat nå
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const availableTimes = ['10:00', '11:30', '13:00', '14:30', '16:00'];
  const businessName = "Oslo Frisør & Styling"; // Hardkodet for nå

  // Funksjonen som kjører når man trykker på den store blå knappen
  const handleBooking = () => {
    if (!selectedTime) {
      Alert.alert("Obs!", "Vennligst velg et tidspunkt først.");
      return;
    }

    // Lager et bestillingsobjekt
    const newBooking = {
      id: Math.random().toString(), // Genererer en tilfeldig ID
      businessName: businessName,
      time: selectedTime,
      service: "Herreklipp",
      price: "450 kr"
    };

    // Legger bestillingen i "ryggsekken"
    addBooking(newBooking);
    
    Alert.alert(
      "Suksess!", 
      `Du har bestilt time hos ${businessName} kl ${selectedTime}.`,
      [
        { 
          text: "OK", 
          // Sender brukeren rett til oversikten over bestillinger!
          onPress: () => router.navigate('/bookings') 
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.coverImage}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </Pressable>
        <Ionicons name="image-outline" size={60} color="#ccc" />
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.title}>{businessName}</Text>
        <Text style={styles.subtitle}>📍 Karl Johans gate 12, Oslo</Text>
        
        <View style={styles.ratingBox}>
          <Ionicons name="star" size={18} color="#FFD700" />
          <Text style={styles.ratingText}>4.9 (128 anmeldelser)</Text>
        </View>

        <Text style={styles.sectionTitle}>Tjenester</Text>
        <View style={styles.serviceItem}>
          <View>
            <Text style={styles.serviceName}>Herreklipp</Text>
            <Text style={styles.serviceDuration}>45 min</Text>
          </View>
          <Text style={styles.servicePrice}>450 kr</Text>
        </View>

        <Text style={styles.sectionTitle}>Ledige timer i dag</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
          {availableTimes.map((time, index) => {
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
  coverImage: { height: 200, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
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