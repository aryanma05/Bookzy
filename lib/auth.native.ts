import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  connectAuthEmulator,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  type Auth,
  type ConfirmationResult,
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

if (emulatorHost && !auth.emulatorConfig) {
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
}

// shortcut: SMS-innlogging krever @react-native-firebase i appen, så her logger kunden inn med e-post. Legg det til hvis appen skal ha SMS.
export const smsSignInSupported = false;

export function sendSmsCode(_phoneNumber: string): Promise<ConfirmationResult> {
  return Promise.reject(new Error('SMS-innlogging finnes bare på nettet.'));
}
