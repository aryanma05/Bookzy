import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { shortId, slugify, toSalon, type LocationType, type Salon } from '@/lib/salons';
import { toDateKey, type OpeningHours } from '@/lib/schedule';
import type { Booking } from './BookingContext';
import { useAuth } from './AuthContext';

const MODE_KEY = 'timeflyt:businessMode';

// Salongens ID er også lenken (bookzy.no/{id}), så den kan ikke hete det samme som en side i appen
const RESERVED_IDS = new Set([
  'account', 'assets', 'book', 'booking', 'bookings', 'business', 'explore', 'favicon', 'favorites',
  'help', 'icon', 'index', 'login', 'privacy', 'profile', 'review', 'salon', 'search',
]);

/** Feltene eieren kan endre. Må stemme med editableSalonFields() i firestore.rules. */
export type SalonChanges = Partial<
  Pick<
    Salon,
    | 'name'
    | 'category'
    | 'description'
    | 'address'
    | 'area'
    | 'phone'
    | 'locationType'
    | 'services'
    | 'staff'
    | 'openingHours'
    | 'flexibleHours'
    | 'closedDates'
    | 'cancellationHours'
    | 'published'
    | 'photos'
  >
>;

export type NewBusiness = {
  name: string;
  category: string;
  locationType: LocationType;
  address: string;
  area: string;
  phone: string;
  ownerName: string;
  ownerTitle: string;
};

type BusinessContextType = {
  /** Salongen den innloggede brukeren eier, eller null. */
  salon: Salon | null;
  loading: boolean;
  /** Om appen skal åpne i bedriftsmodus neste gang. */
  businessMode: boolean;
  modeReady: boolean;
  setBusinessMode: (enabled: boolean) => void;
  createBusiness: (input: NewBusiness) => Promise<string>;
  saveSalon: (changes: SalonChanges) => Promise<void>;
  cancelAsSalon: (booking: Booking) => Promise<void>;
  setNoShow: (booking: Booking, noShow: boolean) => Promise<void>;
};

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

const DEFAULT_HOURS: OpeningHours = {
  mon: { open: '09:00', close: '17:00' },
  tue: { open: '09:00', close: '17:00' },
  wed: { open: '09:00', close: '17:00' },
  thu: { open: '09:00', close: '17:00' },
  fri: { open: '09:00', close: '17:00' },
  sat: null,
  sun: null,
};

// Firestore godtar ikke undefined, så valgfrie felt tas bare med når de har en verdi.
function editableData(salon: Salon, changes: SalonChanges) {
  const next = { ...salon, ...changes };
  const today = toDateKey(new Date());
  return {
    name: next.name.trim(),
    category: next.category,
    description: next.description.trim(),
    address: next.address.trim(),
    area: next.area.trim(),
    phone: (next.phone ?? '').trim(),
    locationType: next.locationType,
    services: next.services.map(({ id, name, category, durationMin, priceNok, description, imageUrl }) => ({
      id,
      name,
      category,
      durationMin,
      priceNok,
      ...(description ? { description } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    })),
    staff: next.staff.map(({ id, name, title }) => ({ id, name, title })),
    openingHours: next.openingHours,
    // Bare når den er i bruk, så lagring virker også hvis appen er ute før de nye reglene er deployet
    ...('flexibleHours' in changes || salon.flexibleHours ? { flexibleHours: next.flexibleHours } : {}),
    // Fridager som har vært, trengs ikke lenger
    closedDates: [...new Set(next.closedDates)].filter((key) => key.slice(0, 10) >= today).sort(),
    cancellationHours: next.cancellationHours,
    published: next.published,
    photos: next.photos,
    updatedAt: serverTimestamp(),
  };
}

type SalonSnapshot = { uid: string; salon: Salon | null };

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user, initializing } = useAuth();
  const uid = user?.uid ?? null;
  const [snapshot, setSnapshot] = useState<SalonSnapshot | null>(null);
  const [businessMode, setMode] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY)
      .then((value) => setMode(value === 'true'))
      .catch(() => setMode(false));
  }, []);

  const setBusinessMode = (enabled: boolean) => {
    setMode(enabled);
    AsyncStorage.setItem(MODE_KEY, String(enabled)).catch((error) => console.warn('Kunne ikke lagre modus:', error));
  };

  // Neste person som logger inn på enheten skal starte som kunde
  useEffect(() => {
    if (initializing || uid || !businessMode) return;
    setMode(false);
    AsyncStorage.setItem(MODE_KEY, 'false').catch(() => {});
  }, [initializing, uid, businessMode]);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(collection(db, 'salons'), where('ownerId', '==', uid)),
      (result) => {
        const first = result.docs[0];
        setSnapshot({ uid, salon: first ? toSalon(first.id, first.data()) : null });
      },
      (error) => {
        console.error('Kunne ikke hente bedriften:', error);
        setSnapshot({ uid, salon: null });
      }
    );
  }, [uid]);

  const current = uid && snapshot?.uid === uid ? snapshot : null;
  const salon = current?.salon ?? null;

  const createBusiness = async (input: NewBusiness) => {
    if (!user) throw new Error('Du må være logget inn.');
    // Bare navnet når det er ledig, ellers fire tegn bak. Tar noen andre det samtidig, avviser reglene den siste.
    const slug = slugify(input.name) || 'salong';
    const free = !RESERVED_IDS.has(slug) && !(await getDoc(doc(db, 'salons', slug))).exists();
    const id = free ? slug : `${slug}-${shortId().slice(0, 4)}`;
    await setDoc(doc(db, 'salons', id), {
      ownerId: user.uid,
      name: input.name.trim(),
      category: input.category,
      description: '',
      address: input.address.trim(),
      area: input.area.trim(),
      phone: input.phone.trim(),
      locationType: input.locationType,
      services: [],
      staff: [{ id: shortId(), name: input.ownerName.trim(), title: input.ownerTitle.trim() }],
      openingHours: DEFAULT_HOURS,
      closedDates: [],
      cancellationHours: 24,
      published: false,
      ratingSum: 0,
      reviewCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  };

  const saveSalon = async (changes: SalonChanges) => {
    if (!salon) throw new Error('Fant ikke bedriften.');
    await updateDoc(doc(db, 'salons', salon.id), editableData(salon, changes));
  };

  const cancelAsSalon = async (booking: Booking) => {
    const batch = writeBatch(db);
    batch.update(doc(db, 'bookings', booking.id), {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancelledBy: 'salon',
    });
    // Tiden blir ledig for andre kunder igjen
    booking.slotIds.forEach((id) => batch.delete(doc(db, 'slots', id)));
    await batch.commit();
  };

  const setNoShow = (booking: Booking, noShow: boolean) =>
    updateDoc(doc(db, 'bookings', booking.id), { status: noShow ? 'noShow' : 'confirmed' });

  return (
    <BusinessContext.Provider
      value={{
        salon,
        loading: uid !== null && current === null,
        businessMode: businessMode === true,
        modeReady: businessMode !== null,
        setBusinessMode,
        createBusiness,
        saveSalon,
        cancelAsSalon,
        setNoShow,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness må brukes innenfor en BusinessProvider');
  }
  return context;
}
