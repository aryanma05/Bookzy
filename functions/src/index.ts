// Varsler til salong og kunde. Kjører på serveren, så de virker uansett om appen er åpen,
// og også for dem som bruker Bookzy på nettet.
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { logger, setGlobalOptions } from 'firebase-functions';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/firestore';
import { onRequest } from 'firebase-functions/https';
import { onSchedule } from 'firebase-functions/scheduler';
import { region } from 'firebase-functions/v1';
import { claim, isDocId, loadBooking, movedFrom, preferences, wasMoved, type LoadedBooking } from './booking';
import { appLink, expoAccessToken, resendApiKey, sveveApiKey } from './config';
import { sendEmail, verifiedEmail } from './email';
import { reminderTime } from './format';
import { previewHtml, toPreview } from './link';
import * as messages from './messages';
import { checkPushReceipts, sendPush } from './push';
import { sendSms, verifiedPhone } from './sms';

initializeApp();

const REGION = 'europe-west1';
setGlobalOptions({ region: REGION, maxInstances: 10 });

const secrets = [resendApiKey, expoAccessToken, sveveApiKey];

/** Kjører alle oppgavene, også om en av dem feiler, og logger det som gikk galt. */
async function settle(bookingId: string, tasks: Promise<unknown>[]) {
  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === 'rejected') {
      logger.error('Kunne ikke sende varsel', { bookingId, error: String(result.reason) });
    }
  }
}

async function notifySalon(booking: LoadedBooking, push: messages.Push, email: messages.Email, key: string) {
  const ownerId = booking.ownerId;
  if (!ownerId) return;
  const [prefs, address] = await Promise.all([preferences(ownerId), verifiedEmail(ownerId)]);
  await settle(booking.info.id, [
    sendPush(ownerId, push, { bookingId: booking.info.id, view: 'salon', channel: 'bookings' }),
    prefs.salonEmails && address ? sendEmail(address, email, `${key}/salon`) : Promise.resolve(),
  ]);
}

/** E-post til en bekreftet adresse. Uten den får de som booket med bare mobilnummer `sms`, hvis den er med. */
async function notifyCustomer(booking: LoadedBooking, email: messages.Email, key: string, sms?: string) {
  const address = await verifiedEmail(booking.userId);
  if (address) return sendEmail(address, email, `${key}/customer`);
  if (!sms) return;
  const phone = await verifiedPhone(booking.userId);
  if (phone) await sendSms(phone, sms, `${key}/customer`);
}

/** Påminnelsen sendes av sendReminders. Er timen for nær, blir det ingen. */
async function saveReminder(booking: LoadedBooking, bookedAt: Date) {
  const remindAt = reminderTime(booking.startAt, bookedAt);
  if (!remindAt) return;
  await getFirestore()
    .collection('reminders')
    .doc(booking.info.id)
    .set({ remindAt: Timestamp.fromDate(remindAt), userId: booking.userId });
}

export const onBookingCreated = onDocumentCreated({ document: 'bookings/{bookingId}', secrets }, async (event) => {
  const snapshot = event.data;
  const data = snapshot?.data();
  if (!snapshot || !data || !isDocId(data.salonId)) return;
  // Hos salonger som godkjenner bookinger selv, er en ny booking en forespørsel
  const request = data.status === 'pending';
  if (!request && data.status !== 'confirmed') return;

  const bookingId = event.params.bookingId;
  const kind = request ? 'request' : 'created';
  if (!(await claim(`${kind}_${bookingId}`))) return;

  const salon = (await getFirestore().collection('salons').doc(data.salonId).get()).data();
  const booking = await loadBooking(bookingId, data, salon);
  const now = new Date();
  // Appen kan bare booke frem i tid, men seed-scriptet legger også inn gamle timer
  if (!booking || booking.startAt.getTime() <= now.getTime()) return;
  const moved = (await movedFrom(data, salon)) ?? undefined;

  const key = `${kind}/${bookingId}`;
  const customerLink = appLink(`/booking/${bookingId}`);
  const salonLink = appLink(`/business/booking/${bookingId}`);

  if (request) {
    // Påminnelsen lages når salongen godkjenner
    await settle(bookingId, [
      notifyCustomer(booking, messages.requestReceipt(booking.info, customerLink, moved?.info), key),
      notifySalon(
        booking,
        messages.newRequestPush(booking.info, now, moved?.info),
        messages.newRequestEmail(booking.info, salonLink, moved?.info),
        key
      ),
    ]);
    return;
  }

  await settle(bookingId, [
    saveReminder(booking, snapshot.createTime.toDate()),
    notifyCustomer(
      booking,
      messages.bookingReceipt(booking.info, now, customerLink, moved?.info),
      key,
      messages.bookingSms(booking.info, customerLink, moved?.info)
    ),
    notifySalon(
      booking,
      messages.newBookingPush(booking.info, now, moved?.info),
      messages.newBookingEmail(booking.info, salonLink, moved?.info),
      key
    ),
  ]);
});

/** Salongen har godkjent eller avslått en forespørsel. */
async function answered(bookingId: string, data: DocumentData) {
  const approved = data.status === 'confirmed';
  const kind = approved ? 'approved' : 'declined';
  if (!(await claim(`${kind}_${bookingId}`))) return;

  const booking = await loadBooking(bookingId, data);
  const now = new Date();
  // Gamle forespørsler som ryddes bort, er det ingen grunn til å si fra om
  if (!booking || booking.startAt.getTime() <= now.getTime()) return;
  const key = `${kind}/${bookingId}`;
  const pushData = { bookingId, view: 'customer', channel: 'bookings' } as const;

  if (approved) {
    // Adressen er nå kopiert inn på bookingen, så den kommer med i varslene
    const link = appLink(`/booking/${bookingId}`);
    await settle(bookingId, [
      saveReminder(booking, now),
      sendPush(booking.userId, messages.approvedPush(booking.info, now), pushData),
      notifyCustomer(booking, messages.approvedReceipt(booking.info, now, link), key, messages.approvedSms(booking.info, link)),
    ]);
    return;
  }

  const bookAgainLink = appLink(`/salon/${data.salonId}`);
  await settle(bookingId, [
    sendPush(booking.userId, messages.declinedPush(booking.info, now), pushData),
    notifyCustomer(booking, messages.declinedEmail(booking.info, bookAgainLink), key, messages.declinedSms(booking.info, bookAgainLink)),
  ]);
}

export const onBookingUpdated = onDocumentUpdated({ document: 'bookings/{bookingId}', secrets }, async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
  if (!before || !after) return;

  const bookingId = event.params.bookingId;
  if (before.status === 'pending' && (after.status === 'confirmed' || after.status === 'declined')) {
    await answered(bookingId, after);
    return;
  }
  // Kunden kan også trekke en forespørsel. Salongen får beskjed som ved en avbestilling.
  if ((before.status !== 'confirmed' && before.status !== 'pending') || after.status !== 'cancelled') return;

  await getFirestore().collection('reminders').doc(bookingId).delete();
  if (!(await claim(`cancelled_${bookingId}`))) return;

  const booking = await loadBooking(bookingId, after);
  if (!booking) return;
  const now = new Date();
  const key = `cancelled/${bookingId}`;

  if (after.cancelledBy === 'salon') {
    // Salongen kan også rydde i gamle timer – da er det ingen grunn til å si fra
    if (booking.startAt.getTime() <= now.getTime()) return;
    const bookAgainLink = appLink(`/salon/${after.salonId}`);
    await settle(bookingId, [
      sendPush(booking.userId, messages.cancelledBySalonPush(booking.info, now), {
        bookingId,
        view: 'customer',
        channel: 'bookings',
      }),
      notifyCustomer(
        booking,
        messages.cancelledBySalonEmail(booking.info, bookAgainLink),
        key,
        messages.cancelledBySalonSms(booking.info, bookAgainLink)
      ),
    ]);
    return;
  }

  // Når kunden flytter timen, sier den nye bookingen fra om begge deler
  if (await wasMoved(bookingId, after)) return;

  await settle(bookingId, [
    notifyCustomer(booking, messages.cancelledByCustomerReceipt(booking.info), key),
    notifySalon(
      booking,
      messages.cancelledByCustomerPush(booking.info, now),
      messages.cancelledByCustomerEmail(booking.info, appLink(`/business/booking/${bookingId}`)),
      key
    ),
  ]);
});

async function remind(bookingId: string, now: Date) {
  const snapshot = await getFirestore().collection('bookings').doc(bookingId).get();
  const data = snapshot.data();
  if (!data || data.status !== 'confirmed') return;

  const booking = await loadBooking(bookingId, data);
  if (!booking || booking.startAt.getTime() <= now.getTime()) return;
  if (!(await preferences(booking.userId)).reminders) return;

  // Push til appen, eller e-post/SMS til dem som ikke har appen (f.eks. bare bruker nettversjonen)
  const delivered = await sendPush(booking.userId, messages.reminderPush(booking.info, now), {
    bookingId,
    view: 'customer',
    channel: 'reminders',
    expiresAt: booking.startAt,
  }).catch((error) => {
    logger.error('Kunne ikke sende påminnelse som push', { bookingId, error: String(error) });
    return 0;
  });
  if (delivered > 0) return;

  const link = appLink(`/booking/${bookingId}`);
  await notifyCustomer(
    booking,
    messages.reminderEmail(booking.info, now, link),
    `reminder/${bookingId}`,
    messages.reminderSms(booking.info, now, link)
  );
}

export const sendReminders = onSchedule(
  { schedule: 'every 10 minutes', timeZone: 'Europe/Oslo', timeoutSeconds: 300, maxInstances: 1, secrets },
  async () => {
    const now = new Date();
    const due = await getFirestore()
      .collection('reminders')
      .where('remindAt', '<=', Timestamp.fromDate(now))
      .orderBy('remindAt')
      .limit(200)
      .get();

    for (const reminder of due.docs) {
      try {
        // Fjernes først, så den aldri sendes to ganger. Feiler hvis en annen kjøring kom først.
        await reminder.ref.delete({ lastUpdateTime: reminder.updateTime });
      } catch {
        continue;
      }
      try {
        await remind(reminder.id, now);
      } catch (error) {
        logger.error('Kunne ikke sende påminnelse', { bookingId: reminder.id, error: String(error) });
      }
    }

    await checkPushReceipts().catch((error) => logger.warn('Kunne ikke sjekke push-kvitteringer', { error: String(error) }));
  }
);

/**
 * Den korte bookinglenken, bookzy.no/{salongId}. Hosting sender hit alle adresser som ikke er en fil i nettversjonen
 * (se rewrites i firebase.json), så appens egne sider går aldri via funksjonen.
 */
export const salonLinkPage = onRequest(async (request, response) => {
  const id = request.path.replace(/^\/+|\/+$/g, '');
  const link = appLink(`/${id}`);
  const salon = isDocId(id) && link ? (await getFirestore().collection('salons').doc(id).get()).data() : undefined;
  if (!salon || !link) {
    // Feil eller gammel lenke: forsiden i stedet for en tom side. Kort cache, i tilfelle salongen lages straks etter.
    response.set('Cache-Control', 'public, max-age=60, s-maxage=300').redirect(302, '/');
    return;
  }
  // Skjulte salonger får ingen forhåndsvisning, men lenken virker for eieren som vil se siden sin
  const preview = toPreview(id, salon) ?? { id, name: 'Bookzy', text: 'Book time hos salonger nær deg.', image: null };
  // Hosting cacher svaret, så de fleste kundene slipper å vente på funksjonen. Tømmes ved hver deploy av nettversjonen.
  response
    .set('Cache-Control', 'public, max-age=300, s-maxage=3600')
    .type('html')
    .send(previewHtml(preview, link, appLink('') ?? ''));
});

/** Rydder bort enheter og påminnelser når en konto slettes. */
export const onUserDeleted = region(REGION)
  .auth.user()
  .onDelete(async (user) => {
    const db = getFirestore();
    const [devices, reminders] = await Promise.all([
      db.collection('pushTokens').where('uid', '==', user.uid).get(),
      db.collection('reminders').where('userId', '==', user.uid).get(),
    ]);
    const writer = db.bulkWriter();
    for (const doc of [...devices.docs, ...reminders.docs]) writer.delete(doc.ref);
    await writer.close();
  });
