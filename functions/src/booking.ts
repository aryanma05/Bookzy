import { FieldValue, getFirestore, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { clean, cleanMultiline, isDateKey, isTime, osloDateKey, osloTime } from './format';
import type { BookingInfo } from './messages';

const DAY = 24 * 60 * 60 * 1000;
const DOC_ID = /^[A-Za-z0-9_-]{1,100}$/;

/** Om verdien trygt kan brukes som dokument-ID (ingen skråstrek eller rare tegn). */
export function isDocId(value: unknown): value is string {
  return typeof value === 'string' && DOC_ID.test(value);
}

export type LoadedBooking = {
  info: BookingInfo;
  userId: string;
  ownerId: string | null;
  startAt: Date;
};

type Named = { id?: unknown; name?: unknown };

function findById(list: unknown, id: unknown): Named | undefined {
  if (!Array.isArray(list)) return undefined;
  return list.find((item: Named | null) => item?.id === id && typeof item?.name === 'string');
}

/** «Vippeløft + Brynsfarge»: tjenesten og tilleggene kunden valgte, med navnene fra salongen. Tomt hvis tjenesten er borte. */
export function serviceTitle(services: unknown, serviceId: unknown, addOnIds: unknown): string {
  const service = findById(services, serviceId);
  if (!service) return '';
  const addOns = Array.isArray(addOnIds) ? addOnIds.slice(0, 5).map((id) => findById(services, id)) : [];
  return clean([service, ...addOns].map((item) => item?.name).filter(Boolean).join(' + '), 200);
}

/**
 * Samler det varslene trenger. Navn på salong, tjeneste og ansatt hentes fra salongen,
 * ikke fra bookingen – den skrives av kunden, og reglene sjekker ikke at navnene stemmer.
 */
export async function loadBooking(id: string, data: DocumentData, salonData?: DocumentData): Promise<LoadedBooking | null> {
  if (typeof data.userId !== 'string' || !isDocId(data.salonId)) return null;
  if (!(data.startAt instanceof Timestamp)) return null;

  const salon = salonData ?? (await getFirestore().collection('salons').doc(data.salonId).get()).data();
  if (!salon) return null;

  const startAt = data.startAt.toDate();
  const staff = findById(salon.staff, data.staffId);

  return {
    userId: data.userId,
    ownerId: typeof salon.ownerId === 'string' ? salon.ownerId : null,
    startAt,
    info: {
      id,
      customerName: clean(data.customerName, 80),
      customerPhone: clean(data.customerPhone, 20),
      note: cleanMultiline(data.note, 500),
      salonName: clean(salon.name, 80) || 'Salongen',
      salonPhone: clean(salon.phone, 20),
      // Adressen på timen skrives av salongen når den godkjenner, og er skjult på salongen
      salonPlace: clean(data.address, 120) || clean(salon.address, 120) || clean(salon.area, 60),
      serviceName: serviceTitle(salon.services, data.serviceId, data.addOnIds) || 'Timen',
      staffName: clean(staff?.name, 60),
      priceNok: typeof data.priceNok === 'number' && data.priceNok >= 0 ? data.priceNok : 0,
      durationMin: typeof data.durationMin === 'number' && data.durationMin > 0 ? Math.min(data.durationMin, 600) : 30,
      // Samme dato og tid som i salongens kalender
      date: isDateKey(data.date) ? data.date : osloDateKey(startAt),
      time: isTime(data.time) ? data.time : osloTime(startAt),
      cancellableUntil: data.cancellableUntil instanceof Timestamp ? data.cancellableUntil.toDate() : null,
      cancelReason: clean(data.cancelReason, 200),
    },
  };
}

/** Den gamle timen når kunden har flyttet en time, ellers null. */
export async function movedFrom(data: DocumentData, salonData: DocumentData | undefined): Promise<LoadedBooking | null> {
  const oldId = data.replacesBookingId;
  if (!isDocId(oldId)) return null;

  const old = await getFirestore().collection('bookings').doc(oldId).get();
  const oldData = old.data();
  // Feltet settes av kunden, så vi sjekker at den gamle timen tilhører samme kunde og er avbestilt
  if (!oldData || oldData.userId !== data.userId || oldData.salonId !== data.salonId || oldData.status !== 'cancelled') {
    return null;
  }
  return loadBooking(oldId, oldData, salonData);
}

/** Om en avbestilt time ble erstattet av en ny (kunden flyttet den). */
export async function wasMoved(id: string, data: DocumentData): Promise<boolean> {
  const replacements = await getFirestore().collection('bookings').where('replacesBookingId', '==', id).limit(5).get();
  return replacements.docs.some((doc) => doc.get('userId') === data.userId && doc.get('salonId') === data.salonId);
}

/**
 * Sørger for at hvert varsel bare sendes én gang, selv om Firestore leverer samme hendelse flere ganger.
 * Returnerer false hvis noen allerede har tatt det.
 */
export async function claim(key: string): Promise<boolean> {
  try {
    await getFirestore()
      .collection('sentNotifications')
      .doc(key)
      .create({ createdAt: FieldValue.serverTimestamp(), expireAt: Timestamp.fromMillis(Date.now() + 30 * DAY) });
    return true;
  } catch (error) {
    // 6 = ALREADY_EXISTS
    if ((error as { code?: number }).code === 6) return false;
    throw error;
  }
}

export type Preferences = { reminders: boolean; salonEmails: boolean };

/** Innstillingene ligger i users/{uid}. Mangler de, er alt slått på. */
export async function preferences(uid: string): Promise<Preferences> {
  const profile = await getFirestore().collection('users').doc(uid).get();
  return {
    reminders: profile.get('reminders') !== false,
    salonEmails: profile.get('salonEmails') !== false,
  };
}
