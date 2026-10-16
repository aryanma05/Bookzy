import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  clean,
  cleanMultiline,
  endTime,
  escapeHtml,
  formatDate,
  osloDateKey,
  osloTime,
  relativeDate,
  reminderTime,
  shortName,
} from './format';

const HOUR = 60 * 60 * 1000;

describe('norsk tid', () => {
  test('dato og klokkeslett regnes i norsk tid, ikke serverens', () => {
    // 23:30 UTC er 01:30 neste dag i Norge om sommeren
    const date = new Date('2026-06-30T23:30:00Z');
    assert.equal(osloDateKey(date), '2026-07-01');
    assert.equal(osloTime(date), '01:30');
  });

  test('vintertid', () => {
    const date = new Date('2026-12-01T08:00:00Z');
    assert.equal(osloTime(date), '09:00');
  });

  test('formaterer dato på norsk', () => {
    assert.equal(formatDate('2026-10-09'), 'fredag 9. oktober');
  });

  test('i dag og i morgen', () => {
    const now = new Date('2026-10-09T20:00:00Z');
    assert.equal(relativeDate('2026-10-09', now), 'i dag');
    assert.equal(relativeDate('2026-10-10', now), 'i morgen');
    assert.equal(relativeDate('2026-10-12', now), 'mandag 12. oktober');
  });

  test('i morgen også når klokka stilles tilbake', () => {
    // Natt til 25. oktober 2026 går Norge over til vintertid
    const now = new Date('2026-10-24T21:30:00Z');
    assert.equal(relativeDate('2026-10-25', now), 'i morgen');
  });

  test('sluttid', () => {
    assert.equal(endTime('10:00', 45), '10:45');
    assert.equal(endTime('23:30', 60), '00:30');
  });
});

describe('påminnelser', () => {
  const start = new Date('2026-10-20T10:00:00Z');

  test('et døgn før når timen er booket i god tid', () => {
    const now = new Date(start.getTime() - 5 * 24 * HOUR);
    assert.deepEqual(reminderTime(start, now), new Date(start.getTime() - 24 * HOUR));
  });

  test('to timer før når timen er booket samme dag', () => {
    const now = new Date(start.getTime() - 8 * HOUR);
    assert.deepEqual(reminderTime(start, now), new Date(start.getTime() - 2 * HOUR));
  });

  test('ingen påminnelse rett etter at man har booket', () => {
    assert.equal(reminderTime(start, new Date(start.getTime() - 2 * HOUR)), null);
  });

  test('ikke et døgn før hvis det er rett etter bookingen', () => {
    const now = new Date(start.getTime() - 24.5 * HOUR);
    assert.deepEqual(reminderTime(start, now), new Date(start.getTime() - 2 * HOUR));
  });
});

describe('rensing av tekst', () => {
  test('fjerner linjeskift og kontrolltegn', () => {
    assert.equal(clean('Kari\r\nBcc: noen@example.com'), 'Kari Bcc: noen@example.com');
    assert.equal(clean('a\u0000b\u2028c'), 'a b c');
  });

  test('kutter lange tekster', () => {
    assert.equal(clean('x'.repeat(200), 80).length, 80);
  });

  test('godtar bare tekst', () => {
    assert.equal(clean(undefined), '');
    assert.equal(clean({ name: 'x' }), '');
  });

  test('beholder linjeskift i beskjeden', () => {
    assert.equal(cleanMultiline('Hei\r\n\r\n\r\n\r\nAllergi'), 'Hei\n\nAllergi');
  });

  test('escaper HTML', () => {
    assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });

  test('kort navn på låseskjermen', () => {
    assert.equal(shortName('Kari Nordmann'), 'Kari N.');
    assert.equal(shortName('Kari'), 'Kari');
    assert.equal(shortName('  '), 'En kunde');
  });
});
