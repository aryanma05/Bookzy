// Dato- og tidshjelpere for booking. Alle tider er lokal tid på enheten (salongene ligger i Norge).

export const SLOT_INTERVAL_MIN = 30;

export type WeekdayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
export type TimeRange = { start: string; end: string };
/** `breaks` er pauser der kundene ikke kan booke, f.eks. lunsj. */
export type DayHours = { open: string; close: string; breaks?: TimeRange[] };
export type OpeningHours = Partial<Record<WeekdayKey, DayHours | null>>;

/** staffId → tider (HH:mm) som allerede er booket */
export type TakenSlots = Map<string, Set<string>>;

const WEEKDAY_KEYS: WeekdayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const WEEKDAYS_SHORT = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
const WEEKDAYS_LONG = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const MONTHS_SHORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const MONTHS_LONG = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
];

/** Mandag først, slik åpningstider vises i Norge. */
export const WEEK: { key: WeekdayKey; label: string }[] = [
  { key: 'mon', label: 'Mandag' },
  { key: 'tue', label: 'Tirsdag' },
  { key: 'wed', label: 'Onsdag' },
  { key: 'thu', label: 'Torsdag' },
  { key: 'fri', label: 'Fredag' },
  { key: 'sat', label: 'Lørdag' },
  { key: 'sun', label: 'Søndag' },
];

const pad = (value: number) => String(value).padStart(2, '0');
const capitalize = (text: string) => text[0].toUpperCase() + text.slice(1);

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

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function upcomingDates(from: Date, count: number): Date[] {
  return Array.from({ length: count }, (_, index) => addDays(from, index));
}

export function weekdayKey(date: Date): WeekdayKey {
  return WEEKDAY_KEYS[date.getDay()];
}

/** Fridager lagres som «2026-10-12» (hele salongen) eller «2026-10-12_maria» (bare én ansatt). */
export function dayOffKey(dateKey: string, staffId?: string | null): string {
  return staffId ? `${dateKey}_${staffId}` : dateKey;
}

export function isDayOff(closedDates: string[], dateKey: string, staffId?: string): boolean {
  return closedDates.includes(dateKey) || (!!staffId && closedDates.includes(dayOffKey(dateKey, staffId)));
}

export function hoursForDate(openingHours: OpeningHours, date: Date, closedDates: string[] = []): DayHours | null {
  if (closedDates.includes(toDateKey(date))) return null;
  return openingHours[weekdayKey(date)] ?? null;
}

/** Alle 30-minutters luker en behandling som starter kl. `time` legger beslag på. */
export function slotTimesFor(time: string, durationMin: number): string[] {
  const start = toMinutes(time);
  const count = Math.max(1, Math.ceil(durationMin / SLOT_INTERVAL_MIN));
  return Array.from({ length: count }, (_, index) => toTime(start + index * SLOT_INTERVAL_MIN));
}

/** Må stemme med ID-formatet som firestore.rules krever for /slots. */
export function slotId(salonId: string, staffId: string, dateKey: string, time: string): string {
  return `${salonId}_${staffId}_${dateKey}_${time}`;
}

export type AvailableTime = { time: string; staffIds: string[] };

/**
 * Starttider der behandlingen får plass innenfor åpningstiden hos minst én av de valgte ansatte.
 * `staffIds` på hvert resultat er de som faktisk er ledige da.
 */
export function getAvailableTimes({
  openingHours,
  closedDates = [],
  date,
  durationMin,
  staffIds: requestedStaffIds,
  taken,
  now,
}: {
  openingHours: OpeningHours;
  closedDates?: string[];
  date: Date;
  durationMin: number;
  staffIds: string[];
  taken: TakenSlots;
  now: Date;
}): AvailableTime[] {
  const hours = hoursForDate(openingHours, date, closedDates);
  const staffIds = requestedStaffIds.filter((staffId) => !isDayOff(closedDates, toDateKey(date), staffId));
  if (!hours || staffIds.length === 0) return [];

  const close = toMinutes(hours.close);
  const breaks = (hours.breaks ?? []).map((pause) => [toMinutes(pause.start), toMinutes(pause.end)]);
  const isToday = toDateKey(date) === toDateKey(now);
  // Litt margin, så ingen booker en time som starter om fem minutter
  const earliest = isToday ? now.getHours() * 60 + now.getMinutes() + 15 : -1;
  const result: AvailableTime[] = [];

  for (let start = toMinutes(hours.open); start + durationMin <= close; start += SLOT_INTERVAL_MIN) {
    if (start < earliest) continue;
    // Behandlingen kan slutte når pausen starter, men ikke gå inn i den
    if (breaks.some(([from, to]) => start < to && start + durationMin > from)) continue;
    const time = toTime(start);
    const needed = slotTimesFor(time, durationMin);
    const free = staffIds.filter((staffId) => {
      const busy = taken.get(staffId);
      return !busy || needed.every((slot) => !busy.has(slot));
    });
    if (free.length > 0) result.push({ time, staffIds: free });
  }
  return result;
}

export type OverviewTime = { time: string; booked: boolean };

/**
 * Ledige og bookede starttider for én dag, til oversikten salongen deler på f.eks. Instagram.
 * Ledige tider legges etter hverandre (13:00 og 16:00 for en tretimers behandling), ikke hver halvtime.
 */
export function dayOverview({
  openingHours,
  closedDates,
  date,
  durationMin,
  staffIds,
  bookings,
  now,
}: {
  openingHours: OpeningHours;
  closedDates: string[];
  date: Date;
  durationMin: number;
  staffIds: string[];
  bookings: { time: string; durationMin: number; staffId: string }[];
  now: Date;
}): OverviewTime[] {
  const taken: TakenSlots = new Map();
  for (const booking of bookings) {
    if (!taken.has(booking.staffId)) taken.set(booking.staffId, new Set());
    for (const slot of slotTimesFor(booking.time, booking.durationMin)) taken.get(booking.staffId)!.add(slot);
  }

  // shortcut: med flere ansatte vises hver tid én gang og som om én person tar alle timene; del opp per ansatt hvis større salonger trenger det
  const free: string[] = [];
  if (toDateKey(date) >= toDateKey(now)) {
    let next = 0;
    for (const { time } of getAvailableTimes({ openingHours, closedDates, date, durationMin, staffIds, taken, now })) {
      if (toMinutes(time) < next) continue;
      free.push(time);
      next = toMinutes(time) + durationMin;
    }
  }
  const booked = [...new Set(bookings.map((booking) => booking.time))].filter((time) => !free.includes(time));
  return [...free.map((time) => ({ time, booked: false })), ...booked.map((time) => ({ time, booked: true }))].sort((a, b) =>
    a.time.localeCompare(b.time)
  );
}

export function groupByPeriod<T extends { time: string }>(items: T[]) {
  const groups = [
    { label: 'Morgen', items: [] as T[] },
    { label: 'Ettermiddag', items: [] as T[] },
    { label: 'Kveld', items: [] as T[] },
  ];
  for (const item of items) {
    const minutes = toMinutes(item.time);
    const index = minutes < 12 * 60 ? 0 : minutes < 17 * 60 ? 1 : 2;
    groups[index].items.push(item);
  }
  return groups.filter((group) => group.items.length > 0);
}

/** «Åpent til 18:00», «Stengt · åpner 10:00», «Stengt · åpner mandag 09:00». */
export function openStatus(openingHours: OpeningHours, now: Date, closedDates: string[] = []): { isOpen: boolean; text: string } {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = hoursForDate(openingHours, now, closedDates);

  if (today && minutes >= toMinutes(today.open) && minutes < toMinutes(today.close)) {
    const pause = today.breaks?.find((item) => minutes >= toMinutes(item.start) && minutes < toMinutes(item.end));
    if (pause) return { isOpen: false, text: `Pause · åpner igjen ${pause.end}` };
    return { isOpen: true, text: `Åpent til ${today.close}` };
  }
  if (today && minutes < toMinutes(today.open)) {
    return { isOpen: false, text: `Stengt · åpner ${today.open}` };
  }
  for (let offset = 1; offset <= 7; offset++) {
    const day = addDays(now, offset);
    const hours = hoursForDate(openingHours, day, closedDates);
    if (hours) {
      const when = offset === 1 ? 'i morgen' : WEEKDAYS_LONG[day.getDay()];
      return { isOpen: false, text: `Stengt · åpner ${when} ${hours.open}` };
    }
  }
  return { isOpen: false, text: 'Stengt' };
}

export function formatDayChip(date: Date): { weekday: string; day: string } {
  return { weekday: WEEKDAYS_SHORT[date.getDay()], day: String(date.getDate()) };
}

export function formatMonth(date: Date): string {
  return `${capitalize(MONTHS_LONG[date.getMonth()])} ${date.getFullYear()}`;
}

/** «Tir 7. okt» */
export function formatShortDate(date: Date): string {
  return `${WEEKDAYS_SHORT[date.getDay()]} ${date.getDate()}. ${MONTHS_SHORT[date.getMonth()]}`;
}

export function formatMonthShort(date: Date): string {
  return MONTHS_SHORT[date.getMonth()].toUpperCase();
}

/** «I dag», «I morgen» eller «Tirsdag 7. oktober». */
export function formatDay(date: Date, now: Date): string {
  const key = toDateKey(date);
  if (key === toDateKey(now)) return 'I dag';
  if (key === toDateKey(addDays(now, 1))) return 'I morgen';

  const yearSuffix = date.getFullYear() !== now.getFullYear() ? ` ${date.getFullYear()}` : '';
  return `${capitalize(WEEKDAYS_LONG[date.getDay()])} ${date.getDate()}. ${MONTHS_LONG[date.getMonth()]}${yearSuffix}`;
}

/** «12. august 2026» – brukes på anmeldelser. */
export function formatFullDate(date: Date): string {
  return `${date.getDate()}. ${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

/** Mandagen i uken datoen ligger i. */
export function startOfWeek(date: Date): Date {
  return addDays(date, -((date.getDay() + 6) % 7));
}

/** «12.–18. okt», «29. sep – 5. okt» eller «Tir 7. okt» når det bare er én dag. */
export function formatDateRange(from: Date, to: Date): string {
  if (toDateKey(from) === toDateKey(to)) return formatShortDate(from);
  if (from.getMonth() === to.getMonth()) {
    return `${from.getDate()}.–${to.getDate()}. ${MONTHS_SHORT[to.getMonth()]}`;
  }
  return `${from.getDate()}. ${MONTHS_SHORT[from.getMonth()]} – ${to.getDate()}. ${MONTHS_SHORT[to.getMonth()]}`;
}

export function formatWeekRange(monday: Date): string {
  return formatDateRange(monday, addDays(monday, 6));
}

/** Alle klokkeslett med `step` minutters mellomrom gjennom døgnet. */
export function timesOfDay(step = SLOT_INTERVAL_MIN): string[] {
  return Array.from({ length: (24 * 60) / step }, (_, index) => toTime(index * step));
}

export function formatTimeRange(time: string, durationMin: number): string {
  return `${time}–${toTime(toMinutes(time) + durationMin)}`;
}

/** Ukenummer etter ISO 8601, slik det brukes i norske kalendere. */
export function weekNumber(date: Date): number {
  const thursday = addDays(startOfWeek(date), 3);
  const firstThursday = addDays(startOfWeek(new Date(thursday.getFullYear(), 0, 4)), 3);
  return 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
}
