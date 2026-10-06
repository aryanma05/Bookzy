// Dato- og tidshjelpere for booking. Alle tider er lokal tid på enheten (salongene ligger i Norge).

export const SLOT_INTERVAL_MIN = 30;

export type WeekdayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
export type DayHours = { open: string; close: string };
export type OpeningHours = Partial<Record<WeekdayKey, DayHours | null>>;

const WEEKDAY_KEYS: WeekdayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const WEEKDAYS_SHORT = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
const WEEKDAYS_LONG = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const MONTHS_LONG = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
];

const pad = (value: number) => String(value).padStart(2, '0');

/** '2026-10-06' – brukes som dato i Firestore og i slot-ID-er. */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function toTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function toStartDate(dateKey: string, time: string): Date {
  const date = fromDateKey(dateKey);
  date.setMinutes(toMinutes(time));
  return date;
}

export function upcomingDates(from: Date, count: number): Date[] {
  return Array.from(
    { length: count },
    (_, index) => new Date(from.getFullYear(), from.getMonth(), from.getDate() + index)
  );
}

export function hoursForDate(openingHours: OpeningHours, date: Date): DayHours | null {
  return openingHours[WEEKDAY_KEYS[date.getDay()]] ?? null;
}

/** Alle 30-minutters luker en behandling som starter kl. `time` legger beslag på. */
export function slotTimesFor(time: string, durationMin: number): string[] {
  const start = toMinutes(time);
  const count = Math.max(1, Math.ceil(durationMin / SLOT_INTERVAL_MIN));
  return Array.from({ length: count }, (_, index) => toTime(start + index * SLOT_INTERVAL_MIN));
}

/** Må stemme med ID-formatet som firestore.rules krever for /slots. */
export function slotId(salonId: string, dateKey: string, time: string): string {
  return `${salonId}_${dateKey}_${time}`;
}

/** Starttider der hele behandlingen får plass innenfor åpningstiden uten å kollidere med andre bookinger. */
export function getAvailableTimes({
  openingHours,
  date,
  durationMin,
  takenTimes,
  now,
}: {
  openingHours: OpeningHours;
  date: Date;
  durationMin: number;
  takenTimes: Set<string>;
  now: Date;
}): string[] {
  const hours = hoursForDate(openingHours, date);
  if (!hours) return [];

  const close = toMinutes(hours.close);
  const earliest = toDateKey(date) === toDateKey(now) ? now.getHours() * 60 + now.getMinutes() : -1;
  const times: string[] = [];

  for (let start = toMinutes(hours.open); start + durationMin <= close; start += SLOT_INTERVAL_MIN) {
    if (start <= earliest) continue;
    const time = toTime(start);
    if (slotTimesFor(time, durationMin).every((slot) => !takenTimes.has(slot))) {
      times.push(time);
    }
  }
  return times;
}

export function formatDayChip(date: Date): { weekday: string; day: string } {
  return { weekday: WEEKDAYS_SHORT[date.getDay()], day: `${date.getDate()}. ${MONTHS_SHORT[date.getMonth()]}` };
}

/** «I dag», «I morgen» eller «Tirsdag 7. oktober». */
export function formatDay(date: Date, now: Date): string {
  const today = toDateKey(now);
  const tomorrow = toDateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const key = toDateKey(date);
  if (key === today) return 'I dag';
  if (key === tomorrow) return 'I morgen';

  const weekday = WEEKDAYS_LONG[date.getDay()];
  const yearSuffix = date.getFullYear() !== now.getFullYear() ? ` ${date.getFullYear()}` : '';
  return `${weekday[0].toUpperCase()}${weekday.slice(1)} ${date.getDate()}. ${MONTHS_LONG[date.getMonth()]}${yearSuffix}`;
}
