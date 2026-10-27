import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { calendarIcs, newCalendarToken, parseCalendarPath, tokenMatches, type CalendarEvent } from './calendar';

const NOW = new Date('2026-10-27T12:00:00Z');

const event = (changes: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'b1',
  startAt: new Date('2026-10-28T08:00:00Z'),
  durationMin: 75,
  serviceName: 'Gelénegler',
  customerName: 'Kari Nordmann',
  customerPhone: '+4740000000',
  note: '',
  staffName: '',
  pending: false,
  link: 'https://bookzy.no/business/booking/b1',
  ...changes,
});

/** Linjene slik en kalender leser dem, med brettede linjer satt sammen igjen. */
const unfold = (ics: string) => ics.replace(/\r\n /g, '').split('\r\n');

describe('kalenderlenken', () => {
  test('timen har tid i UTC, kort navn i tittelen og hele navnet og nummeret i beskrivelsen', () => {
    const ics = calendarIcs('Negler hos Lina', [event()], NOW);
    assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
    assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
    assert.doesNotMatch(ics.replace(/\r\n/g, ''), /\n/);
    const lines = unfold(ics);
    assert.ok(lines.includes('X-WR-CALNAME:Bookzy – Negler hos Lina'));
    assert.ok(lines.includes('DTSTART:20261028T080000Z'));
    assert.ok(lines.includes('DTEND:20261028T091500Z'));
    assert.ok(lines.includes('SUMMARY:Gelénegler – Kari N.'));
    assert.ok(lines.includes('DESCRIPTION:Kunde: Kari Nordmann\\nTelefon: +4740000000'));
    assert.ok(lines.includes('STATUS:CONFIRMED'));
    assert.ok(lines.includes('UID:b1@bookzy'));
  });

  test('forespørsler vises som foreløpige', () => {
    const lines = unfold(calendarIcs('Salong', [event({ pending: true })], NOW));
    assert.ok(lines.includes('SUMMARY:Forespørsel: Gelénegler – Kari N.'));
    assert.ok(lines.includes('STATUS:TENTATIVE'));
  });

  test('komma, semikolon, skråstrek og linjeskift fra kunden escapes', () => {
    const lines = unfold(calendarIcs('Salong', [event({ note: 'Kort, tynn; \\ ikke\nlakk' })], NOW));
    const description = lines.find((line) => line.startsWith('DESCRIPTION:'));
    assert.equal(description, 'DESCRIPTION:Kunde: Kari Nordmann\\nTelefon: +4740000000\\nBeskjed: Kort\\, tynn\\; \\\\ ikke\\nlakk');
  });

  test('lange linjer brytes på maks 75 byte uten å dele æ, ø og å', () => {
    const note = 'Jeg ønsker å få fjernet gammel gelé først, og så nye negler i blått og hvitt med glitter på ringfingeren.';
    const ics = calendarIcs('Salong', [event({ note })], NOW);
    for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, line);
    assert.ok(unfold(ics).some((line) => line.endsWith(`Beskjed: ${note.replace(/,/g, '\\,')}`)));
  });

  test('flere ansatte: hvem timen er hos', () => {
    const lines = unfold(calendarIcs('Salong', [event({ staffName: 'Maria' })], NOW));
    assert.ok(lines.some((line) => line.includes('\\nHos: Maria')));
  });

  test('nøkkelen må stemme helt', () => {
    const token = newCalendarToken();
    assert.match(token, /^[A-Za-z0-9_-]{32}$/);
    assert.notEqual(token, newCalendarToken());
    assert.equal(tokenMatches(token, token), true);
    assert.equal(tokenMatches(`${token.slice(0, 31)}x`, token), token.endsWith('x'));
    assert.equal(tokenMatches(token, undefined), false);
    assert.equal(tokenMatches(token.slice(0, 20), token.slice(0, 20)), false);
  });

  test('adressen', () => {
    const token = 'a'.repeat(32);
    assert.deepEqual(parseCalendarPath(`/kalender/negler-hos-lina/${token}.ics`), { salonId: 'negler-hos-lina', token });
    assert.equal(parseCalendarPath(`/kalender/negler-hos-lina/${token}`), null);
    assert.equal(parseCalendarPath(`/kalender/../private/${token}.ics`), null);
    assert.equal(parseCalendarPath(`/kalender/a/b/${token}.ics`), null);
    assert.equal(parseCalendarPath('/negler-hos-lina'), null);
  });
});
