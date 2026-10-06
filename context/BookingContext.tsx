import React, { createContext, useState, useContext, useEffect } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { slotId, slotTimesFor, toStartDate } from '@/lib/schedule';
import type { Salon, Service } from '@/lib/salons';
import { useAuth } from './AuthContext';

export type BookingStatus = 'confirmed' | 'cancelled';

export type Booking = {
  id: string;
  salonId: string;
  salonName: string;
  serviceName: string;
  durationMin: number;
  priceNok: number;
  date: string;
  time: string;
  startAt: Date;
  slotIds: string[];
  status: BookingStatus;
};

type NewBooking = {
  salon: Salon;
  service: Service;
  date: string;
  time: string;
};

type BookingContextType = {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  createBooking: (booking: NewBooking) => Promise<void>;
  cancelBooking: (booking: Booking) => Promise<void>;
};

/** Kastes når noen andre har booket en av lukene mens brukeren valgte tid. */
export class SlotTakenError extends Error {}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

function toBooking(id: string, data: DocumentData): Booking {
  return {
    id,
    salonId: data.salonId,
    salonName: data.salonName,
    serviceName: data.serviceName,
    durationMin: data.durationMin,
    priceNok: data.priceNok,
    date: data.date,
    time: data.time,
    startAt: data.startAt instanceof Timestamp ? data.startAt.toDate() : new Date(0),
    slotIds: data.slotIds ?? [],
    status: data.status,
  };
}

// Knyttes til uid slik at bookinger fra en tidligere innlogget bruker aldri vises for en ny.
type BookingSnapshot = { uid: string; bookings: Booking[]; error: string | null };

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [snapshot, setSnapshot] = useState<BookingSnapshot | null>(null);

  useEffect(() => {
    if (!uid) return;

    // Sorteres i appen i stedet for med orderBy, så spørringen ikke trenger en sammensatt indeks.
    const bookingsQuery = query(collection(db, 'bookings'), where('userId', '==', uid));

    return onSnapshot(
      bookingsQuery,
      (result) => {
        const bookings = result.docs
          .map((booking) => toBooking(booking.id, booking.data()))
          .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
        setSnapshot({ uid, bookings, error: null });
      },
      (error) => {
        console.error('Kunne ikke hente bookinger:', error);
        setSnapshot({ uid, bookings: [], error: 'Kunne ikke hente bestillingene dine.' });
      }
    );
  }, [uid]);

  const current = uid && snapshot?.uid === uid ? snapshot : null;

  const createBooking = async ({ salon, service, date, time }: NewBooking) => {
    if (!user) throw new Error('Du må være logget inn for å booke.');

    const bookingRef = doc(collection(db, 'bookings'));
    const times = slotTimesFor(time, service.durationMin);
    const slotRefs = times.map((slotTime) => doc(db, 'slots', slotId(salon.id, date, slotTime)));
    const startAt = toStartDate(date, time);
    const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);

    // Hver luke er et eget dokument som bare kan opprettes én gang (se firestore.rules),
    // så to kunder kan aldri få samme tid.
    await runTransaction(db, async (transaction) => {
      const existing = await Promise.all(slotRefs.map((ref) => transaction.get(ref)));
      if (existing.some((slot) => slot.exists())) {
        throw new SlotTakenError();
      }

      transaction.set(bookingRef, {
        userId: user.uid,
        customerName: user.displayName ?? user.email ?? '',
        salonId: salon.id,
        salonName: salon.name,
        serviceId: service.id,
        serviceName: service.name,
        durationMin: service.durationMin,
        priceNok: service.priceNok,
        date,
        time,
        startAt: Timestamp.fromDate(startAt),
        endAt: Timestamp.fromDate(endAt),
        slotIds: slotRefs.map((ref) => ref.id),
        status: 'confirmed',
        createdAt: serverTimestamp(),
      });

      slotRefs.forEach((ref, index) => {
        transaction.set(ref, { salonId: salon.id, date, time: times[index], bookingId: bookingRef.id });
      });
    });
  };

  const cancelBooking = async (booking: Booking) => {
    const batch = writeBatch(db);
    batch.update(doc(db, 'bookings', booking.id), {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
    });
    // Frigjør lukene så andre kan booke tiden.
    booking.slotIds.forEach((id) => batch.delete(doc(db, 'slots', id)));
    await batch.commit();
  };

  return (
    <BookingContext.Provider
      value={{
        bookings: current?.bookings ?? [],
        loading: uid !== null && current === null,
        error: current?.error ?? null,
        createBooking,
        cancelBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBookings() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBookings må brukes innenfor en BookingProvider');
  }
  return context;
}
