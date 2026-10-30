// Tester firestore.rules mot Firebase-emulatoren. Kjør med: npm run test:rules
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

const SALON_ID = 'test-salong';
const OWNER = 'eier';
const DATE = '2099-01-15';
const HOUR = 60 * 60 * 1000;

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-bookzy',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await asAdmin((firestore) =>
    setDoc(doc(firestore, 'salons', SALON_ID), { ...salonData(), ownerId: OWNER, ratingSum: 40, reviewCount: 10 })
  );
});

/** Alle feltene eieren kan redigere – appen skriver alltid hele settet. */
function salonData(overrides = {}) {
  return {
    name: 'Testsalong',
    category: 'Frisør',
    description: '',
    address: 'Testveien 1, Oslo',
    area: 'Sentrum',
    phone: '',
    locationType: 'salon',
    services: [],
    staff: [{ id: 'maria', name: 'Maria', title: '' }, { id: 'jonas', name: 'Jonas', title: '' }],
    openingHours: { mon: { open: '09:00', close: '17:00' }, sun: null },
    closedDates: [],
    cancellationHours: 24,
    published: true,
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

const db = (uid) =>
  uid ? testEnv.authenticatedContext(uid).firestore() : testEnv.unauthenticatedContext().firestore();

const asAdmin = (callback) => testEnv.withSecurityRulesDisabled((context) => callback(context.firestore()));

const slotIdFor = (staffId, time, date = DATE) => `${SALON_ID}_${staffId}_${date}_${time}`;

function bookingData(uid, { staffId = 'maria', times = ['10:00', '10:30'], start = new Date('2099-01-15T10:00:00'), overrides = {} } = {}) {
  return {
    userId: uid,
    customerName: 'Test',
    customerPhone: '40000000',
    note: '',
    salonId: SALON_ID,
    salonName: 'Testsalong',
    serviceId: 'herreklipp',
    serviceName: 'Herreklipp',
    staffId,
    staffName: 'Maria',
    durationMin: 45,
    priceNok: 450,
    date: DATE,
    time: times[0],
    startAt: Timestamp.fromDate(start),
    endAt: Timestamp.fromDate(new Date(start.getTime() + 45 * 60_000)),
    cancellableUntil: Timestamp.fromDate(new Date(start.getTime() - 24 * HOUR)),
    slotIds: times.map((time) => slotIdFor(staffId, time)),
    status: 'confirmed',
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

/** Skriver booking og luker i én batch, slik appen gjør i en transaksjon. */
function book(firestore, uid, { bookingId = `booking-${uid}`, staffId = 'maria', times = ['10:00', '10:30'], overrides } = {}) {
  const batch = writeBatch(firestore);
  batch.set(doc(firestore, 'bookings', bookingId), bookingData(uid, { staffId, times, overrides }));
  for (const time of times) {
    batch.set(doc(firestore, 'slots', slotIdFor(staffId, time)), {
      salonId: SALON_ID,
      staffId,
      date: DATE,
      time,
      bookingId,
    });
  }
  return batch;
}

function cancel(batch, firestore, bookingId, { staffId = 'maria', times = ['10:00', '10:30'], fields = {} } = {}) {
  batch.update(doc(firestore, 'bookings', bookingId), { status: 'cancelled', cancelledAt: serverTimestamp(), ...fields });
  for (const time of times) batch.delete(doc(firestore, 'slots', slotIdFor(staffId, time)));
  return batch;
}

/** En time som allerede er gjennomført (lagt inn uten regler, slik seed-scriptet gjør). */
async function completedBooking(uid, bookingId = `done-${uid}`) {
  const start = new Date(Date.now() - 48 * HOUR);
  await asAdmin((firestore) =>
    setDoc(doc(firestore, 'bookings', bookingId), bookingData(uid, { start, overrides: { createdAt: Timestamp.fromDate(start) } }))
  );
  return bookingId;
}

function review(firestore, bookingId, { rating = 5, salonRatingSum = 40 + rating, salonCount = 11, salonId = SALON_ID } = {}) {
  const batch = writeBatch(firestore);
  batch.set(doc(firestore, 'reviews', bookingId), {
    salonId,
    rating,
    comment: 'Veldig bra!',
    authorName: 'Test T.',
    serviceName: 'Herreklipp',
    createdAt: serverTimestamp(),
  });
  batch.update(doc(firestore, 'salons', SALON_ID), {
    ratingSum: salonRatingSum,
    reviewCount: salonCount,
    lastReviewId: bookingId,
  });
  return batch.commit();
}

describe('salonger', () => {
  test('alle kan lese', async () => {
    await assertSucceeds(getDoc(doc(db(null), 'salons', SALON_ID)));
  });

  test('ingen kan endre salongen fra appen', async () => {
    await assertFails(updateDoc(doc(db('alice'), 'salons', SALON_ID), { name: 'Hacket' }));
    await assertFails(setDoc(doc(db('alice'), 'salons', 'ny-salong'), { name: 'Falsk' }));
  });

  test('kan ikke øke antall anmeldelser uten en ny anmeldelse', async () => {
    await assertFails(
      updateDoc(doc(db('alice'), 'salons', SALON_ID), { reviewCount: increment(1), ratingSum: increment(5), lastReviewId: 'x' })
    );
  });
});

describe('opprette booking', () => {
  test('innlogget bruker kan booke ledige luker', async () => {
    await assertSucceeds(book(db('alice'), 'alice').commit());
  });

  test('to ansatte kan ha time samtidig', async () => {
    await book(db('alice'), 'alice').commit();
    await assertSucceeds(book(db('bob'), 'bob', { staffId: 'jonas' }).commit());
  });

  test('utlogget bruker kan ikke booke', async () => {
    await assertFails(book(db(null), 'alice').commit());
  });

  test('kan ikke booke i andres navn', async () => {
    await assertFails(book(db('bob'), 'alice').commit());
  });

  test('kan ikke booke en luke som allerede er tatt', async () => {
    await book(db('alice'), 'alice').commit();
    await assertFails(book(db('bob'), 'bob', { times: ['10:30', '11:00'] }).commit());
  });

  test('kan velge tilleggstjenester', async () => {
    await assertSucceeds(book(db('alice'), 'alice', { overrides: { addOnIds: ['farge', 'french'] } }).commit());
  });

  test('tilleggene må være en liste med høyst fem', async () => {
    await assertFails(book(db('alice'), 'alice', { overrides: { addOnIds: ['a', 'b', 'c', 'd', 'e', 'f'] } }).commit());
    await assertFails(book(db('alice'), 'alice', { overrides: { addOnIds: 'farge' } }).commit());
  });

  test('kan ikke lage booking uten luker', async () => {
    await assertFails(setDoc(doc(db('alice'), 'bookings', 'uten-luker'), bookingData('alice')));
  });

  test('kan ikke booke tilbake i tid', async () => {
    const past = new Date('2020-01-01T10:00:00');
    await assertFails(
      book(db('alice'), 'alice', {
        overrides: {
          startAt: Timestamp.fromDate(past),
          endAt: Timestamp.fromDate(new Date(past.getTime() + 45 * 60_000)),
          cancellableUntil: Timestamp.fromDate(new Date(past.getTime() - 24 * HOUR)),
        },
      }).commit()
    );
  });

  test('avbestillingsfristen må følge salongens regel', async () => {
    const start = new Date('2099-01-15T10:00:00');
    await assertFails(
      book(db('alice'), 'alice', { overrides: { cancellableUntil: Timestamp.fromDate(start) } }).commit()
    );
  });

  test('kan ikke sette status selv', async () => {
    await assertFails(book(db('alice'), 'alice', { overrides: { status: 'cancelled' } }).commit());
  });

  test('logget inn med SMS: bookingen må ha det bekreftede nummeret', async () => {
    const firestore = testEnv.authenticatedContext('carl', { phone_number: '+4791234567' }).firestore();
    await assertFails(book(firestore, 'carl', { overrides: { customerPhone: '+4740000000' } }).commit());
    await assertSucceeds(book(firestore, 'carl', { overrides: { customerPhone: '+4791234567' } }).commit());
  });

  test('kan ikke booke hos en salong som ikke finnes', async () => {
    await assertFails(book(db('alice'), 'alice', { overrides: { salonId: 'finnes-ikke' } }).commit());
  });

  test('første luke må være starttiden', async () => {
    await assertFails(book(db('alice'), 'alice', { overrides: { time: '14:00' } }).commit());
  });

  test('skjulte salonger tar ikke imot bookinger, men eieren kan prøve', async () => {
    await asAdmin((firestore) => updateDoc(doc(firestore, 'salons', SALON_ID), { published: false }));
    await assertFails(book(db('alice'), 'alice').commit());
    await assertSucceeds(book(db(OWNER), OWNER).commit());
  });

  test('luke-ID må stemme med salong, ansatt, dato og tid', async () => {
    const firestore = db('alice');
    const batch = writeBatch(firestore);
    batch.set(doc(firestore, 'bookings', 'b1'), bookingData('alice', { times: ['10:00'] }));
    batch.set(doc(firestore, 'slots', slotIdFor('maria', '10:00')), {
      salonId: SALON_ID,
      staffId: 'jonas',
      date: DATE,
      time: '10:00',
      bookingId: 'b1',
    });
    await assertFails(batch.commit());
  });
});

describe('lese bookinger', () => {
  beforeEach(async () => {
    await book(db('alice'), 'alice').commit();
  });

  test('eieren kan lese sine egne', async () => {
    await assertSucceeds(getDocs(query(collection(db('alice'), 'bookings'), where('userId', '==', 'alice'))));
  });

  test('andre kan ikke lese dem', async () => {
    await assertFails(getDocs(query(collection(db('bob'), 'bookings'), where('userId', '==', 'alice'))));
    await assertFails(getDoc(doc(db('bob'), 'bookings', 'booking-alice')));
  });

  test('luker kan leses av alle (uten persondata)', async () => {
    await assertSucceeds(
      getDocs(query(collection(db(null), 'slots'), where('salonId', '==', SALON_ID), where('date', '==', DATE)))
    );
  });
});

describe('avbestille og flytte', () => {
  beforeEach(async () => {
    await book(db('alice'), 'alice').commit();
  });

  test('eieren kan avbestille og frigjøre lukene', async () => {
    const firestore = db('alice');
    await assertSucceeds(cancel(writeBatch(firestore), firestore, 'booking-alice').commit());
    await assertSucceeds(book(db('bob'), 'bob').commit());
  });

  test('eieren kan flytte timen i én operasjon', async () => {
    const firestore = db('alice');
    const batch = book(firestore, 'alice', {
      bookingId: 'ny-booking',
      times: ['14:00', '14:30'],
      overrides: { replacesBookingId: 'booking-alice' },
    });
    cancel(batch, firestore, 'booking-alice');
    await assertSucceeds(batch.commit());
  });

  test('en flyttet time må avbestille den gamle samtidig', async () => {
    const batch = book(db('alice'), 'alice', {
      bookingId: 'ny-booking',
      times: ['14:00', '14:30'],
      overrides: { replacesBookingId: 'booking-alice' },
    });
    await assertFails(batch.commit());
  });

  test('kan ikke si at man flytter en annens time', async () => {
    await asAdmin((firestore) => updateDoc(doc(firestore, 'bookings', 'booking-alice'), { status: 'cancelled' }));
    const batch = book(db('bob'), 'bob', {
      bookingId: 'ny-booking',
      times: ['14:00', '14:30'],
      overrides: { replacesBookingId: 'booking-alice' },
    });
    await assertFails(batch.commit());
  });

  test('kan skrive hvorfor, opptil 200 tegn', async () => {
    const firestore = db('alice');
    const withReason = (cancelReason) =>
      cancel(writeBatch(firestore), firestore, 'booking-alice', { fields: { cancelReason } }).commit();
    await assertFails(withReason('a'.repeat(201)));
    await assertFails(withReason(42));
    await assertSucceeds(withReason('Jeg er dessverre syk'));
  });

  test('andre kan ikke avbestille', async () => {
    const firestore = db('bob');
    await assertFails(cancel(writeBatch(firestore), firestore, 'booking-alice').commit());
  });

  test('kan ikke avbestille etter fristen', async () => {
    const start = new Date(Date.now() + 2 * HOUR);
    await asAdmin((firestore) =>
      setDoc(
        doc(firestore, 'bookings', 'snart'),
        bookingData('alice', {
          start,
          overrides: {
            cancellableUntil: Timestamp.fromDate(new Date(start.getTime() - 24 * HOUR)),
            slotIds: ['x'],
            createdAt: Timestamp.now(),
          },
        })
      )
    );
    await assertFails(
      updateDoc(doc(db('alice'), 'bookings', 'snart'), { status: 'cancelled', cancelledAt: serverTimestamp() })
    );
  });

  test('kan ikke endre andre felt enn status', async () => {
    await assertFails(updateDoc(doc(db('alice'), 'bookings', 'booking-alice'), { time: '14:00' }));
  });

  test('kan ikke slette luker uten å avbestille bookingen', async () => {
    await assertFails(deleteDoc(doc(db('alice'), 'slots', slotIdFor('maria', '10:00'))));
  });
});

describe('anmeldelser', () => {
  test('kan anmelde en gjennomført time, og snittet oppdateres', async () => {
    const bookingId = await completedBooking('alice');
    await assertSucceeds(review(db('alice'), bookingId, { rating: 4 }));
    let salon;
    await asAdmin(async (firestore) => {
      salon = (await getDoc(doc(firestore, 'salons', SALON_ID))).data();
    });
    assert.equal(salon.reviewCount, 11);
    assert.equal(salon.ratingSum, 44);
  });

  test('alle kan lese anmeldelser', async () => {
    const bookingId = await completedBooking('alice');
    await review(db('alice'), bookingId);
    await assertSucceeds(getDoc(doc(db(null), 'reviews', bookingId)));
  });

  test('kan ikke anmelde samme time to ganger', async () => {
    const bookingId = await completedBooking('alice');
    await review(db('alice'), bookingId);
    await assertFails(review(db('alice'), bookingId, { salonRatingSum: 50, salonCount: 12 }));
  });

  test('kan ikke anmelde en time som ikke har vært ennå', async () => {
    await book(db('alice'), 'alice').commit();
    await assertFails(review(db('alice'), 'booking-alice'));
  });

  test('kan ikke anmelde andres time', async () => {
    const bookingId = await completedBooking('alice');
    await assertFails(review(db('bob'), bookingId));
  });

  test('kan ikke jukse med snittet', async () => {
    const bookingId = await completedBooking('alice');
    await assertFails(review(db('alice'), bookingId, { rating: 5, salonRatingSum: 40 + 50 }));
  });

  test('vurderingen må være 1–5', async () => {
    const bookingId = await completedBooking('alice');
    await assertFails(review(db('alice'), bookingId, { rating: 6 }));
  });
});

describe('profil og favoritter', () => {
  test('eieren kan lagre og lese profilen sin', async () => {
    const firestore = db('alice');
    await assertSucceeds(setDoc(doc(firestore, 'users', 'alice'), { name: 'Alice', phone: '40000000', updatedAt: serverTimestamp() }));
    await assertSucceeds(getDoc(doc(firestore, 'users', 'alice')));
  });

  test('andre kan ikke lese profilen', async () => {
    await asAdmin((firestore) => setDoc(doc(firestore, 'users', 'alice'), { name: 'Alice', phone: '' }));
    await assertFails(getDoc(doc(db('bob'), 'users', 'alice')));
  });

  test('profilen kan ikke inneholde ukjente felt', async () => {
    await assertFails(setDoc(doc(db('alice'), 'users', 'alice'), { name: 'Alice', phone: '', admin: true }));
  });

  test('kan slå av påminnelser og e-post uten å miste profilen', async () => {
    const ref = doc(db('alice'), 'users', 'alice');
    await assertSucceeds(setDoc(ref, { name: 'Alice', phone: '40000000', updatedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(ref, { reminders: false, salonEmails: false, updatedAt: serverTimestamp() }, { merge: true }));
    const saved = (await getDoc(ref)).data();
    assert.equal(saved.name, 'Alice');
    assert.equal(saved.reminders, false);
  });

  test('innstillingene må være av eller på', async () => {
    await assertFails(setDoc(doc(db('alice'), 'users', 'alice'), { reminders: 'nei' }, { merge: true }));
    await assertFails(setDoc(doc(db('alice'), 'users', 'alice'), { salonEmails: 1 }, { merge: true }));
  });

  test('andre kan ikke slå av varslene dine', async () => {
    await assertFails(setDoc(doc(db('bob'), 'users', 'alice'), { reminders: false }, { merge: true }));
  });

  test('eieren kan legge til og fjerne favoritter', async () => {
    const ref = doc(db('alice'), 'users', 'alice', 'favorites', SALON_ID);
    await assertSucceeds(setDoc(ref, { createdAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(ref));
  });

  test('andre kan ikke se eller endre favorittene', async () => {
    await assertFails(setDoc(doc(db('bob'), 'users', 'alice', 'favorites', SALON_ID), { createdAt: serverTimestamp() }));
    await assertFails(getDocs(collection(db('bob'), 'users', 'alice', 'favorites')));
  });
});

describe('registrere bedrift', () => {
  const newSalon = (uid, overrides = {}) =>
    setDoc(doc(db(uid), 'salons', 'ny-salong'), {
      ...salonData({ name: 'Negler hos Lina', locationType: 'home', published: false }),
      ownerId: uid,
      ratingSum: 0,
      reviewCount: 0,
      createdAt: serverTimestamp(),
      ...overrides,
    });

  test('innlogget bruker kan registrere en bedrift og blir eier', async () => {
    await assertSucceeds(newSalon('lina'));
  });

  test('utlogget bruker kan ikke registrere', async () => {
    await assertFails(newSalon(null, { ownerId: 'lina' }));
  });

  test('kan ikke registrere i andres navn', async () => {
    await assertFails(newSalon('lina', { ownerId: 'noen-andre' }));
  });

  test('kan ikke starte med egne anmeldelser', async () => {
    await assertFails(newSalon('lina', { ratingSum: 50, reviewCount: 10 }));
  });

  test('må ha minst én som tar imot kunder', async () => {
    await assertFails(newSalon('lina', { staff: [] }));
  });

  test('kan ikke overta en eksisterende salong', async () => {
    await assertFails(
      setDoc(doc(db('lina'), 'salons', SALON_ID), {
        ...salonData(),
        ownerId: 'lina',
        ratingSum: 0,
        reviewCount: 0,
        createdAt: serverTimestamp(),
      })
    );
  });
});

describe('redigere salongen', () => {
  test('eieren kan endre tjenester, ansatte, åpningstider og fridager', async () => {
    await assertSucceeds(
      updateDoc(
        doc(db(OWNER), 'salons', SALON_ID),
        salonData({
          services: [
            { id: 'klipp', name: 'Klipp', category: 'Klipp', durationMin: 45, priceNok: 500 },
            { id: 'kur', name: 'Hårkur', category: 'Tillegg', durationMin: 0, priceNok: 150, addOn: true },
          ],
          openingHours: { mon: { open: '10:00', close: '18:00' }, tue: null },
          flexibleHours: true,
          serviceMenu: true,
          closedDates: ['2099-01-20', '2099-01-21_maria'],
        })
      )
    );
  });

  test('andre kan ikke endre salongen', async () => {
    await assertFails(updateDoc(doc(db('alice'), 'salons', SALON_ID), salonData({ name: 'Hacket' })));
  });

  test('eieren kan ikke endre snittet eller eierskapet', async () => {
    await assertFails(updateDoc(doc(db(OWNER), 'salons', SALON_ID), { ...salonData(), ratingSum: 50 }));
    await assertFails(updateDoc(doc(db(OWNER), 'salons', SALON_ID), { ...salonData(), ownerId: 'alice' }));
  });

  test('ugyldige verdier avvises', async () => {
    await assertFails(updateDoc(doc(db(OWNER), 'salons', SALON_ID), salonData({ cancellationHours: -1 })));
    await assertFails(updateDoc(doc(db(OWNER), 'salons', SALON_ID), salonData({ locationType: 'slott' })));
    await assertFails(updateDoc(doc(db(OWNER), 'salons', SALON_ID), salonData({ openingHours: { mandag: null } })));
    await assertFails(updateDoc(doc(db(OWNER), 'salons', SALON_ID), salonData({ flexibleHours: 'ja' })));
    await assertFails(updateDoc(doc(db(OWNER), 'salons', SALON_ID), salonData({ serviceMenu: 'ja' })));
  });

  test('kan ikke slette salongen', async () => {
    await assertFails(deleteDoc(doc(db(OWNER), 'salons', SALON_ID)));
  });
});

describe('bilder av salongen', () => {
  const photo = (name) => `https://firebasestorage.googleapis.com/v0/b/timeflyt/o/salons%2F${SALON_ID}%2F${name}.jpg`;
  const savePhotos = (uid, photos) => updateDoc(doc(db(uid), 'salons', SALON_ID), salonData({ photos }));

  test('eieren kan legge inn, bytte rekkefølge på og fjerne bilder', async () => {
    await assertSucceeds(savePhotos(OWNER, [photo('a'), photo('b')]));
    await assertSucceeds(savePhotos(OWNER, [photo('b'), photo('a')]));
    await assertSucceeds(savePhotos(OWNER, []));
  });

  test('bilder fra Storage-emulatoren godtas', async () => {
    await assertSucceeds(savePhotos(OWNER, ['http://localhost:9199/v0/b/timeflyt/o/salons%2Fa.jpg']));
  });

  test('andre kan ikke endre bildene', async () => {
    await assertFails(savePhotos('alice', [photo('a')]));
  });

  test('maks 8 bilder', async () => {
    const photos = Array.from({ length: 9 }, (_, i) => photo(i));
    await assertSucceeds(savePhotos(OWNER, photos.slice(0, 8)));
    await assertFails(savePhotos(OWNER, photos));
  });

  test('bare https-adresser som ikke er for lange', async () => {
    await assertFails(savePhotos(OWNER, ['http://example.com/a.jpg']));
    await assertFails(savePhotos(OWNER, ['javascript:alert(1)']));
    await assertFails(savePhotos(OWNER, [photo('a'), `https://example.com/${'a'.repeat(500)}`]));
    await assertFails(savePhotos(OWNER, [photo('a'), 42]));
    await assertFails(savePhotos(OWNER, photo('a')));
  });

  test('ny bedrift kan registreres med og uten bilder', async () => {
    const newSalon = (id, overrides) =>
      setDoc(doc(db('lina'), 'salons', id), {
        ...salonData(),
        ownerId: 'lina',
        ratingSum: 0,
        reviewCount: 0,
        createdAt: serverTimestamp(),
        ...overrides,
      });
    await assertSucceeds(newSalon('uten-bilder', {}));
    await assertSucceeds(newSalon('med-bilder', { photos: [photo('a')] }));
  });
});

describe('fridager', () => {
  test('kan ikke booke når salongen har stengt', async () => {
    await asAdmin((firestore) => updateDoc(doc(firestore, 'salons', SALON_ID), { closedDates: [DATE] }));
    await assertFails(book(db('alice'), 'alice').commit());
  });

  test('kan ikke booke en ansatt som har fri, men en annen', async () => {
    await asAdmin((firestore) => updateDoc(doc(firestore, 'salons', SALON_ID), { closedDates: [`${DATE}_maria`] }));
    await assertFails(book(db('alice'), 'alice').commit());
    await assertSucceeds(book(db('alice'), 'alice', { staffId: 'jonas' }).commit());
  });
});

describe('salongens kalender', () => {
  beforeEach(async () => {
    await book(db('alice'), 'alice').commit();
  });

  test('eieren ser alle timer hos seg, med kundens navn og telefon', async () => {
    const firestore = db(OWNER);
    await assertSucceeds(
      getDocs(
        query(collection(firestore, 'bookings'), where('salonId', '==', SALON_ID), where('date', '>=', DATE), where('date', '<=', DATE))
      )
    );
    await assertSucceeds(getDoc(doc(firestore, 'bookings', 'booking-alice')));
  });

  test('eieren kan se en kundes tidligere timer hos seg', async () => {
    await assertSucceeds(
      getDocs(query(collection(db(OWNER), 'bookings'), where('salonId', '==', SALON_ID), where('userId', '==', 'alice')))
    );
  });

  test('andre salonger ser dem ikke', async () => {
    await asAdmin((firestore) =>
      setDoc(doc(firestore, 'salons', 'konkurrent'), { ...salonData(), ownerId: 'konkurrent', ratingSum: 0, reviewCount: 0 })
    );
    await assertFails(getDocs(query(collection(db('konkurrent'), 'bookings'), where('salonId', '==', SALON_ID))));
    await assertFails(getDoc(doc(db('konkurrent'), 'bookings', 'booking-alice')));
  });
});

describe('salongen avbestiller', () => {
  const cancelAsSalon = (firestore, bookingId, times = ['10:00', '10:30'], fields = {}) => {
    const batch = writeBatch(firestore);
    batch.update(doc(firestore, 'bookings', bookingId), {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
      cancelledBy: 'salon',
      ...fields,
    });
    for (const time of times) batch.delete(doc(firestore, 'slots', slotIdFor('maria', time)));
    return batch.commit();
  };

  beforeEach(async () => {
    await book(db('alice'), 'alice').commit();
  });

  test('eieren kan avbestille og frigjøre lukene', async () => {
    await assertSucceeds(cancelAsSalon(db(OWNER), 'booking-alice'));
    await assertSucceeds(book(db('bob'), 'bob').commit());
  });

  test('eieren kan avbestille selv etter kundens frist', async () => {
    const start = new Date(Date.now() + 2 * HOUR);
    await asAdmin((firestore) =>
      setDoc(
        doc(firestore, 'bookings', 'snart'),
        bookingData('alice', {
          start,
          overrides: {
            cancellableUntil: Timestamp.fromDate(new Date(start.getTime() - 24 * HOUR)),
            slotIds: [],
            createdAt: Timestamp.now(),
          },
        })
      )
    );
    await assertSucceeds(cancelAsSalon(db(OWNER), 'snart', []));
  });

  test('eieren kan skrive hvorfor', async () => {
    await assertFails(cancelAsSalon(db(OWNER), 'booking-alice', undefined, { cancelReason: 'a'.repeat(201) }));
    await assertSucceeds(cancelAsSalon(db(OWNER), 'booking-alice', undefined, { cancelReason: 'Jeg er syk i dag' }));
  });

  test('andre kan ikke avbestille som salongen', async () => {
    await assertFails(cancelAsSalon(db('bob'), 'booking-alice'));
  });

  test('eieren kan ikke endre selve timen', async () => {
    await assertFails(updateDoc(doc(db(OWNER), 'bookings', 'booking-alice'), { priceNok: 0 }));
  });

  test('eieren kan ikke slette luker uten å avbestille', async () => {
    await assertFails(deleteDoc(doc(db(OWNER), 'slots', slotIdFor('maria', '10:00'))));
  });
});

describe('godkjenning og vilkår', () => {
  const ADDRESS = 'Hjemmegata 1, Oslo';
  const requireApproval = () =>
    asAdmin((firestore) => updateDoc(doc(firestore, 'salons', SALON_ID), { requiresApproval: true, address: '' }));
  const pending = { overrides: { status: 'pending' } };

  test('kunden kan bare sende en forespørsel når salongen godkjenner selv', async () => {
    await requireApproval();
    await assertFails(book(db('alice'), 'alice').commit());
    await assertSucceeds(book(db('alice'), 'alice', pending).commit());
  });

  test('forespørsler må sendes minst 3 timer før timen', async () => {
    const startingIn = (hours, status) => {
      const start = new Date(Date.now() + hours * HOUR);
      return {
        status,
        startAt: Timestamp.fromDate(start),
        endAt: Timestamp.fromDate(new Date(start.getTime() + 45 * 60_000)),
        cancellableUntil: Timestamp.fromDate(new Date(start.getTime() - 24 * HOUR)),
      };
    };
    // Vanlige salonger har ingen slik frist
    await assertSucceeds(book(db('bob'), 'bob', { bookingId: 'vanlig', staffId: 'jonas', overrides: startingIn(1, 'confirmed') }).commit());
    await requireApproval();
    await assertFails(book(db('alice'), 'alice', { overrides: startingIn(2.5, 'pending') }).commit());
    await assertSucceeds(book(db('alice'), 'alice', { overrides: startingIn(4, 'pending') }).commit());
  });

  test('vanlige salonger får ikke forespørsler', async () => {
    await assertFails(book(db('alice'), 'alice', pending).commit());
  });

  test('eieren kan godkjenne, og kunden får adressen', async () => {
    await requireApproval();
    await book(db('alice'), 'alice', pending).commit();
    await assertSucceeds(updateDoc(doc(db(OWNER), 'bookings', 'booking-alice'), { status: 'confirmed', address: ADDRESS }));
    const booking = await getDoc(doc(db('alice'), 'bookings', 'booking-alice'));
    assert.equal(booking.get('address'), ADDRESS);
  });

  test('eieren kan avslå, og tiden blir ledig', async () => {
    await requireApproval();
    await book(db('alice'), 'alice', pending).commit();
    const firestore = db(OWNER);
    const batch = writeBatch(firestore);
    batch.update(doc(firestore, 'bookings', 'booking-alice'), { status: 'declined' });
    for (const time of ['10:00', '10:30']) batch.delete(doc(firestore, 'slots', slotIdFor('maria', time)));
    await assertSucceeds(batch.commit());
    await assertSucceeds(book(db('bob'), 'bob', pending).commit());
  });

  test('eieren kan si hvorfor timen avslås', async () => {
    await requireApproval();
    await book(db('alice'), 'alice', pending).commit();
    const firestore = db(OWNER);
    const batch = writeBatch(firestore);
    batch.update(doc(firestore, 'bookings', 'booking-alice'), { status: 'declined', cancelReason: 'Fullbooket den dagen' });
    for (const time of ['10:00', '10:30']) batch.delete(doc(firestore, 'slots', slotIdFor('maria', time)));
    await assertSucceeds(batch.commit());
  });

  test('kunden kan trekke forespørselen, men ikke godkjenne den selv', async () => {
    await requireApproval();
    await book(db('alice'), 'alice', pending).commit();
    await assertFails(updateDoc(doc(db('alice'), 'bookings', 'booking-alice'), { status: 'confirmed', address: ADDRESS }));
    const firestore = db('alice');
    await assertSucceeds(cancel(writeBatch(firestore), firestore, 'booking-alice').commit());
  });

  test('andre kan ikke godkjenne', async () => {
    await requireApproval();
    await book(db('alice'), 'alice', pending).commit();
    await assertFails(updateDoc(doc(db('bob'), 'bookings', 'booking-alice'), { status: 'confirmed', address: '' }));
  });

  test('adressen kan ikke stå på salongen når den godkjenner selv', async () => {
    await assertFails(updateDoc(doc(db(OWNER), 'salons', SALON_ID), salonData({ requiresApproval: true })));
    await assertSucceeds(updateDoc(doc(db(OWNER), 'salons', SALON_ID), salonData({ requiresApproval: true, address: '' })));
  });

  test('bare eieren ser den skjulte adressen', async () => {
    const ref = (uid) => doc(db(uid), 'salons', SALON_ID, 'private', 'address');
    await assertSucceeds(setDoc(ref(OWNER), { address: ADDRESS }));
    await assertSucceeds(getDoc(ref(OWNER)));
    await assertFails(getDoc(ref('alice')));
    await assertFails(getDoc(ref(null)));
    await assertFails(setDoc(ref('alice'), { address: 'Falsk' }));
    await assertFails(setDoc(doc(db(OWNER), 'salons', SALON_ID, 'private', 'annet'), { address: ADDRESS }));
  });

  test('eieren ser forespørslene sine', async () => {
    await assertSucceeds(
      getDocs(query(collection(db(OWNER), 'bookings'), where('salonId', '==', SALON_ID), where('status', '==', 'pending')))
    );
  });

  test('vilkårene kan være opptil 2000 tegn', async () => {
    await assertSucceeds(updateDoc(doc(db(OWNER), 'salons', SALON_ID), salonData({ terms: 'a'.repeat(2000) })));
    await assertFails(updateDoc(doc(db(OWNER), 'salons', SALON_ID), salonData({ terms: 'a'.repeat(2001) })));
  });
});

describe('møtte ikke', () => {
  const setStatus = (uid, bookingId, status) => updateDoc(doc(db(uid), 'bookings', bookingId), { status });

  test('eieren kan markere og angre etter at timen har startet', async () => {
    const bookingId = await completedBooking('alice');
    await assertSucceeds(setStatus(OWNER, bookingId, 'noShow'));
    await assertSucceeds(setStatus(OWNER, bookingId, 'confirmed'));
  });

  test('kan ikke markeres før timen har startet', async () => {
    await book(db('alice'), 'alice').commit();
    await assertFails(setStatus(OWNER, 'booking-alice', 'noShow'));
  });

  test('kunden kan ikke endre det selv', async () => {
    const bookingId = await completedBooking('alice');
    await setStatus(OWNER, bookingId, 'noShow');
    await assertFails(setStatus('alice', bookingId, 'confirmed'));
  });

  test('kan ikke anmelde en time man ikke møtte til', async () => {
    const bookingId = await completedBooking('alice');
    await setStatus(OWNER, bookingId, 'noShow');
    await assertFails(review(db('alice'), bookingId));
  });
});

describe('push-varsler', () => {
  const TOKEN = 'ExponentPushToken[abcdefghijklmnop123456]';
  const register = (uid, owner = uid, token = TOKEN, overrides = {}) =>
    setDoc(doc(db(uid), 'pushTokens', token), { uid: owner, platform: 'ios', updatedAt: serverTimestamp(), ...overrides });

  test('innlogget bruker kan registrere enheten sin', async () => {
    await assertSucceeds(register('alice'));
  });

  test('må være logget inn', async () => {
    await assertFails(
      setDoc(doc(db(null), 'pushTokens', TOKEN), { uid: 'alice', platform: 'ios', updatedAt: serverTimestamp() })
    );
  });

  test('kan ikke registrere en enhet på noen andre', async () => {
    await assertFails(register('alice', 'bob'));
  });

  test('bare ekte Expo-token godtas', async () => {
    await assertFails(register('alice', 'alice', 'noe-annet'));
    await assertFails(register('alice', 'alice', 'ExponentPushToken[]'));
    await assertSucceeds(register('alice', 'alice', 'ExpoPushToken[abc-DEF_123456789]'));
  });

  test('kan ikke legge til ukjente felt', async () => {
    await assertFails(register('alice', 'alice', TOKEN, { email: 'alice@example.com' }));
    await assertFails(register('alice', 'alice', TOKEN, { platform: 'web' }));
  });

  test('ingen kan lese enhetene fra appen', async () => {
    await register('alice');
    await assertFails(getDoc(doc(db('alice'), 'pushTokens', TOKEN)));
    await assertFails(getDocs(query(collection(db('bob'), 'pushTokens'), where('uid', '==', 'alice'))));
  });

  test('den som logger inn på enheten, tar den over', async () => {
    await register('alice');
    await assertSucceeds(register('bob'));
  });

  test('kan bare fjerne sin egen enhet', async () => {
    await register('alice');
    await assertFails(deleteDoc(doc(db('bob'), 'pushTokens', TOKEN)));
    await assertSucceeds(deleteDoc(doc(db('alice'), 'pushTokens', TOKEN)));
  });
});

describe('serverens data', () => {
  test('appen kan verken lese eller skrive påminnelser og varsellogg', async () => {
    await asAdmin((firestore) => setDoc(doc(firestore, 'reminders', 'booking-alice'), { userId: 'alice' }));
    await assertFails(getDoc(doc(db('alice'), 'reminders', 'booking-alice')));
    await assertFails(setDoc(doc(db('alice'), 'reminders', 'x'), { userId: 'alice' }));
    await assertFails(deleteDoc(doc(db('alice'), 'reminders', 'booking-alice')));
    await assertFails(setDoc(doc(db('alice'), 'sentNotifications', 'created_x'), {}));
    await assertFails(getDoc(doc(db('alice'), 'pushTickets', 'x')));
  });
});
