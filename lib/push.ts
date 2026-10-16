import { useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Varslene sendes fra serveren (functions/). Appen sier bare fra om hvilken enhet brukeren er på.
// På nettet finnes ikke push, så der kommer påminnelsene på e-post i stedet.
export const pushSupported = Platform.OS === 'ios' || Platform.OS === 'android';

const TOKEN_KEY = 'timeflyt:pushToken';
// Fra før påminnelsene ble flyttet til serveren
const OLD_REMINDER_KEYS = ['timeflyt:reminderIds', 'timeflyt:remindersEnabled'];

if (pushSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// Må stemme med channelId i functions/src/push.ts. På Android 13+ må kanalene finnes før vi spør om lov.
async function createChannels() {
  if (Platform.OS !== 'android') return;
  await Promise.all([
    Notifications.setNotificationChannelAsync('reminders', {
      name: 'Påminnelser om timer',
      importance: Notifications.AndroidImportance.DEFAULT,
    }),
    Notifications.setNotificationChannelAsync('bookings', {
      name: 'Bookinger og avbestillinger',
      importance: Notifications.AndroidImportance.HIGH,
    }),
  ]);
}

async function hasPermission(ask: boolean): Promise<boolean> {
  await createChannels();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!ask || !current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Tidsavbrudd')), ms)),
  ]);
}

/** «denied» = brukeren har sagt nei til varsler. «unavailable» = push virker ikke her (nettet, Expo Go o.l.). */
export type PushStatus = 'enabled' | 'denied' | 'unavailable';

/**
 * Kobler enheten til brukeren, så serveren kan sende varsler hit. Med `ask` spør vi om lov
 * hvis brukeren ikke har svart før – bruk det bare når det gir mening, f.eks. rett etter en booking.
 */
export async function registerForPush(uid: string, { ask = false }: { ask?: boolean } = {}): Promise<PushStatus> {
  if (!pushSupported) return 'unavailable';
  try {
    if (!(await hasPermission(ask))) {
      // Har brukeren slått av varsler i innstillingene, sender serveren e-post i stedet
      await unregisterPush();
      return 'denied';
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn('Push-varsler krever et EAS-prosjekt. Kjør `npx eas-cli init` (se README).');
      return 'unavailable';
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    const previous = await AsyncStorage.getItem(TOKEN_KEY);
    await setDoc(doc(db, 'pushTokens', token), { uid, platform: Platform.OS, updatedAt: serverTimestamp() });
    await AsyncStorage.setItem(TOKEN_KEY, token);
    if (previous && previous !== token) {
      deleteDoc(doc(db, 'pushTokens', previous)).catch(() => {});
    }
    return 'enabled';
  } catch (error) {
    // Skjer f.eks. i Expo Go på Android, som ikke har push
    console.warn('Kunne ikke slå på push-varsler:', error);
    return 'unavailable';
  }
}

/** Om appen har lov til å vise varsler på denne enheten. */
export async function pushPermissionGranted(): Promise<boolean> {
  if (!pushSupported) return false;
  try {
    return (await Notifications.getPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Kalles før utlogging, så neste som bruker telefonen ikke får varslene dine. */
export async function unregisterPush() {
  if (!pushSupported) return;
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return;
    // Uten nett blir deleteDoc hengende, og utloggingen skal ikke vente på det.
    // Enheten byttes uansett over til den som logger inn neste gang.
    await withTimeout(deleteDoc(doc(db, 'pushTokens', token)), 5000);
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.warn('Kunne ikke koble fra enheten:', error);
  }
}

/** Påminnelser ble før planlagt lokalt på telefonen. Nå kommer de fra serveren, så de gamle fjernes. */
async function clearLocalReminders() {
  if ((await AsyncStorage.getItem(OLD_REMINDER_KEYS[0])) === null) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.multiRemove(OLD_REMINDER_KEYS);
}

/** Holder enheten registrert på den innloggede brukeren, uten å spørre om lov. */
export function usePushRegistration(uid: string | null) {
  useEffect(() => {
    if (!uid || !pushSupported) return;
    clearLocalReminders().catch(() => {});
    registerForPush(uid);
    // Tokenet kan i sjeldne tilfeller bytte seg ut
    const subscription = Notifications.addPushTokenListener(() => {
      registerForPush(uid);
    });
    return () => subscription.remove();
  }, [uid]);
}
