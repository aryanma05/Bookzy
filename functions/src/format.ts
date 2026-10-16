// Tekst- og tidshjelpere. Salongene ligger i Norge, så tider regnes alltid i norsk tid,
// uansett hvor serveren kjører.

const TIME_ZONE = 'Europe/Oslo';
const HOUR = 60 * 60 * 1000;

const WEEKDAYS = ['søndag', 'mandag', 'tirsdag', 'onsdag', 'torsdag', 'fredag', 'lørdag'];
const MONTHS = [
  'januar', 'februar', 'mars', 'april', 'mai', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'desember',
];

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const dateKeyFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** '2026-10-09' i norsk tid. */
export function osloDateKey(date: Date): string {
  return dateKeyFormat.format(date);
}

/** '09:30' i norsk tid. */
export function osloTime(date: Date): string {
  return timeFormat.format(date);
}

function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDaysToKey(key: string, days: number): string {
  const date = fromDateKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && DATE_KEY.test(value);
}

export function isTime(value: unknown): value is string {
  return typeof value === 'string' && TIME.test(value);
}

/** «fredag 10. oktober» */
export function formatDate(dateKey: string): string {
  const date = fromDateKey(dateKey);
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()}. ${MONTHS[date.getUTCMonth()]}`;
}

/** «i dag», «i morgen» eller «fredag 10. oktober», sett fra `now`. */
export function relativeDate(dateKey: string, now: Date): string {
  const today = osloDateKey(now);
  if (dateKey === today) return 'i dag';
  if (dateKey === addDaysToKey(today, 1)) return 'i morgen';
  return formatDate(dateKey);
}

/** «fredag 9. oktober kl 10:00» */
export function formatDateTime(date: Date): string {
  return `${formatDate(osloDateKey(date))} kl ${osloTime(date)}`;
}

export function endTime(time: string, durationMin: number): string {
  const [hours, minutes] = time.split(':').map(Number);
  const end = hours * 60 + minutes + durationMin;
  return `${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`;
}

export function formatPrice(priceNok: number): string {
  return `${priceNok.toLocaleString('nb-NO')} kr`;
}

/** Brukerskrevet tekst på én linje: uten linjeskift og kontrolltegn, og ikke for lang. */
export function clean(value: unknown, maxLength = 80): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

/** Som clean(), men beholder linjeskift. Brukes på beskjeden fra kunden. */
export function cleanMultiline(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f\u2028\u2029]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

/** «Kari Nordmann» → «Kari N.» – slik kunden vises i push-varsler på låseskjermen. */
export function shortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'En kunde';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

/**
 * Når kunden skal minnes på timen: et døgn før, eller to timer før hvis timen er booket
 * mindre enn et døgn i forveien. Timer som starter om under tre timer, får ingen påminnelse.
 */
export function reminderTime(startAt: Date, now: Date): Date | null {
  const lead = startAt.getTime() - now.getTime();
  if (lead > 25 * HOUR) return new Date(startAt.getTime() - 24 * HOUR);
  if (lead > 3 * HOUR) return new Date(startAt.getTime() - 2 * HOUR);
  return null;
}
