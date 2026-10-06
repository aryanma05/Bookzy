import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { Booking } from '@/context/BookingContext';
import { fetchReviewedBookingIds } from '@/lib/reviews';

/** Fullførte timer som kan anmeldes, og hvilke som allerede er anmeldt. Oppdateres når skjermen får fokus. */
export function useReviewedBookings(bookings: Booking[], now: Date) {
  const [reviewed, setReviewed] = useState<Set<string> | null>(null);
  const completedIds = bookings
    .filter((booking) => booking.status === 'confirmed' && booking.endAt.getTime() <= now.getTime())
    .map((booking) => booking.id);
  const key = completedIds.join(',');

  useFocusEffect(
    useCallback(() => {
      if (!key) return;
      let active = true;
      fetchReviewedBookingIds(key.split(','))
        .then((ids) => {
          if (active) setReviewed(ids);
        })
        .catch((error) => console.warn('Kunne ikke hente anmeldelser:', error));
      return () => {
        active = false;
      };
    }, [key])
  );

  return {
    reviewed,
    needsReview: (bookingId: string) => reviewed !== null && completedIds.includes(bookingId) && !reviewed.has(bookingId),
  };
}
