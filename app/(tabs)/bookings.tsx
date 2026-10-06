import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useBookings, type Booking } from '@/context/BookingContext';
import { useNow } from '@/hooks/use-now';
import { showAlert } from '@/lib/alert';
import { formatDuration, formatPrice } from '@/lib/salons';
import { formatDay } from '@/lib/schedule';

export default function BookingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { bookings, loading, error, cancelBooking } = useBookings();
  const now = useNow();

  const confirmCancel = (booking: Booking) => {
    showAlert(
      'Avbestille timen?',
      `${booking.serviceName} hos ${booking.salonName}, ${formatDay(booking.startAt, now).toLowerCase()} kl ${booking.time}.`,
      [
        { text: 'Behold timen', style: 'cancel' },
        {
          text: 'Avbestill',
          style: 'destructive',
          onPress: () => {
            cancelBooking(booking).catch((cancelError) => {
              console.error('Kunne ikke avbestille:', cancelError);
              showAlert('Noe gikk galt', 'Kunne ikke avbestille timen. Prøv igjen.');
            });
          },
        },
      ]
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <Text style={styles.header}>Dine bestillinger</Text>
          <View style={styles.emptyState}>
            <Ionicons name="person-circle-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>Logg inn for å se timene dine.</Text>
            <Pressable style={styles.primaryButton} onPress={() => router.push('/login')}>
              <Text style={styles.primaryButtonText}>Logg inn</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const upcoming = bookings.filter(
    (booking) => booking.status === 'confirmed' && booking.startAt.getTime() > now.getTime()
  );
  // Tidligere og avbestilte timer, nyeste først
  const past = bookings.filter((booking) => !upcoming.includes(booking)).reverse();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.header}>Dine bestillinger</Text>

        {loading ? (
          <ActivityIndicator style={styles.loading} size="large" color="#007AFF" />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <>
            {upcoming.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={60} color="#ccc" />
                <Text style={styles.emptyText}>Du har ingen kommende timer.</Text>
                <Pressable style={styles.primaryButton} onPress={() => router.navigate('/explore')}>
                  <Text style={styles.primaryButtonText}>Finn en salong</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Kommende</Text>
                {upcoming.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    now={now}
                    onPress={() => router.push(`/business/${booking.salonId}`)}
                    onCancel={() => confirmCancel(booking)}
                  />
                ))}
              </>
            )}

            {past.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Tidligere og avbestilte</Text>
                {past.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    now={now}
                    onPress={() => router.push(`/business/${booking.salonId}`)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BookingCard({
  booking,
  now,
  onPress,
  onCancel,
}: {
  booking: Booking;
  now: Date;
  onPress: () => void;
  onCancel?: () => void;
}) {
  const isCancelled = booking.status === 'cancelled';
  const isPast = booking.startAt.getTime() <= now.getTime();
  const status = isCancelled
    ? { label: 'Avbestilt', style: styles.statusCancelled }
    : isPast
      ? { label: 'Fullført', style: styles.statusDone }
      : { label: 'Bekreftet', style: styles.statusConfirmed };

  return (
    <Pressable style={[styles.bookingCard, (isCancelled || isPast) && styles.bookingCardMuted]} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.businessName}>{booking.salonName}</Text>
        <Text style={[styles.statusBadge, status.style]}>{status.label}</Text>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={20} color="gray" />
          <Text style={styles.infoText}>{formatDay(booking.startAt, now)} kl {booking.time}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="cut-outline" size={20} color="gray" />
          <Text style={styles.infoText}>
            {booking.serviceName} ({formatDuration(booking.durationMin)}, {formatPrice(booking.priceNok)})
          </Text>
        </View>
      </View>

      {onCancel && (
        <Pressable style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Avbestill</Text>
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    color: 'gray',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 15,
    marginBottom: 10,
  },
  loading: {
    marginTop: 100,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    marginTop: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 16,
    color: 'gray',
    marginTop: 15,
    marginBottom: 25,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
  },
  primaryButtonText: {
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
  bookingCardMuted: {
    opacity: 0.7,
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
    flex: 1,
    marginRight: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    fontWeight: 'bold',
    overflow: 'hidden', // Trengs på iOS for at backgroundColor på Text skal ha borderRadius
  },
  statusConfirmed: {
    backgroundColor: '#E8F5E9', // Lys grønn
    color: '#2E7D32', // Mørk grønn tekst
  },
  statusDone: {
    backgroundColor: '#EEEEEE',
    color: '#555',
  },
  statusCancelled: {
    backgroundColor: '#FDECEA',
    color: '#C62828',
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
    flex: 1,
  },
  cancelButton: {
    marginTop: 15,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF3B30',
    alignItems: 'center',
  },
  cancelText: {
    color: '#FF3B30',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
