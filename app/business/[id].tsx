import { View, Text, StyleSheet, Pressable, ScrollView, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useBookings } from '../context/BookingContext';

export default function BusinessScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { addBooking } = useBookings();

  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
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

  const handleBooking = () => {
    if (!selectedTime) {
      Alert.alert("Obs!", "Vennligst velg et tidspunkt forst.");
      return;
    }

    if (!selectedService) {
      Alert.alert("Obs!", "Vennligst velg en tjeneste forst.");
      return;
    }

    if (!salon) return;

    const newBooking = {
      id: Math.random().toString(),
      businessName: salon.name,
      time: selectedTime,
      service: selectedService.name,
      price: selectedService.price
    };

    addBooking(newBooking);
    
    Alert.alert(
      "Suksess!", 
      `Du har bestilt ${selectedService.name} hos ${salon.name} kl ${selectedTime}.`,
      [
        { 
          text: "OK", 
          onPress: () => router.navigate('/bookings') 
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Laster salong...</Text>
      </View>
    );
  }

  if (!salon) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Fant ikke denne salongen.</Text>
        <Pressable style={styles.backButtonFallback} onPress={() => router.back()}>
          <Text style={styles.bookButtonText}>Ga tilbake</Text>
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

        <Text style={styles.sectionTitle}>Velg tjeneste</Text>
        {(salon.services || []).map((service: any, index: number) => {
          const isSelected = selectedService === service;
          return (
            <Pressable
              key={index}
              style={[
                styles.serviceItem, 
                isSelected && styles.serviceItemSelected,
              ]}
              onPress={() => setSelectedService(service)}
            >
              <View style={styles.serviceLeft}>
                <View style={styles.serviceIconContainer}>
                  <Ionicons 
                    name={isSelected ? 'checkmark' : 'ellipse-outline'} 
                    size={24} 
                    color={isSelected ? '#007AFF' : '#ccc'} 
                  />
                </View>
                <View>
                  <Text style={[styles.serviceName, isSelected && styles.serviceNameSelected]}>
                    {service.name}
                  </Text>
                  <Text style={styles.serviceDuration}>{service.duration}</Text>
                </View>
              </View>
              <Text style={[styles.servicePrice, isSelected && styles.servicePriceSelected]}>
                {service.price}
              </Text>
            </Pressable>
          );
        })}

        <Text style={styles.sectionTitle}>Ledige timer i dag</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeScroll}>
          {availableTimes.map((time: string, index: number) => {
            const isSelected = selectedTime === time;
            
            return (
              <Pressable 
                key={index} 
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
  
  // Tjenester - tydeligere design
  serviceItem: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 16, 
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  serviceItemSelected: {
    backgroundColor: '#f0f8ff',
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  serviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceName: { fontSize: 16, fontWeight: '600', color: '#333' },
  serviceNameSelected: { fontWeight: 'bold', color: '#007AFF' },
  serviceDuration: { color: 'gray', marginTop: 4, fontSize: 14 },
  servicePrice: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  servicePriceSelected: { color: '#007AFF' },
  
  timeScroll: { marginBottom: 40, paddingLeft: 12 },
  timeBadge: { borderWidth: 1, borderColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginRight: 10 },
  timeBadgeSelected: { backgroundColor: '#007AFF' },
  timeText: { color: '#007AFF', fontWeight: 'bold', fontSize: 16 },
  timeTextSelected: { color: 'white' },
  
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: 'white' },
  bookButton: { backgroundColor: '#007AFF', padding: 18, borderRadius: 12, alignItems: 'center' },
  bookButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});