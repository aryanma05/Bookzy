import { connectAuthEmulator, getAuth, linkWithPhoneNumber, signInWithPhoneNumber, type ApplicationVerifier, type User } from 'firebase/auth';
// @ts-expect-error Finnes bare i nettlesertypene, og tsconfig peker på React Native-typene (se paths der)
import { RecaptchaVerifier } from 'firebase/auth';
import { app, emulatorHost } from './firebase';

// Web: Firebase lagrer innloggingen i nettleseren selv. iOS/Android bruker auth.native.ts.
export const auth = getAuth(app);
// E-postene fra Firebase (bekreft e-post, nytt passord) og SMS-koden på norsk i stedet for engelsk
auth.languageCode = 'no';

if (emulatorHost) {
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
}

/** Innlogging med kode på SMS. Bare på nettet – i appen trenger Firebase en native modul for det. */
export const smsSignInSupported = true;

let recaptcha: ApplicationVerifier | undefined;

/**
 * Sender en engangskode til nummeret (+47…). Usynlig reCAPTCHA hindrer roboter i å sende SMS-er på vår regning.
 * Med `linkTo` kobles nummeret til den kontoen, så SMS-innlogging gir samme konto som e-post.
 */
export function sendSmsCode(phoneNumber: string, linkTo?: User) {
  // Firebase nullstiller den etter hvert forsøk, så samme kan brukes for «send ny kode»
  recaptcha ??= new RecaptchaVerifier(auth, document.body.appendChild(document.createElement('div')), { size: 'invisible' });
  return linkTo ? linkWithPhoneNumber(linkTo, phoneNumber, recaptcha) : signInWithPhoneNumber(auth, phoneNumber, recaptcha);
}
