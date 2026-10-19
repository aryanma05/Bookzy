import { initializeApp, getApps, getApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

// Disse verdiene er ikke hemmelige – de ligger uansett i appen. Det er firestore.rules og storage.rules som styrer tilgangen.
const firebaseConfig = {
  apiKey: "AIzaSyBJa7KjIzH9GK_nsF4xABLjVVBHVnr8qiI",
  authDomain: "timeflyt.firebaseapp.com",
  projectId: "timeflyt",
  storageBucket: "timeflyt.firebasestorage.app",
  messagingSenderId: "195961528394",
  appId: "1:195961528394:web:aed77e00b811bc01a986b3",
  measurementId: "G-S9RW09G2DJ"
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const storage = getStorage(app);

// Med EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true i .env.local går appen mot lokale emulatorer
// (npm run emulators) i stedet for den ekte databasen.
export const emulatorHost =
  process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true'
    ? process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST || 'localhost'
    : null;

if (emulatorHost) {
  connectFirestoreEmulator(db, emulatorHost, 8080);
  connectStorageEmulator(storage, emulatorHost, 9199);
}
