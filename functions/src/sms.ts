import { logger } from 'firebase-functions';
import { claim } from './booking';
import { elksApiPassword, elksApiUser, isEmulator } from './config';
import { findUser } from './email';
import { clean } from './format';
import { postJson } from './http';

const SENDER = 'Bookzy';

/** Mobilnummeret brukeren logget inn med. Firebase har allerede bekreftet det med en SMS-kode. */
export async function verifiedPhone(uid: string): Promise<string | null> {
  const user = await findUser(uid);
  return user?.phoneNumber && !user.disabled ? user.phoneNumber : null;
}

/** `key` hindrer at samme SMS sendes to ganger. 46elks har ingen idempotens-nøkkel som Resend, så den tas i sentNotifications. */
export async function sendSms(to: string, text: string, key: string): Promise<void> {
  if (isEmulator) {
    logger.info('SMS (ikke sendt i emulatoren)', { to, text });
    return;
  }

  const user = clean(elksApiUser.value(), 100);
  if (!user) {
    logger.error('ELKS_API_USER er ikke satt, så SMS blir ikke sendt. Se README.');
    return;
  }
  if (!(await claim(`sms_${key.replace(/\//g, '_')}`))) return;

  // 46elks tar skjemadata, ikke JSON. Nummeret er allerede +47… fra Firebase, slik 46elks vil ha det.
  // Kopierer man passordet fra dashbordet hos 46elks, kommer det lett med et mellomrom, og da svarer de 401.
  await postJson('https://api.46elks.com/a1/sms', new URLSearchParams({ from: SENDER, to, message: text }), {
    authorization: `Basic ${Buffer.from(`${user}:${elksApiPassword.value().trim()}`).toString('base64')}`,
  });
}
