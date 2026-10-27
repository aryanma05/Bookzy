import { defineSecret, defineString } from 'firebase-functions/params';

// Hemmelighetene ligger i Secret Manager og settes med `firebase functions:secrets:set NAVN`.
export const resendApiKey = defineSecret('RESEND_API_KEY', {
  description: 'API-nøkkel fra Resend (resend.com) for å sende e-post.',
});

export const expoAccessToken = defineSecret('EXPO_ACCESS_TOKEN', {
  description: 'Tilgangstoken fra expo.dev. Slå på «Enhanced security for push notifications» for prosjektet.',
});

export const elksApiPassword = defineSecret('ELKS_API_PASSWORD', {
  description: 'API-passordet fra 46elks (står på dashbordet på 46elks.com) for å sende SMS.',
});

// Tom standardverdi, så emulatoren starter uten oppsett. `firebase deploy` spør likevel.
export const elksApiUser = defineString('ELKS_API_USER', {
  default: '',
  description: 'API-brukernavnet hos 46elks, ikke e-posten du logger inn med. SMS sendes ikke før det er satt.',
});

export const emailFrom = defineString('EMAIL_FROM', {
  default: '',
  description: 'Avsender, f.eks. «Bookzy <varsler@dittdomene.no>». Domenet må være verifisert hos Resend.',
});

export const appUrl = defineString('APP_URL', {
  default: '',
  description: 'Adressen til nettversjonen av appen (https://…), brukes til lenker i e-postene. Kan stå tom.',
});

/** I emulatoren logges varslene i stedet for å sendes, så testdata aldri går til ekte mottakere. */
export const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

/** Lenke til en side i nettappen, eller null hvis APP_URL ikke er satt til en https-adresse. */
export function appLink(path: string): string | null {
  const base = appUrl.value().trim().replace(/\/+$/, '');
  if (!/^https:\/\/[^\s/]+/.test(base)) return null;
  return `${base}${path}`;
}
