import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import * as messages from './messages';
import type { BookingInfo } from './messages';

const NOW = new Date('2026-10-09T08:00:00Z');

function booking(overrides: Partial<BookingInfo> = {}): BookingInfo {
  return {
    id: 'abc123',
    customerName: 'Kari Nordmann',
    customerPhone: '40000000',
    note: '',
    salonName: 'Salong Nord',
    salonPhone: '22000000',
    salonPlace: 'Thorvald Meyers gate 1, Oslo',
    serviceName: 'Herreklipp',
    staffName: 'Maria',
    priceNok: 450,
    durationMin: 45,
    date: '2026-10-10',
    time: '10:00',
    cancellableUntil: new Date('2026-10-09T08:00:00Z'),
    ...overrides,
  };
}

describe('kvittering til kunden', () => {
  test('har tid, behandling og pris', () => {
    const email = messages.bookingReceipt(booking({ cancellableUntil: new Date('2026-10-09T10:00:00Z') }), NOW, null);
    assert.equal(email.subject, 'Bekreftet: Herreklipp lørdag 10. oktober kl 10:00');
    assert.match(email.text, /lørdag 10\. oktober kl 10:00–10:45/);
    assert.match(email.text, /450 kr, betales i salongen/);
    assert.match(email.text, /frem til fredag 9\. oktober kl 12:00/);
  });

  test('sier fra når fristen allerede er ute', () => {
    const email = messages.bookingReceipt(booking({ cancellableUntil: new Date('2026-10-09T07:00:00Z') }), NOW, null);
    assert.match(email.text, /Fristen for å flytte eller avbestille i appen har gått ut/);
  });

  test('flyttet time', () => {
    const email = messages.bookingReceipt(booking(), NOW, null, booking({ date: '2026-10-08', time: '12:00' }));
    assert.equal(email.subject, 'Timen er flyttet til lørdag 10. oktober kl 10:00');
    assert.match(email.text, /flyttet fra torsdag 8\. oktober kl 12:00/);
  });

  test('lenke bare når den er satt', () => {
    assert.doesNotMatch(messages.bookingReceipt(booking(), NOW, null).html, /<a /);
    assert.match(messages.bookingReceipt(booking(), NOW, 'https://timeflyt.no/booking/abc123').html, /href="https:\/\/timeflyt\.no\/booking\/abc123"/);
  });
});

describe('varsler til salongen', () => {
  test('push viser bare fornavn og forbokstav', () => {
    const push = messages.newBookingPush(booking(), NOW);
    assert.equal(push.title, 'Ny booking');
    assert.equal(push.body, 'Kari N. har booket Herreklipp i morgen kl 10:00.');
    assert.doesNotMatch(push.body, /40000000/);
  });

  test('e-posten har telefon og beskjed', () => {
    const email = messages.newBookingEmail(booking({ note: 'Allergisk mot\nparfyme' }), null);
    assert.match(email.text, /Telefon: 40000000/);
    assert.match(email.html, /Allergisk mot<br>parfyme/);
  });

  test('flyttet time', () => {
    const push = messages.newBookingPush(booking(), NOW, booking({ date: '2026-10-08', time: '12:00' }));
    assert.equal(push.title, 'Time flyttet');
    assert.match(push.body, /fra torsdag 8\. oktober kl 12:00 til i morgen kl 10:00/);
  });

  test('avbestilling', () => {
    const push = messages.cancelledByCustomerPush(booking(), NOW);
    assert.equal(push.body, 'Kari N. har avbestilt Herreklipp i morgen kl 10:00. Tiden er ledig igjen.');
  });
});

describe('sikkerhet', () => {
  test('HTML fra kunden escapes i e-posten', () => {
    const email = messages.newBookingEmail(
      booking({ customerName: '<img src=x onerror=alert(1)>', note: '<a href="https://phish.example">Logg inn</a>' }),
      null
    );
    assert.doesNotMatch(email.html, /<img/);
    assert.doesNotMatch(email.html, /<a href="https:\/\/phish/);
    assert.match(email.html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  });

  test('lenker escapes også', () => {
    const email = messages.bookingReceipt(booking(), NOW, 'https://timeflyt.no/"><script>');
    assert.doesNotMatch(email.html, /"><script>/);
  });
});

describe('til kunden', () => {
  test('påminnelse', () => {
    assert.equal(messages.reminderPush(booking(), NOW).body, 'Herreklipp hos Salong Nord i morgen kl 10:00.');
    assert.equal(messages.reminderEmail(booking(), NOW, null).subject, 'Påminnelse: Herreklipp i morgen kl 10:00');
  });

  test('salongen avlyser', () => {
    assert.equal(messages.cancelledBySalonPush(booking(), NOW).body, 'Salong Nord har avlyst Herreklipp i morgen kl 10:00.');
    assert.match(messages.cancelledBySalonEmail(booking(), null).text, /ringe salongen på 22000000/);
  });

  test('uten telefonnummer til salongen', () => {
    assert.doesNotMatch(messages.cancelledBySalonEmail(booking({ salonPhone: '' }), null).text, /ringe/);
  });
});
