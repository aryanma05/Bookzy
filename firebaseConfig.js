import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore'; // For databasen

// Din Firebase-konfigurasjon (disse tallene får du fra Firebase nettsiden)
const firebaseConfig = {
  apiKey: "DIN_API_KEY",
  authDomain: "ditt-prosjekt.firebaseapp.com",
  projectId: "ditt-prosjekt",
  storageBucket: "ditt-prosjekt.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);