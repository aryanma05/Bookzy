import { logger } from 'firebase-functions';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { expoAccessToken, isEmulator } from './config';
import { postJson } from './http';
import type { Push } from './messages';

const SEND_URL = 'https://exp.host/--/api/v2/push/send';
const RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const DAY = 24 * 60 * 60 * 1000;

/** Hvilken side i appen varselet åpner. */
export type PushView = 'customer' | 'salon';

/** Må stemme med kanalene i lib/push.ts i appen. */
type Channel = 'bookings' | 'reminders';

type Ticket = { status: 'ok'; id: string } | { status: 'error'; message?: string; details?: { error?: string } };
type Receipt = { status: 'ok' } | { status: 'error'; message?: string; details?: { error?: string } };

function authHeaders() {
  return { authorization: `Bearer ${expoAccessToken.value()}` };
}

/**
 * Sender til alle enhetene brukeren er logget inn på. Returnerer hvor mange Expo tok imot,
 * så den som kaller kan falle tilbake på e-post når ingen enheter kan nås.
 */
export async function sendPush(
  uid: string,
  push: Push,
  { bookingId, view, channel, expiresAt }: { bookingId: string; view: PushView; channel: Channel; expiresAt?: Date }
): Promise<number> {
  const db = getFirestore();
  // En enhet hører til den som sist logget inn på den, se pushTokens i firestore.rules
  const devices = await db.collection('pushTokens').where('uid', '==', uid).limit(10).get();
  if (devices.empty) return 0;

  if (isEmulator) {
    logger.info(`Push (ikke sendt i emulatoren): ${push.title}`, { uid, body: push.body, devices: devices.size });
    return devices.size;
  }

  const ttl = expiresAt ? Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000)) : undefined;
  const messages = devices.docs.map((device) => ({
    to: device.id,
    title: push.title,
    body: push.body,
    // Bare ID-er – navn og andre detaljer står i selve varselteksten
    data: { bookingId, view },
    channelId: channel,
    sound: 'default',
    priority: 'high',
    ...(ttl ? { ttl } : {}),
  }));

  const response = (await postJson(SEND_URL, messages, authHeaders())) as { data?: Ticket[] };
  const tickets = Array.isArray(response.data) ? response.data : [];
  const batch = db.batch();
  let accepted = 0;

  tickets.forEach((ticket, index) => {
    const device = devices.docs[index];
    if (!device) return;
    if (ticket.status === 'ok') {
      accepted++;
      // Kvitteringen sjekkes senere, se checkPushReceipts
      batch.set(db.collection('pushTickets').doc(ticket.id), {
        token: device.id,
        createdAt: FieldValue.serverTimestamp(),
        expireAt: Timestamp.fromMillis(Date.now() + DAY),
      });
    } else if (ticket.details?.error === 'DeviceNotRegistered') {
      batch.delete(device.ref);
    } else {
      logger.warn('Expo avviste et push-varsel', { error: ticket.details?.error ?? ticket.message });
    }
  });

  await batch.commit();
  return accepted;
}

/** Fjerner enheter som Expo sier ikke lenger kan få varsler (f.eks. fordi appen er slettet). */
export async function checkPushReceipts(): Promise<void> {
  if (isEmulator) return;
  const db = getFirestore();
  const tickets = await db
    .collection('pushTickets')
    .where('createdAt', '<=', Timestamp.fromMillis(Date.now() - 15 * 60 * 1000))
    .limit(500)
    .get();
  if (tickets.empty) return;

  const response = (await postJson(RECEIPTS_URL, { ids: tickets.docs.map((ticket) => ticket.id) }, authHeaders())) as {
    data?: Record<string, Receipt>;
  };
  const receipts = response.data ?? {};
  const writer = db.bulkWriter();

  for (const ticket of tickets.docs) {
    const receipt = receipts[ticket.id];
    if (receipt?.status === 'error') {
      if (receipt.details?.error === 'DeviceNotRegistered') {
        writer.delete(db.collection('pushTokens').doc(String(ticket.get('token'))));
      } else {
        logger.warn('Push-varsel kom ikke frem', { error: receipt.details?.error ?? receipt.message });
      }
    }
    writer.delete(ticket.ref);
  }

  await writer.close();
}
