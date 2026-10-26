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
    assert.match(messages.bookingReceipt(booking(), NOW, 'https://bookzy.no/booking/abc123').html, /href="https:\/\/bookzy\.no\/booking\/abc123"/);
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

describe('forespørsler', () => {
  test('salongen får beskjed om ny forespørsel', () => {
    const push = messages.newRequestPush(booking(), NOW);
    assert.equal(push.title, 'Ny forespørsel');
    assert.equal(push.body, 'Kari N. vil booke Herreklipp i morgen kl 10:00.');
    const email = messages.newRequestEmail(booking(), 'https://bookzy.no/business/booking/abc123');
    assert.equal(email.subject, 'Ny forespørsel: Kari Nordmann, lørdag 10. oktober kl 10:00');
    assert.match(email.text, /Telefon: 40000000/);
    assert.match(email.text, /Svar på forespørselen: https:\/\/bookzy\.no\/business\/booking\/abc123/);
  });

  test('flyttet forespørsel', () => {
    const push = messages.newRequestPush(booking(), NOW, booking({ date: '2026-10-08', time: '12:00' }));
    assert.match(push.body, /fra torsdag 8\. oktober kl 12:00 til i morgen kl 10:00 og venter på svar/);
    assert.match(messages.newRequestEmail(booking(), null, booking()).text, /Den gamle tiden er ledig igjen/);
  });

  test('kvitteringen til kunden er uten adresse', () => {
    const email = messages.requestReceipt(booking(), null);
    assert.equal(email.subject, 'Forespørsel sendt: Herreklipp lørdag 10. oktober kl 10:00');
    assert.doesNotMatch(email.text, /Thorvald Meyers/);
    assert.doesNotMatch(email.html, /Thorvald Meyers/);
  });

  test('godkjent time har adressen', () => {
    const push = messages.approvedPush(booking(), NOW);
    assert.equal(push.title, 'Timen er godkjent');
    assert.equal(push.body, 'Salong Nord har godkjent Herreklipp i morgen kl 10:00. Adresse: Thorvald Meyers gate 1, Oslo.');
    const email = messages.approvedReceipt(booking(), NOW, null);
    assert.equal(email.subject, 'Godkjent: Herreklipp lørdag 10. oktober kl 10:00');
    assert.match(email.text, /Sted: Thorvald Meyers gate 1, Oslo/);
  });

  test('avslag uten adresse og uten å be kunden ta kontakt', () => {
    const texts = [
      messages.declinedPush(booking(), NOW).body,
      messages.declinedEmail(booking(), null).text,
      messages.declinedSms(booking(), null),
    ];
    assert.equal(texts[0], 'Salong Nord kunne dessverre ikke ta imot bookingen din i morgen kl 10:00.');
    for (const text of texts) {
      assert.doesNotMatch(text, /Thorvald Meyers|22000000|ring|kontakt/);
    }
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
    const email = messages.bookingReceipt(booking(), NOW, 'https://bookzy.no/"><script>');
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

describe('SMS til kunder som booket med mobilnummer', () => {
  // Firestore-ID-er er 20 tegn
  const bookingLink = 'https://bookzy.no/booking/AbCdEfGhIjKlMnOpQrSt';
  const salonLink = 'https://bookzy.no/salon/AbCdEfGhIjKlMnOpQrSt';

  test('bekreftelse', () => {
    assert.equal(
      messages.bookingSms(booking(), bookingLink),
      `Bekreftet: Herreklipp hos Salong Nord lørdag 10. oktober kl 10:00. Se timen: ${bookingLink}`
    );
  });

  test('flyttet time', () => {
    assert.equal(
      messages.bookingSms(booking(), null, booking({ date: '2026-10-08', time: '12:00' })),
      'Flyttet: Herreklipp hos Salong Nord lørdag 10. oktober kl 10:00.'
    );
  });

  test('salongen avlyser', () => {
    assert.equal(
      messages.cancelledBySalonSms(booking(), null),
      'Salong Nord har avlyst Herreklipp lørdag 10. oktober kl 10:00. Lurer du på noe, ring 22000000.'
    );
    assert.doesNotMatch(messages.cancelledBySalonSms(booking({ salonPhone: '' }), null), /ring/);
  });

  test('påminnelse', () => {
    assert.equal(
      messages.reminderSms(booking(), NOW, null),
      'Påminnelse: Herreklipp hos Salong Nord i morgen kl 10:00. Kommer du ikke, ring 22000000.'
    );
  });

  test('godkjent og avslått forespørsel', () => {
    assert.equal(
      messages.approvedSms(booking(), null),
      'Godkjent: Herreklipp hos Salong Nord lørdag 10. oktober kl 10:00, Thorvald Meyers gate 1, Oslo.'
    );
    assert.equal(
      messages.declinedSms(booking(), null),
      'Salong Nord kunne dessverre ikke ta imot bookingen din lørdag 10. oktober kl 10:00.'
    );
  });

  test('får plass i én SMS', () => {
    const texts = [
      messages.bookingSms(booking(), bookingLink),
      messages.bookingSms(booking(), bookingLink, booking()),
      messages.cancelledBySalonSms(booking(), salonLink),
      messages.reminderSms(booking(), NOW, bookingLink),
      messages.approvedSms(booking(), bookingLink),
      messages.declinedSms(booking(), salonLink),
    ];
    for (const text of texts) {
      assert.ok(text.length <= 160, `${text.length} tegn: ${text}`);
      // Ett tegn utenfor SMS-alfabetet (f.eks. – eller «») gjør plassen i hver SMS mer enn halvert
      assert.match(text, /^[\x20-\x7EæøåÆØÅ]*$/);
    }
  });
});
