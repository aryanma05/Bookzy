import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useBookings } from '../context/BookingContext';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function BookingsScreen() {
  const { bookings } = useBookings(); // Henter alt fra ryggsekken vår
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Dine bestillinger</Text>
      
      {/* Hvis du ikke har noen bestillinger, vis en melding */}
      {bookings.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={60} color="#ccc" />
          <Text style={styles.emptyText}>Du har ingen kommende timer.</Text>
          <Pressable style={styles.exploreButton} onPress={() => router.navigate('/explore')}>
            <Text style={styles.exploreButtonText}>Finn en salong</Text>
          </Pressable>
        </View>
      ) : (
        /* Hvis du HAR bestillinger, vis dem i en liste */
        bookings.map((booking) => (
          <View key={booking.id} style={styles.bookingCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.businessName}>{booking.businessName}</Text>
              <Text style={styles.statusBadge}>Bekreftet</Text>
            </View>
            
            <View style={styles.cardBody}>
              <View style={styles.infoRow}>
                <Ionicons name="time-outline" size={20} color="gray" />
                <Text style={styles.infoText}>I dag kl {booking.time}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Ionicons name="cut-outline" size={20} color="gray" />
                <Text style={styles.infoText}>{booking.service} ({booking.price})</Text>
              </View>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 20, // Litt luft på toppen
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: 'gray',
    marginTop: 15,
    marginBottom: 25,
  },
  exploreButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
  },
  exploreButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000', // Gir boksen en liten skygge
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // Skygge for Android
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 15,
  },
  businessName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    backgroundColor: '#E8F5E9', // Lys grønn
    color: '#2E7D32', // Mørk grønn tekst
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    fontWeight: 'bold',
    overflow: 'hidden', // Trengs på iOS for at backgroundColor på Text skal ha borderRadius
  },
  cardBody: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  }
});