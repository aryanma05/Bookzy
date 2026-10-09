import { useEffect, useState } from 'react';
import { collection, doc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { toBooking, type Booking } from '@/context/BookingContext';
import { db } from '@/lib/firebase';

type RangeState = { key: string; bookings: Booking[]; error: boolean };

/** Alle timer hos salongen fra og med `fromKey` til og med `toKey`, live. `bookings` er null mens de lastes. */
export function useSalonBookings(salonId: string | null, fromKey: string, toKey: string) {
  const key = `${salonId}_${fromKey}_${toKey}`;
  const [state, setState] = useState<RangeState | null>(null);

  useEffect(() => {
    if (!salonId) return;
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('salonId', '==', salonId),
      where('date', '>=', fromKey),
      where('date', '<=', toKey)
    );
    return onSnapshot(
      bookingsQuery,
      (snapshot) => {
        const bookings = snapshot.docs
          .map((booking) => toBooking(booking.id, booking.data()))
          .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
        setState({ key, bookings, error: false });
      },
      (error) => {
        console.error('Kunne ikke hente kalenderen:', error);
        setState({ key, bookings: [], error: true });
      }
    );
  }, [salonId, fromKey, toKey, key]);

  const current = state?.key === key ? state : null;
  return { bookings: current?.bookings ?? null, error: current?.error ?? false };
}

/** Én time, live – så endringer fra kunden (f.eks. avbestilling) vises med en gang. */
export function useSalonBooking(bookingId: string | undefined) {
  const [state, setState] = useState<{ id: string; booking: Booking | null } | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    return onSnapshot(
      doc(db, 'bookings', bookingId),
      (snapshot) => setState({ id: bookingId, booking: snapshot.exists() ? toBooking(snapshot.id, snapshot.data()) : null }),
      (error) => {
        console.error('Kunne ikke hente timen:', error);
        setState({ id: bookingId, booking: null });
      }
    );
  }, [bookingId]);

  const current = state?.id === bookingId ? state : null;
  return { booking: current?.booking ?? null, loading: !!bookingId && current === null };
}

/** Kundens timer hos salongen, så man ser om det er en fast kunde eller en som pleier å utebli. */
export function useCustomerHistory(salonId: string | null, userId: string | null) {
  const key = `${salonId}_${userId}`;
  const [state, setState] = useState<{ key: string; bookings: Booking[] } | null>(null);

  useEffect(() => {
    if (!salonId || !userId) return;
    let active = true;
    getDocs(query(collection(db, 'bookings'), where('salonId', '==', salonId), where('userId', '==', userId)))
      .then((snapshot) => {
        if (active) setState({ key, bookings: snapshot.docs.map((booking) => toBooking(booking.id, booking.data())) });
      })
      .catch((error) => console.warn('Kunne ikke hente kundehistorikk:', error));
    return () => {
      active = false;
    };
  }, [salonId, userId, key]);

  return state?.key === key ? state.bookings : null;
}

/** Kommende, bekreftede timer hos salongen – brukes før man fjerner en ansatt eller legger inn fri. */
export async function fetchUpcomingBookings(salonId: string, fromKey: string, toKey = '9999-12-31'): Promise<Booking[]> {
  const snapshot = await getDocs(
    query(
      collection(db, 'bookings'),
      where('salonId', '==', salonId),
      where('date', '>=', fromKey),
      where('date', '<=', toKey)
    )
  );
  return snapshot.docs
    .map((booking) => toBooking(booking.id, booking.data()))
    .filter((booking) => booking.status === 'confirmed');
}
