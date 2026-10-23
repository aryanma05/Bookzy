// Kjør med: npm run test:app
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getAvailableTimes, openStatus, type OpeningHours } from './schedule.ts';

// Mandag 26. oktober 2026, og «nå» er dagen før
const MONDAY = new Date(2026, 9, 26);
const SUNDAY = new Date(2026, 9, 25, 12, 0);
const HOURS: OpeningHours = { mon: { open: '09:00', close: '12:00', breaks: [{ start: '10:00', end: '10:30' }] } };

const times = (durationMin: number) =>
  getAvailableTimes({ openingHours: HOURS, date: MONDAY, durationMin, staffIds: ['lina'], taken: new Map(), now: SUNDAY }).map(
    (item) => item.time
  );

test('ingen timer i pausen', () => {
  assert.deepEqual(times(30), ['09:00', '09:30', '10:30', '11:00', '11:30']);
});

test('en behandling kan slutte når pausen starter, men ikke gå inn i den', () => {
  assert.deepEqual(times(60), ['09:00', '10:30', '11:00']);
});

test('i pausen står det når salongen åpner igjen', () => {
  assert.deepEqual(openStatus(HOURS, new Date(2026, 9, 26, 10, 15)), { isOpen: false, text: 'Pause · åpner igjen 10:30' });
  assert.equal(openStatus(HOURS, new Date(2026, 9, 26, 10, 45)).isOpen, true);
});
