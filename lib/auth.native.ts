import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  connectAuthEmulator,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { app, emulatorHost } from './firebase';

// På iOS/Android må vi selv gi Firebase et sted å lagre innloggingen, ellers logges brukeren ut ved hver omstart.
function createAuth(): Auth {
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch {
    // initializeAuth kan bare kalles én gang – ved hot reload finnes instansen allerede.
    return getAuth(app);
  }
}

export const auth = createAuth();
// E-postene fra Firebase (bekreft e-post, nytt passord) og SMS-koden på norsk i stedet for engelsk
auth.languageCode = 'no';

if (emulatorHost && !auth.emulatorConfig) {
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
}

// shortcut: SMS-innlogging krever @react-native-firebase i appen, så her logger kunden inn med e-post. Legg det til hvis appen skal ha SMS.
export const smsSignInSupported = false;

export function sendSmsCode(_phoneNumber: string, _linkTo?: User): Promise<ConfirmationResult> {
  return Promise.reject(new Error('SMS-innlogging finnes bare på nettet.'));
}
