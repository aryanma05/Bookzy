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
const DATE = '2099-01-15';
const HOUR = 60 * 60 * 1000;

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-timeflyt',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await asAdmin((firestore) =>
    setDoc(doc(firestore, 'salons', SALON_ID), {
      name: 'Testsalong',
      cancellationHours: 24,
      ratingSum: 40,
      reviewCount: 10,
    })
  );
});

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

function cancel(batch, firestore, bookingId, { staffId = 'maria', times = ['10:00', '10:30'] } = {}) {
  batch.update(doc(firestore, 'bookings', bookingId), { status: 'cancelled', cancelledAt: serverTimestamp() });
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

  test('kan ikke booke hos en salong som ikke finnes', async () => {
    await assertFails(book(db('alice'), 'alice', { overrides: { salonId: 'finnes-ikke' } }).commit());
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
    const batch = book(firestore, 'alice', { bookingId: 'ny-booking', times: ['14:00', '14:30'] });
    cancel(batch, firestore, 'booking-alice');
    await assertSucceeds(batch.commit());
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
