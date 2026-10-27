// Kalenderlenken: salongen abonnerer på den i Kalender-appen eller Google Kalender og ser timene sine der.
// Formatet er iCalendar (RFC 5545). Alt som kommer fra brukerne, er renset før det havner her (se booking.ts).
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { shortName } from './format';

export type CalendarEvent = {
  id: string;
  startAt: Date;
  durationMin: number;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  note: string;
  /** Tom når salongen bare har én ansatt. */
  staffName: string;
  /** Forespørsel som salongen ikke har svart på ennå. */
  pending: boolean;
  link: string | null;
};

const TOKEN = /^[A-Za-z0-9_-]{32}$/;
const PATH = /^\/kalender\/([A-Za-z0-9_-]{1,100})\/([A-Za-z0-9_-]{32})\.ics$/;

/** Ny hemmelig nøkkel til lenken: 24 tilfeldige byte, skrevet som 32 tegn som kan stå i en adresse. */
export function newCalendarToken(): string {
  return randomBytes(24).toString('base64url');
}

/** Sammenligner uten å avsløre hvor mange tegn som stemte. */
export function tokenMatches(given: unknown, stored: unknown): boolean {
  if (typeof given !== 'string' || typeof stored !== 'string' || !TOKEN.test(given) || given.length !== stored.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(given), Buffer.from(stored));
}

/** Salong og nøkkel fra /kalender/{salongId}/{nøkkel}.ics, eller null. */
export function parseCalendarPath(path: string): { salonId: string; token: string } | null {
  const match = PATH.exec(path);
  return match ? { salonId: match[1], token: match[2] } : null;
}

function escapeText(text: string): string {
  return text.replace(/[\\;,]/g, (char) => `\\${char}`).replace(/\n/g, '\\n');
}

/** 20261028T080000Z */
function utc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Linjer over 75 byte fortsetter på neste linje etter et mellomrom, uten å dele et tegn (RFC 5545 3.1). */
function fold(line: string): string {
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char);
    // Mellomrommet foran fortsettelseslinjene teller med
    if (bytes + size > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

function eventLines(event: CalendarEvent, now: Date): string[] {
  const end = new Date(event.startAt.getTime() + event.durationMin * 60 * 1000);
  // Fornavn og forbokstav i tittelen, som på låseskjermen. Hele navnet og telefonnummeret står i beskrivelsen.
  const title = `${event.serviceName} – ${shortName(event.customerName)}`;
  const description = [
    `Kunde: ${event.customerName}`,
    event.customerPhone && `Telefon: ${event.customerPhone}`,
    event.staffName && `Hos: ${event.staffName}`,
    event.note && `Beskjed: ${event.note}`,
    event.pending && 'Venter på svar fra deg i Bookzy.',
  ].filter(Boolean);
  return [
    'BEGIN:VEVENT',
    `UID:${event.id}@bookzy`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${utc(event.startAt)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${escapeText(event.pending ? `Forespørsel: ${title}` : title)}`,
    `DESCRIPTION:${escapeText(description.join('\n'))}`,
    ...(event.link ? [`URL:${event.link}`] : []),
    `STATUS:${event.pending ? 'TENTATIVE' : 'CONFIRMED'}`,
    'END:VEVENT',
  ];
}

export function calendarIcs(salonName: string, events: CalendarEvent[], now: Date): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bookzy//Kalender//NB',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(`Bookzy – ${salonName}`)}`,
    'X-WR-TIMEZONE:Europe/Oslo',
    // Ønsket oppdatering. iPhone og Google bestemmer selv hvor ofte de henter, men noen kalendere følger dette.
    'REFRESH-INTERVAL;VALUE=DURATION:PT15M',
    'X-PUBLISHED-TTL:PT15M',
    ...events.flatMap((event) => eventLines(event, now)),
    'END:VCALENDAR',
  ];
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
