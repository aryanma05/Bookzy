import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { showAlert } from '@/lib/alert';
import { formatDuration, formatPrice, formatRating, toSalon, type Salon } from '@/lib/salons';
import {
  formatDay,
  formatDayChip,
  fromDateKey,
  getAvailableTimes,
  hoursForDate,
  toDateKey,
  upcomingDates,
} from '@/lib/schedule';
import { useAuth } from '@/context/AuthContext';
import { SlotTakenError, useBookings } from '@/context/BookingContext';
import { useNow } from '@/hooks/use-now';
import { useTakenTimes } from '@/hooks/use-taken-times';

const BOOKING_DAYS_AHEAD = 14;

type SalonResult = { id: string; salon: Salon | null; error: boolean };

export default function BusinessScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const salonId = typeof params.id === 'string' && params.id ? params.id : null;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { createBooking } = useBookings();
  const now = useNow();

  const [result, setResult] = useState<SalonResult | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!salonId) return;
    let active = true;

    getDoc(doc(db, 'salons', salonId))
      .then((docSnap) => {
        if (active) {
          setResult({ id: salonId, salon: docSnap.exists() ? toSalon(docSnap.id, docSnap.data()) : null, error: false });
        }
      })
      .catch((error) => {
        console.error('Feil ved henting av salong: ', error);
        if (active) setResult({ id: salonId, salon: null, error: true });
      });

    return () => {
      active = false;
    };
  }, [salonId]);

  const dateKey = selectedDateKey ?? toDateKey(now);
  const takenTimes = useTakenTimes(salonId, dateKey);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/explore'));

  const current = salonId && result?.id === salonId ? result : null;

  if (salonId && !current) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Laster salong...</Text>
      </View>
    );
  }

  const salon = current?.salon;

  if (!salon) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>
          {current?.error ? 'Kunne ikke laste salongen. Sjekk nettet og prøv igjen.' : 'Fant ikke denne salongen.'}
        </Text>
        <Pressable style={styles.backButtonFallback} onPress={goBack}>
          <Text style={styles.bookButtonText}>Gå tilbake</Text>
        </Pressable>
      </View>
    );
  }

  const selectedService = salon.services.find((service) => service.id === selectedServiceId) ?? null;
  const selectedDate = fromDateKey(dateKey);
  const openingHours = hoursForDate(salon.openingHours, selectedDate);
  const availableTimes =
    selectedService && takenTimes.times
      ? getAvailableTimes({
          openingHours: salon.openingHours,
          date: selectedDate,
          durationMin: selectedService.durationMin,
          takenTimes: takenTimes.times,
          now,
        })
      : [];
  // Valgt tid nullstilles automatisk hvis den blir tatt eller ikke passer med ny tjeneste/dato
  const time = selectedTime && availableTimes.includes(selectedTime) ? selectedTime : null;

  const handleBooking = async () => {
    if (!selectedService || !time || submitting) return;

    if (!user) {
      router.push('/login');
      return;
    }

    setSubmitting(true);
    try {
      await createBooking({ salon, service: selectedService, date: dateKey, time });

      showAlert(
        'Timen er bestilt!',
        `${selectedService.name} hos ${salon.name}\n${formatDay(selectedDate, now)} kl ${time}`,
        [{ text: 'OK', onPress: () => router.navigate('/bookings') }]
      );
    } catch (error) {
      if (error instanceof SlotTakenError) {
        showAlert('Tiden er tatt', 'Noen andre booket akkurat denne tiden. Velg en annen tid.');
      } else {
        console.error('Kunne ikke lagre booking:', error);
        showAlert('Noe gikk galt', 'Kunne ikke lagre bookingen. Prøv igjen.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  let bookButtonLabel = 'Bestill time';
  if (!selectedService) bookButtonLabel = 'Velg en tjeneste';
  else if (!time) bookButtonLabel = 'Velg et tidspunkt';
  else if (!user) bookButtonLabel = 'Logg inn for å bestille';
  else bookButtonLabel = `Bestill · ${formatPrice(selectedService.priceNok)}`;

  const canBook = !!selectedService && !!time && !submitting;

  return (
    <View style={styles.container}>
      <View style={styles.coverImage}>
        {salon.imageUrl ? (
          <Image
            source={{ uri: salon.imageUrl }}
            style={styles.coverImagePhoto}
            contentFit="cover"
          />
        ) : (
          <Ionicons name="image-outline" size={60} color="#ccc" />
        )}

        <Pressable style={[styles.backButton, { top: insets.top + 8 }]} onPress={goBack} accessibilityLabel="Tilbake">
          <Ionicons name="arrow-back" size={24} color="black" />
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        <Text style={styles.title}>{salon.name}</Text>
        <Text style={styles.subtitle}>📍 {salon.address}</Text>

        <View style={styles.ratingBox}>
          {salon.rating !== null ? (
            <>
              <Ionicons name="star" size={18} color="#FFD700" />
              <Text style={styles.ratingText}>{formatRating(salon.rating)} ({salon.reviewCount} anmeldelser)</Text>
            </>
          ) : (
            <Text style={styles.ratingText}>Ny på Timeflyt</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Velg tjeneste</Text>
        {salon.services.length === 0 && (
          <Text style={styles.hintText}>Denne salongen har ikke lagt inn tjenester ennå.</Text>
        )}
        {salon.services.map((service) => {
          const isSelected = service.id === selectedServiceId;
          return (
            <Pressable
              key={service.id}
              style={[
                styles.serviceItem,
                isSelected && styles.serviceItemSelected,
              ]}
              onPress={() => setSelectedServiceId(service.id)}
            >
              <View style={styles.serviceLeft}>
                <View style={styles.serviceIconContainer}>
                  <Ionicons
                    name={isSelected ? 'checkmark' : 'ellipse-outline'}
                    size={24}
                    color={isSelected ? '#007AFF' : '#ccc'}
                  />
                </View>
                <View style={styles.serviceTextContainer}>
                  <Text style={[styles.serviceName, isSelected && styles.serviceNameSelected]}>
                    {service.name}
                  </Text>
                  <Text style={styles.serviceDuration}>{formatDuration(service.durationMin)}</Text>
                </View>
              </View>
              <Text style={[styles.servicePrice, isSelected && styles.servicePriceSelected]}>
                {formatPrice(service.priceNok)}
              </Text>
            </Pressable>
          );
        })}

        <Text style={styles.sectionTitle}>Velg dag</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
          {upcomingDates(now, BOOKING_DAYS_AHEAD).map((date) => {
            const key = toDateKey(date);
            const isSelected = key === dateKey;
            const isClosed = !hoursForDate(salon.openingHours, date);
            const { weekday, day } = formatDayChip(date);
            return (
              <Pressable
                key={key}
                style={[styles.dateChip, isSelected && styles.dateChipSelected, isClosed && styles.dateChipClosed]}
                onPress={() => setSelectedDateKey(key)}
              >
                <Text style={[styles.dateWeekday, isSelected && styles.dateTextSelected]}>{weekday}</Text>
                <Text style={[styles.dateDay, isSelected && styles.dateTextSelected]}>{day}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>Ledige tider {formatDay(selectedDate, now).toLowerCase()}</Text>
        {!openingHours ? (
          <Text style={styles.hintText}>Salongen er stengt denne dagen.</Text>
        ) : !selectedService ? (
          <Text style={styles.hintText}>
            Åpent {openingHours.open}–{openingHours.close}. Velg en tjeneste for å se ledige tider.
          </Text>
        ) : takenTimes.error ? (
          <Text style={styles.hintText}>Kunne ikke hente ledige tider. Sjekk nettet og prøv igjen.</Text>
        ) : !takenTimes.times ? (
          <ActivityIndicator style={styles.timesLoading} color="#007AFF" />
        ) : availableTimes.length === 0 ? (
          <Text style={styles.hintText}>Ingen ledige tider denne dagen. Prøv en annen dag.</Text>
        ) : (
          <View style={styles.timeGrid}>
            {availableTimes.map((availableTime) => {
              const isSelected = time === availableTime;
              return (
                <Pressable
                  key={availableTime}
                  style={[styles.timeBadge, isSelected && styles.timeBadgeSelected]}
                  onPress={() => setSelectedTime(availableTime)}
                >
                  <Text style={[styles.timeText, isSelected && styles.timeTextSelected]}>
                    {availableTime}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable
          style={[styles.bookButton, !canBook && styles.bookButtonDisabled]}
          onPress={handleBooking}
          disabled={!canBook}
        >
          {submitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.bookButtonText}>{bookButtonLabel}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  loadingText: { fontSize: 16, color: 'gray', marginTop: 15, marginBottom: 20, textAlign: 'center' },
  backButtonFallback: { backgroundColor: '#007AFF', padding: 15, borderRadius: 12 },
  coverImage: { height: 220, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  coverImagePhoto: { width: '100%', height: '100%', position: 'absolute' },
  backButton: { position: 'absolute', left: 20, backgroundColor: 'white', padding: 8, borderRadius: 20, zIndex: 1 },
  content: { flex: 1 },
  contentInner: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold' },
  subtitle: { color: 'gray', fontSize: 16, marginTop: 5, marginBottom: 15 },
  ratingBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  ratingText: { fontWeight: 'bold', marginLeft: 5, fontSize: 16 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, marginTop: 20 },
  hintText: { color: 'gray', fontSize: 15, lineHeight: 21 },

  // Tjenester
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
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
  serviceTextContainer: { flex: 1, marginRight: 10 },
  serviceName: { fontSize: 16, fontWeight: '600', color: '#333' },
  serviceNameSelected: { fontWeight: 'bold', color: '#007AFF' },
  serviceDuration: { color: 'gray', marginTop: 4, fontSize: 14 },
  servicePrice: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  servicePriceSelected: { color: '#007AFF' },

  // Datovelger
  dateScroll: { marginHorizontal: -20, paddingLeft: 20 },
  dateChip: {
    width: 64,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    marginRight: 8,
  },
  dateChipSelected: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  dateChipClosed: { opacity: 0.4 },
  dateWeekday: { fontSize: 13, color: 'gray', fontWeight: '600' },
  dateDay: { fontSize: 14, color: '#333', fontWeight: 'bold', marginTop: 2 },
  dateTextSelected: { color: 'white' },

  // Tider
  timesLoading: { alignSelf: 'flex-start', marginVertical: 10 },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeBadge: { borderWidth: 1, borderColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8 },
  timeBadgeSelected: { backgroundColor: '#007AFF' },
  timeText: { color: '#007AFF', fontWeight: 'bold', fontSize: 16 },
  timeTextSelected: { color: 'white' },

  footer: { paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#eee', backgroundColor: 'white' },
  bookButton: { backgroundColor: '#007AFF', padding: 18, borderRadius: 12, alignItems: 'center' },
  bookButtonDisabled: { opacity: 0.5 },
  bookButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});
