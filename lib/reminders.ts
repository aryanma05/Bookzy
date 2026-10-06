import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

export const remindersSupported = Platform.OS === 'ios' || Platform.OS === 'android';

const ENABLED_KEY = 'timeflyt:remindersEnabled';
const IDS_KEY = 'timeflyt:reminderIds';
const CHANNEL_ID = 'reminders';

if (remindersSupported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

type ReminderBooking = {
  id: string;
  salonName: string;
  serviceName: string;
  time: string;
  startAt: Date;
};

async function readIds(): Promise<Record<string, string>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(IDS_KEY)) ?? '{}');
  } catch {
    return {};
  }
}

async function writeIds(ids: Record<string, string>) {
  await AsyncStorage.setItem(IDS_KEY, JSON.stringify(ids));
}

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Påminnelser om timer',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export async function getRemindersEnabled(): Promise<boolean> {
  if (!remindersSupported) return false;
  return (await AsyncStorage.getItem(ENABLED_KEY)) !== 'false';
}

/** Returnerer den faktiske innstillingen – false hvis brukeren nektet varsler. */
export async function setRemindersEnabled(enabled: boolean): Promise<boolean> {
  if (!remindersSupported) return false;
  if (enabled && !(await ensurePermission())) return false;
  if (!enabled) await cancelAllReminders();
  await AsyncStorage.setItem(ENABLED_KEY, String(enabled));
  return enabled;
}

/** Varsler dagen før, eller to timer før hvis timen er nærmere enn ett døgn unna. */
export async function scheduleReminder(booking: ReminderBooking) {
  if (!remindersSupported) return;
  try {
    if (!(await getRemindersEnabled()) || !(await ensurePermission())) return;

    const now = Date.now();
    const dayBefore = new Date(booking.startAt.getTime() - 24 * 60 * 60 * 1000);
    const twoHoursBefore = new Date(booking.startAt.getTime() - 2 * 60 * 60 * 1000);
    const trigger = dayBefore.getTime() > now ? dayBefore : twoHoursBefore.getTime() > now ? twoHoursBefore : null;
    if (!trigger) return;

    const when = trigger === dayBefore ? 'i morgen' : 'i dag';
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Påminnelse om time',
        body: `${booking.serviceName} hos ${booking.salonName} ${when} kl ${booking.time}.`,
        data: { bookingId: booking.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger, channelId: CHANNEL_ID },
    });

    const ids = await readIds();
    ids[booking.id] = notificationId;
    await writeIds(ids);
  } catch (error) {
    console.warn('Kunne ikke planlegge påminnelse:', error);
  }
}

export async function cancelReminder(bookingId: string) {
  if (!remindersSupported) return;
  try {
    const ids = await readIds();
    if (!ids[bookingId]) return;
    await Notifications.cancelScheduledNotificationAsync(ids[bookingId]);
    delete ids[bookingId];
    await writeIds(ids);
  } catch (error) {
    console.warn('Kunne ikke fjerne påminnelse:', error);
  }
}

export async function cancelAllReminders() {
  if (!remindersSupported) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(IDS_KEY);
  } catch (error) {
    console.warn('Kunne ikke fjerne påminnelser:', error);
  }
}
