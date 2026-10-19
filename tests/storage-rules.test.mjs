// Tester storage.rules mot Firebase-emulatoren. Kjør med: npm run test:rules
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';

const SALON_ID = 'test-salong';
const OWNER = 'eier';
const MB = 1024 * 1024;

let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-bookzy',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
    storage: { rules: readFileSync('storage.rules', 'utf8') },
  });
});

after(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearStorage();
  await testEnv.withSecurityRulesDisabled((context) =>
    setDoc(doc(context.firestore(), 'salons', SALON_ID), { name: 'Testsalong', ownerId: OWNER })
  );
});

const storage = (uid) =>
  uid ? testEnv.authenticatedContext(uid).storage() : testEnv.unauthenticatedContext().storage();

const upload = (uid, { path = `salons/${SALON_ID}/bilde.jpg`, size = 1000, contentType = 'image/jpeg' } = {}) =>
  storage(uid).ref(path).put(new Uint8Array(size), { contentType });

describe('bilder i Storage', () => {
  test('eieren kan laste opp, og alle kan se bildet', async () => {
    await assertSucceeds(upload(OWNER));
    await assertSucceeds(storage(null).ref(`salons/${SALON_ID}/bilde.jpg`).getMetadata());
  });

  test('andre kan ikke laste opp til salongen', async () => {
    await assertFails(upload('alice'));
    await assertFails(upload(null));
    await assertFails(upload(OWNER, { path: 'salons/finnes-ikke/bilde.jpg' }));
  });

  test('bare bilder under 5 MB', async () => {
    await assertFails(upload(OWNER, { contentType: 'application/pdf' }));
    await assertFails(upload(OWNER, { size: 6 * MB }));
  });

  test('bare eieren kan slette', async () => {
    await upload(OWNER);
    await assertFails(storage('alice').ref(`salons/${SALON_ID}/bilde.jpg`).delete());
    await assertSucceeds(storage(OWNER).ref(`salons/${SALON_ID}/bilde.jpg`).delete());
  });

  test('ingen kan skrive andre steder', async () => {
    await assertFails(upload(OWNER, { path: 'annet/bilde.jpg' }));
  });
});
