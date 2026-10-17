import { logger } from 'firebase-functions';
import { getAuth, type UserRecord } from 'firebase-admin/auth';
import { emailFrom, isEmulator, resendApiKey } from './config';
import { clean } from './format';
import { postJson } from './http';
import type { Email } from './messages';

/**
 * E-postadressen til brukeren, men bare hvis den er bekreftet. Uten dette kunne hvem som helst
 * registrert seg med en annens adresse og fått oss til å sende e-post dit.
 */
export async function verifiedEmail(uid: string): Promise<string | null> {
  const user = await findUser(uid);
  return user?.email && user.emailVerified && !user.disabled ? user.email : null;
}

/** Auth-brukeren, eller null hvis kontoen er slettet. */
export async function findUser(uid: string): Promise<UserRecord | null> {
  try {
    return await getAuth().getUser(uid);
  } catch (error) {
    if ((error as { code?: string }).code === 'auth/user-not-found') return null;
    throw error;
  }
}

/** `key` hindrer at samme e-post sendes to ganger hvis funksjonen kjøres på nytt. */
export async function sendEmail(to: string, email: Email, key: string): Promise<void> {
  const subject = clean(email.subject, 150);

  if (isEmulator) {
    logger.info(`E-post (ikke sendt i emulatoren): ${subject}`, { to, text: email.text });
    return;
  }

  const from = clean(emailFrom.value(), 200);
  if (!from) {
    logger.error('EMAIL_FROM er ikke satt, så e-post blir ikke sendt. Se README.');
    return;
  }

  await postJson(
    'https://api.resend.com/emails',
    { from, to: [to], subject, text: email.text, html: email.html },
    { authorization: `Bearer ${resendApiKey.value()}`, 'idempotency-key': key }
  );
}
