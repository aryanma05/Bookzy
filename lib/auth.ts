import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { app, emulatorHost } from './firebase';

// Web: Firebase lagrer innloggingen i nettleseren selv. iOS/Android bruker auth.native.ts.
export const auth = getAuth(app);

if (emulatorHost) {
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
}
