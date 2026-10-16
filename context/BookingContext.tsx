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
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { registerForPush } from '@/lib/push';
import { slotId, slotTimesFor, toStartDate } from '@/lib/schedule';
import type { Salon, Service } from '@/lib/salons';
import { useAuth } from './AuthContext';

export type BookingStatus = 'confirmed' | 'cancelled' | 'noShow';

export type Booking = {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  salonId: string;
  salonName: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  staffName: string;
  durationMin: number;
  priceNok: number;
  date: string;
  time: string;
  note: string;
  startAt: Date;
  endAt: Date;
  cancellableUntil: Date;
  slotIds: string[];
  status: BookingStatus;
  /** Satt når salongen avbestilte. Kunden avbestiller uten å sette feltet. */
  cancelledBy: 'salon' | null;
  createdAt: Date | null;
};

export type NewBooking = {
  salon: Salon;
  service: Service;
  /** null = første ledige ansatt */
  staffId: string | null;
  date: string;
  time: string;
  phone: string;
  note: string;
  /** Satt når en eksisterende time flyttes – den avbestilles i samme transaksjon. */
  replaces?: Booking;
};

type BookingContextType = {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  createBooking: (booking: NewBooking) => Promise<string>;
  cancelBooking: (booking: Booking) => Promise<void>;
};

/** Kastes når noen andre har booket tiden mens brukeren valgte. */
export class SlotTakenError extends Error {}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

const toDate = (value: unknown) => (value instanceof Timestamp ? value.toDate() : new Date(0));

export function toBooking(id: string, data: DocumentData): Booking {
  return {
    id,
    userId: data.userId ?? '',
    customerName: data.customerName ?? '',
    customerPhone: data.customerPhone ?? '',
    salonId: data.salonId,
    salonName: data.salonName,
    serviceId: data.serviceId ?? '',
    serviceName: data.serviceName,
    staffId: data.staffId ?? '',
    staffName: data.staffName ?? '',
    durationMin: data.durationMin,
    priceNok: data.priceNok,
    date: data.date,
    time: data.time,
    note: data.note ?? '',
    startAt: toDate(data.startAt),
    endAt: toDate(data.endAt),
    cancellableUntil: data.cancellableUntil ? toDate(data.cancellableUntil) : toDate(data.startAt),
    slotIds: data.slotIds ?? [],
    status: data.status,
    cancelledBy: data.cancelledBy === 'salon' ? 'salon' : null,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
  };
}

export function canCancel(booking: Booking, now: Date) {
  return booking.status === 'confirmed' && now.getTime() < booking.cancellableUntil.getTime();
}

// Knyttes til uid slik at bookinger fra en tidligere innlogget bruker aldri vises for en ny.
type BookingSnapshot = { uid: string; bookings: Booking[]; error: string | null };

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const { user, displayName } = useAuth();
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
        setSnapshot({ uid, bookings: [], error: 'Kunne ikke hente timene dine.' });
      }
    );
  }, [uid]);

  const current = uid && snapshot?.uid === uid ? snapshot : null;

  const createBooking = async ({ salon, service, staffId, date, time, phone, note, replaces }: NewBooking) => {
    if (!user) throw new Error('Du må være logget inn for å booke.');

    const bookingRef = doc(collection(db, 'bookings'));
    const times = slotTimesFor(time, service.durationMin);
    const startAt = toStartDate(date, time);
    const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);
    const cancellableUntil = new Date(startAt.getTime() - salon.cancellationHours * 60 * 60 * 1000);

    // Ved «hvem som helst» prøves de ansatte i tilfeldig rekkefølge, så timene fordeles jevnt.
    const candidates = staffId
      ? salon.staff.filter((member) => member.id === staffId)
      : [...salon.staff].sort(() => Math.random() - 0.5);

    await runTransaction(db, async (transaction) => {
      let chosen: { staff: (typeof candidates)[number]; refs: DocumentReference[] } | null = null;

      for (const staff of candidates) {
        const refs = times.map((slotTime) => doc(db, 'slots', slotId(salon.id, staff.id, date, slotTime)));
        const existing = await Promise.all(refs.map((ref) => transaction.get(ref)));
        if (existing.every((slot) => !slot.exists())) {
          chosen = { staff, refs };
          break;
        }
      }
      if (!chosen) throw new SlotTakenError();

      transaction.set(bookingRef, {
        userId: user.uid,
        customerName: displayName,
        customerPhone: phone.trim(),
        note: note.trim(),
        salonId: salon.id,
        salonName: salon.name,
        serviceId: service.id,
        serviceName: service.name,
        staffId: chosen.staff.id,
        staffName: chosen.staff.name,
        durationMin: service.durationMin,
        priceNok: service.priceNok,
        date,
        time,
        startAt: Timestamp.fromDate(startAt),
        endAt: Timestamp.fromDate(endAt),
        cancellableUntil: Timestamp.fromDate(cancellableUntil),
        slotIds: chosen.refs.map((ref) => ref.id),
        status: 'confirmed',
        createdAt: serverTimestamp(),
        // Så varslene kan si «flyttet» i stedet for én avbestilling og én ny booking
        ...(replaces ? { replacesBookingId: replaces.id } : {}),
      });

      const staff = chosen.staff;
      chosen.refs.forEach((ref, index) => {
        transaction.set(ref, { salonId: salon.id, staffId: staff.id, date, time: times[index], bookingId: bookingRef.id });
      });

      if (replaces) {
        transaction.update(doc(db, 'bookings', replaces.id), { status: 'cancelled', cancelledAt: serverTimestamp() });
        replaces.slotIds.forEach((id) => transaction.delete(doc(db, 'slots', id)));
      }
    });

    // Påminnelsen sendes fra serveren. Rett etter en booking er et naturlig tidspunkt å spørre om varsler.
    registerForPush(user.uid, { ask: true });
    return bookingRef.id;
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
