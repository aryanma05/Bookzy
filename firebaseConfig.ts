import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBJa7KjIzH9GK_nsF4xABLjVVBHVnr8qiI",
  authDomain: "timeflyt.firebaseapp.com",
  projectId: "timeflyt",
  storageBucket: "timeflyt.firebasestorage.app",
  messagingSenderId: "195961528394",
  appId: "1:195961528394:web:aed77e00b811bc01a986b3",
  measurementId: "G-S9RW09G2DJ"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);