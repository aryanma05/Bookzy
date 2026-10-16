import { Linking, Platform, Share } from 'react-native';
import type { Salon } from './salons';
import { showAlert } from './alert';

export function openDirections(salon: Salon) {
  const query = encodeURIComponent(`${salon.name}, ${salon.address}`);
  const url =
    Platform.OS === 'ios'
      ? `https://maps.apple.com/?q=${query}`
      : `https://www.google.com/maps/search/?api=1&query=${query}`;
  Linking.openURL(url).catch(() => showAlert('Kunne ikke åpne kart'));
}

export function callSalon(salon: Salon) {
  if (!salon.phone) return;
  Linking.openURL(`tel:${salon.phone.replace(/\s+/g, '')}`).catch(() =>
    showAlert('Kunne ikke ringe', `Telefonnummeret er ${salon.phone}.`)
  );
}

export async function shareSalon(salon: Salon) {
  const message = `${salon.name} – ${salon.address}. Book time i Bookzy-appen.`;
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
