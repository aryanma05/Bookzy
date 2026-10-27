import { Linking, Platform, Share } from 'react-native';
import { displayAddress, type Salon } from './salons';
import { showAlert } from './alert';
import { toE164 } from './phone';

// Bare adressen: med navnet foran viser kartet navnet på hjemmesalongen, eller finner et annet sted med samme navn
export function openDirections(address: string) {
  const query = encodeURIComponent(address);
  const url =
    Platform.OS === 'ios'
      ? `https://maps.apple.com/?q=${query}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;
  Linking.openURL(url).catch(() => showAlert('Kunne ikke åpne kart'));
}

/**
 * Åpner en tel:-, sms:- eller webcal:-lenke. react-native-web åpner lenker i en ny fane,
 * og det stopper mobilnettlesere og Instagram-nettleseren, så på nettet byttes adressen i samme fane.
 */
export async function openPhoneLink(url: string) {
  if (Platform.OS === 'web') {
    window.location.href = url;
    return;
  }
  await Linking.openURL(url);
}

export function callSalon(salon: Salon) {
  if (!salon.phone) return;
  const number = toE164(salon.phone) ?? salon.phone.replace(/[^\d+]/g, '');
  openPhoneLink(`tel:${number}`).catch(() => showAlert('Kunne ikke ringe', `Telefonnummeret er ${salon.phone}.`));
}

// Adressen til nettversjonen, samme verdi som APP_URL i functions. Uten den deles salongen uten lenke.
const appUrl = (process.env.EXPO_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');

/**
 * Den korte lenken til salongen (bookzy.no/negler-hos-lina), eller null hvis EXPO_PUBLIC_APP_URL ikke er satt.
 * Den viser navnet og forsidebildet når den deles, og sender kunden videre til salongsiden (salonLinkPage i functions).
 */
export function salonLink(salonId: string): string | null {
  return appUrl ? `${appUrl}/${encodeURIComponent(salonId)}` : null;
}

/** Kalenderlenken salongen abonnerer på i kalenderappen (calendarFeed i functions), eller null uten EXPO_PUBLIC_APP_URL. */
export function calendarFeedLink(salonId: string, token: string): string | null {
  return appUrl ? `${appUrl}/kalender/${encodeURIComponent(salonId)}/${token}.ics` : null;
}

/** For salongen selv: bare lenken, så den kan limes rett inn i Instagram-bio eller en SMS. */
export async function shareBookingLink(link: string) {
  try {
    if (Platform.OS === 'web') {
      await navigator.clipboard.writeText(link);
      showAlert('Lenken er kopiert', link);
      return;
    }
    await Share.share({ message: link });
  } catch {
    // Avbrutt, eller nettleseren nektet tilgang til utklippstavlen. Lenken står også under knappen.
  }
}

export async function shareSalon(salon: Salon) {
  const link = salonLink(salon.id);
  const message = link
    ? `${salon.name} – ${displayAddress(salon)}. Book time her: ${link}`
    : `${salon.name} – ${displayAddress(salon)}. Book time i Bookzy-appen.`;
  try {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: salon.name, text: message });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(message);
        showAlert('Kopiert', 'Informasjon om salongen er kopiert til utklippstavlen.');
      }
      return;
    }
    await Share.share({ message, title: salon.name });
  } catch {
    // Brukeren avbrøt delingen
  }
}
