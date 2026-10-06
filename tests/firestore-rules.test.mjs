// Tester firestore.rules mot Firebase-emulatoren. Kjør med: npm run test:rules
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
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
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'salons', SALON_ID), { name: 'Testsalong' });
  });
});

const db = (uid) =>
  uid ? testEnv.authenticatedContext(uid).firestore() : testEnv.unauthenticatedContext().firestore();

const slotIdFor = (time, date = DATE) => `${SALON_ID}_${date}_${time}`;

function bookingData(uid, times, overrides = {}) {
  const start = new Date('2099-01-15T10:00:00');
  return {
    userId: uid,
    customerName: 'Test',
    salonId: SALON_ID,
    salonName: 'Testsalong',
    serviceId: 'herreklipp',
    serviceName: 'Herreklipp',
    durationMin: 45,
    priceNok: 450,
    date: DATE,
    time: times[0],
    startAt: Timestamp.fromDate(start),
    endAt: Timestamp.fromDate(new Date(start.getTime() + 45 * 60_000)),
    slotIds: times.map((time) => slotIdFor(time)),
    status: 'confirmed',
    createdAt: serverTimestamp(),
    ...overrides,
  };
}

/** Skriver booking og luker i én batch, slik appen gjør i en transaksjon. */
function book(firestore, uid, { bookingId = `booking-${uid}`, times = ['10:00', '10:30'], overrides, slots } = {}) {
  const batch = writeBatch(firestore);
  batch.set(doc(firestore, 'bookings', bookingId), bookingData(uid, times, overrides));
  for (const time of slots ?? times) {
    batch.set(doc(firestore, 'slots', slotIdFor(time)), {
      salonId: SALON_ID,
      date: DATE,
      time,
      bookingId,
    });
  }
  return batch.commit();
}

function cancel(firestore, bookingId, times = ['10:00', '10:30']) {
  const batch = writeBatch(firestore);
  batch.update(doc(firestore, 'bookings', bookingId), {
    status: 'cancelled',
    cancelledAt: serverTimestamp(),
  });
  for (const time of times) batch.delete(doc(firestore, 'slots', slotIdFor(time)));
  return batch.commit();
}

describe('salonger', () => {
  test('alle kan lese', async () => {
    await assertSucceeds(getDoc(doc(db(null), 'salons', SALON_ID)));
  });

  test('ingen kan skrive fra appen', async () => {
    await assertFails(setDoc(doc(db('alice'), 'salons', SALON_ID), { name: 'Hacket' }));
  });
});

describe('opprette booking', () => {
  test('innlogget bruker kan booke ledige luker', async () => {
    await assertSucceeds(book(db('alice'), 'alice'));
  });

  test('utlogget bruker kan ikke booke', async () => {
    await assertFails(book(db(null), 'alice'));
  });

  test('kan ikke booke i andres navn', async () => {
    await assertFails(book(db('bob'), 'alice'));
  });

  test('kan ikke booke en luke som allerede er tatt', async () => {
    await book(db('alice'), 'alice');
    await assertFails(book(db('bob'), 'bob', { times: ['10:30', '11:00'] }));
  });

  test('kan ikke lage booking uten luker', async () => {
    const firestore = db('alice');
    await assertFails(setDoc(doc(firestore, 'bookings', 'uten-luker'), bookingData('alice', ['10:00'])));
  });

  test('kan ikke booke tilbake i tid', async () => {
    const past = new Date('2020-01-01T10:00:00');
    await assertFails(
      book(db('alice'), 'alice', {
        overrides: {
          startAt: Timestamp.fromDate(past),
          endAt: Timestamp.fromDate(new Date(past.getTime() + 45 * 60_000)),
        },
      })
    );
  });

  test('kan ikke sette status selv', async () => {
    await assertFails(book(db('alice'), 'alice', { overrides: { status: 'cancelled' } }));
  });

  test('kan ikke booke hos en salong som ikke finnes', async () => {
    await assertFails(book(db('alice'), 'alice', { overrides: { salonId: 'finnes-ikke' } }));
  });

  test('luke-ID må stemme med salong, dato og tid', async () => {
    const firestore = db('alice');
    const batch = writeBatch(firestore);
    batch.set(doc(firestore, 'bookings', 'b1'), bookingData('alice', ['10:00']));
    batch.set(doc(firestore, 'slots', slotIdFor('10:00')), {
      salonId: SALON_ID,
      date: DATE,
      time: '12:00',
      bookingId: 'b1',
    });
    await assertFails(batch.commit());
  });
});

describe('lese bookinger', () => {
  beforeEach(async () => {
    await book(db('alice'), 'alice');
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

describe('avbestille', () => {
  beforeEach(async () => {
    await book(db('alice'), 'alice');
  });

  test('eieren kan avbestille og frigjøre lukene', async () => {
    await assertSucceeds(cancel(db('alice'), 'booking-alice'));
    // Tiden er ledig igjen for andre
    await assertSucceeds(book(db('bob'), 'bob'));
  });

  test('andre kan ikke avbestille', async () => {
    await assertFails(cancel(db('bob'), 'booking-alice'));
  });

  test('kan ikke endre andre felt enn status', async () => {
    await assertFails(updateDoc(doc(db('alice'), 'bookings', 'booking-alice'), { time: '14:00' }));
  });

  test('kan ikke slette luker uten å avbestille bookingen', async () => {
    const firestore = db('alice');
    const batch = writeBatch(firestore);
    batch.delete(doc(firestore, 'slots', slotIdFor('10:00')));
    await assertFails(batch.commit());
  });
});
