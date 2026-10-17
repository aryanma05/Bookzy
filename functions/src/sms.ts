import { logger } from 'firebase-functions';
import { claim } from './booking';
import { isEmulator, sveveApiKey, sveveUser } from './config';
import { findUser } from './email';
import { clean } from './format';
import { postJson } from './http';

const SENDER = 'Bookzy';

type SveveResponse = {
  response?: { msgOkCount?: number; fatalError?: string; errors?: { message?: string }[] };
};

/** Mobilnummeret brukeren logget inn med. Firebase har allerede bekreftet det med en SMS-kode. */
export async function verifiedPhone(uid: string): Promise<string | null> {
  const user = await findUser(uid);
  return user?.phoneNumber && !user.disabled ? user.phoneNumber : null;
}

/** `key` hindrer at samme SMS sendes to ganger. Sveve har ingen idempotens-nøkkel som Resend, så den tas i sentNotifications. */
export async function sendSms(to: string, text: string, key: string): Promise<void> {
  if (isEmulator) {
    logger.info('SMS (ikke sendt i emulatoren)', { to, text });
    return;
  }

  const user = clean(sveveUser.value(), 100);
  if (!user) {
    logger.error('SVEVE_USER er ikke satt, så SMS blir ikke sendt. Se README.');
    return;
  }
  if (!(await claim(`sms_${key.replace(/\//g, '_')}`))) return;

  const { response } = (await postJson(
    'https://sveve.no/SMS/SendMessage',
    // Firebase lagrer +47…; 00 foran landskoden er formatet SMS-leverandørene alltid godtar
    { user, passwd: sveveApiKey.value(), to: to.replace(/^\+/, '00'), msg: text, from: SENDER, f: 'json' },
    {}
  )) as SveveResponse;
  // Sveve sier fra om feil i svaret, ikke med statuskoden
  if (!response?.msgOkCount) {
    throw new Error(`Sveve sendte ikke SMS: ${response?.fatalError || response?.errors?.[0]?.message || 'ukjent feil'}`);
  }
}
