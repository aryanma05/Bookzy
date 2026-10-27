// Kjør med: npm run test:app
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dayOverview, getAvailableTimes, openStatus, type OpeningHours } from './schedule.ts';

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

test('fristen gjelder også neste dag', () => {
  const available = (now: Date, leadMin: number) =>
    getAvailableTimes({ openingHours: HOURS, date: MONDAY, durationMin: 30, staffIds: ['lina'], taken: new Map(), now, leadMin }).map(
      (item) => item.time
    );
  // Søndag 22:00 + 12 timer = mandag 10:00, så tidene før er borte
  assert.deepEqual(available(new Date(2026, 9, 25, 22, 0), 12 * 60), ['10:30', '11:00', '11:30']);
  // 07:00:30 + 3 timer er litt etter 10:00, så 10:00 er for nær
  assert.deepEqual(available(new Date(2026, 9, 26, 7, 0, 30), 3 * 60), ['10:30', '11:00', '11:30']);
  // Dager som har vært, har ingen ledige tider
  assert.deepEqual(available(new Date(2026, 9, 27, 8, 0), 15), []);
});

test('i pausen står det når salongen åpner igjen', () => {
  assert.deepEqual(openStatus(HOURS, new Date(2026, 9, 26, 10, 15)), { isOpen: false, text: 'Pause · åpner igjen 10:30' });
  assert.equal(openStatus(HOURS, new Date(2026, 9, 26, 10, 45)).isOpen, true);
});

test('oversikten viser ledige tider etter hverandre og bookede timer', () => {
  const overview = (bookings: { time: string; durationMin: number; staffId: string }[], now = SUNDAY) =>
    dayOverview({
      openingHours: { mon: { open: '13:00', close: '19:00' } },
      closedDates: [],
      date: MONDAY,
      durationMin: 180,
      staffIds: ['lina'],
      bookings,
      now,
    });

  assert.deepEqual(overview([]), [
    { time: '13:00', booked: false },
    { time: '16:00', booked: false },
  ]);
  assert.deepEqual(overview([{ time: '16:00', durationMin: 180, staffId: 'lina' }]), [
    { time: '13:00', booked: false },
    { time: '16:00', booked: true },
  ]);
  // Dager som har vært, viser bare det som ble booket
  assert.deepEqual(overview([{ time: '16:00', durationMin: 180, staffId: 'lina' }], new Date(2026, 9, 27)), [
    { time: '16:00', booked: true },
  ]);
});
