// Fyller Firestore med testsalonger og eksempelanmeldelser.
//   npm run seed:emulator  → lokal emulator (npm run emulators må kjøre), inkludert en testkonto med timer
//   npm run seed:remove    → fjerner eksempelsalongene, -anmeldelsene og timene hos dem fra den ekte databasen
//                            (krever serviceAccountKey.json i prosjektroten, hentes fra Firebase Console →
//                            Prosjektinnstillinger → Tjenestekontoer). Salonger med eier røres aldri.
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, Timestamp, FieldValue } = require('firebase-admin/firestore');

const useEmulator = process.argv.includes('--emulator');
const removeDemo = process.argv.includes('--remove');

// Ekte kunder skal aldri se salonger med oppdiktede nummer og anmeldelser
if (!useEmulator && !removeDemo) {
  console.error('Eksempelsalonger legges bare i emulatoren: npm run seed:emulator. Fjern dem fra den ekte databasen med npm run seed:remove.');
  process.exit(1);
}

// Testkontoer som bare finnes i den lokale Auth-emulatoren
const DEMO_USER = { email: 'kunde@bookzy.test', password: 'bookzy-test', displayName: 'Test Kunde' };
// Eier av Salong Nord, for å teste bedriftsmodusen
const DEMO_OWNER = { email: 'salong@bookzy.test', password: 'bookzy-test', displayName: 'Lea Andersen' };
const DEMO_SALON_ID = 'salong-nord';

if (useEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
  initializeApp({ projectId: 'timeflyt' });
} else {
  initializeApp({ credential: cert(require('../serviceAccountKey.json')) });
}

const db = getFirestore();

const photo = (id) => `https://images.unsplash.com/photo-${id}?w=1000&q=75&auto=format&fit=crop`;

const PHOTOS = {
  Frisør: [
    '1633681926022-84c23e8cb2d6', '1580618672591-eb180b1a973f', '1600948836101-f9ffda59d250',
    '1634449571010-02389ed0f9b0', '1521590832167-7bcbfaa6381f', '1781450090585-1a511b7066d9',
    '1629397685944-7073f5589754', '1695527081782-33e110235ade', '1562322140-8baeececf3df',
  ],
  Barber: [
    '1585747860715-2ba37e788b70', '1599351431202-1e0f0137899a', '1759134248487-e8baaf31e33e',
    '1503951914875-452162b0f3f1', '1621605815971-fbc98d665033', '1657105052497-f996284ffff8',
  ],
  Negler: [
    '1632345031435-8727f6897d53', '1619607146034-5a05296c8f9a', '1746607242420-12fc2604775d',
    '1758225490983-0fae7961e425', '1696342003838-4a8f9f36588c', '1779636198585-658170ee0283',
  ],
  Massasje: [
    '1600334089648-b0d9d3028eb2', '1544161515-4ab6ce6db874', '1639162906614-0603b0ae95fd',
    '1600334129128-685c5582fd35', '1787651343620-8d5303006ecb', '1519823551278-64ac92734fb1',
  ],
  Hudpleie: [
    '1570172619644-dfd03ed5d881', '1552693673-1bf958298935', '1760862652442-e8ff7ebdd2f8',
    '1616394584738-fc6e612e71b9', '1779117691346-5de09d89a73f', '1761718210089-ba3bb5ccb54f',
  ],
  Voksing: [
    '1787651343599-92563927b750', '1757689373248-a6cd07328ba5', '1767288533191-cc2c72bad9c9',
    '1531299244174-d247dd4e5a66', '1695527081827-fdbc4e77be9b', '1787496994323-59ac5cff09f9',
  ],
};

const STAFF = {
  Frisør: [
    ['Maria Hansen', 'Senior frisør'], ['Jonas Berg', 'Frisør'], ['Lea Andersen', 'Fargespesialist'],
    ['Thea Nilsen', 'Frisør'], ['Sebastian Holm', 'Frisør'], ['Julie Bakke', 'Senior frisør'],
  ],
  Barber: [['Ali Rahimi', 'Barber'], ['Marcus Olsen', 'Master barber'], ['Daniel Kristiansen', 'Barber']],
  Negler: [['Linh Nguyen', 'Negledesigner'], ['Ida Moe', 'Negletekniker'], ['Vanessa Lopez', 'Negledesigner']],
  Massasje: [['Erik Lund', 'Massør'], ['Hanna Vik', 'Idrettsmassør'], ['Kasper Dahl', 'Massør']],
  Hudpleie: [['Camilla Strand', 'Hudterapeut'], ['Amira Haddad', 'Hudterapeut'], ['Silje Eide', 'Kosmetolog']],
  Voksing: [['Sandra Lie', 'Voksspesialist'], ['Mina Johansen', 'Hudterapeut']],
};

const SERVICES = {
  Frisør: [
    ['Klipp', 'Dameklipp', 60, 650, 'Vask, klipp og føn.'],
    ['Klipp', 'Herreklipp', 45, 450, 'Klipp med saks og maskin, inkludert vask.'],
    ['Klipp', 'Barneklipp', 30, 300, 'For barn under 12 år.'],
    ['Farge', 'Farging', 90, 1200, 'Hel farge med vask og føn.'],
    ['Farge', 'Striper og balayage', 120, 1600, 'Prisen kan variere etter hårlengde.'],
    ['Styling', 'Føn og styling', 30, 400],
  ],
  Barber: [
    ['Klipp', 'Herreklipp', 30, 400],
    ['Klipp', 'Skin fade', 45, 500, 'Fade helt ned mot huden, finish med saks.'],
    ['Klipp', 'Klipp og skjegg', 60, 650],
    ['Skjegg', 'Skjeggtrim', 20, 250],
    ['Skjegg', 'Barbering med varmt håndkle', 30, 350, 'Klassisk barbering med kniv og varmt håndkle.'],
  ],
  Negler: [
    ['Manikyr', 'Manikyr', 45, 400],
    ['Manikyr', 'Gelénegler', 60, 550, 'Holder i 2–3 uker.'],
    ['Manikyr', 'Neglforlengelse', 90, 750],
    ['Pedikyr', 'Pedikyr', 60, 550],
  ],
  Massasje: [
    ['Massasje', 'Klassisk massasje 30 min', 30, 500],
    ['Massasje', 'Klassisk massasje 60 min', 60, 800],
    ['Massasje', 'Dyp vevsmassasje', 60, 900, 'Fast trykk for stive muskler og knuter.'],
    ['Massasje', 'Hot stone-massasje', 75, 1000],
  ],
  Hudpleie: [
    ['Ansikt', 'Ansiktsbehandling', 60, 900, 'Rens, peeling, maske og massasje.'],
    ['Ansikt', 'Dybderens', 75, 1100],
    ['Ansikt', 'Anti-age-behandling', 90, 1400],
    ['Øyne og bryn', 'Vippe- og brynsfarge', 30, 350],
  ],
  Voksing: [
    ['Kropp', 'Voksing av legger', 30, 350],
    ['Kropp', 'Voksing av hele ben', 45, 500],
    ['Kropp', 'Helkroppsvoksing', 90, 1200],
    ['Ansikt', 'Forming av bryn', 15, 200],
  ],
};

const weekdays = (open, close) => ({
  mon: { open, close },
  tue: { open, close },
  wed: { open, close },
  thu: { open, close },
  fri: { open, close },
});

const OPENING_HOURS = [
  { ...weekdays('09:00', '18:00'), sat: { open: '10:00', close: '16:00' }, sun: null },
  { ...weekdays('10:00', '20:00'), sat: { open: '10:00', close: '17:00' }, sun: null },
  { ...weekdays('09:00', '17:00'), mon: null, sat: { open: '09:00', close: '17:00' }, sun: { open: '12:00', close: '16:00' } },
];

// [navn, kategori, adresse, område, lat, lng, snitt, antall anmeldelser, avbestillingsfrist (t), tjenester, beskrivelse, sted]
const SALONS = [
  ['Oslo Frisør & Styling', 'Frisør', 'Karl Johans gate 12, Oslo', 'Sentrum', 59.9127, 10.7440, 4.9, 128, 24, [0, 1, 3, 5],
    'Midt på Karl Johan siden 2009. Vi er kjent for presise klipp og naturlige fargeresultater.'],
  ['Grünerløkka Hårstudio', 'Frisør', 'Grünerløkka Torg 4, Oslo', 'Grünerløkka', 59.9230, 10.7580, 4.7, 70, 12, [0, 1, 4],
    'Lite og personlig studio med fokus på balayage og levende farger.'],
  ['Oslo Massasje & Velvære', 'Massasje', 'Bogstadveien 45, Oslo', 'Majorstuen', 59.9275, 10.7175, 4.4, 55, 24, [0, 1, 2, 3],
    'Behandlingsrom i rolige omgivelser, et steinkast fra Bogstadveien.'],
  ['Negleriet Oslo', 'Negler', 'Thorvald Meyers gate 22, Oslo', 'Grünerløkka', 59.9205, 10.7590, 4.6, 92, 12, [0, 1, 2, 3],
    'Negledesign, gelé og forlengelse. Vi bruker bare vegane produkter.'],
  ['Hudpleieklinikken Oslo', 'Hudpleie', 'Grensen 9, Oslo', 'Sentrum', 59.9135, 10.7445, 4.8, 61, 24, [0, 1, 3],
    'Hudterapeuter med lang erfaring. Alle behandlinger starter med en kort hudanalyse.'],
  ['Voksestudio Oslo', 'Voksing', 'Kirkeveien 78, Oslo', 'Majorstuen', 59.9320, 10.7130, 4.1, 33, 2, [0, 1, 2, 3],
    'Rask og skånsom voksing med lavtemperatur-voks.'],
  ['Salong Nord', 'Frisør', 'Markveien 18, Oslo', 'Grünerløkka', 59.9210, 10.7550, 4.3, 47, 12, [1, 2, 4],
    'Avslappet nabolagssalong på Løkka med kaffe på huset.'],
  ['Zen Massasje Studio', 'Massasje', 'Frognerveien 33, Oslo', 'Frogner', 59.9205, 10.7110, 4.9, 140, 24, [1, 2],
    'Japansk-inspirert studio med fokus på dyp avslapning og restitusjon.'],
  ['Nail Bar Grünerløkka', 'Negler', 'Torggata 7, Oslo', 'Sentrum', 59.9150, 10.7500, 3.9, 18, 2, [0, 2],
    'Drop-in-vennlig neglebar med kveldsåpent hele uken.'],
  ['Glow Skincare Studio', 'Hudpleie', 'Aker Brygge 5, Oslo', 'Aker Brygge', 59.9100, 10.7280, 5.0, 102, 24, [0, 1, 2, 3],
    'Skreddersydde ansiktsbehandlinger med utsikt over fjorden.'],
  ['Smooth Skin Voksing', 'Voksing', 'Majorstuen Torg 2, Oslo', 'Majorstuen', 59.9295, 10.7150, 4.2, 27, 12, [0, 1, 3],
    'Profesjonell voksing for både kvinner og menn.'],
  ['Frisørkollektivet', 'Frisør', 'Sagene Ring 14, Oslo', 'Sagene', 59.9375, 10.7570, 4.5, 83, 12, [0, 2, 3, 5],
    'Fem frisører under samme tak. Barnevennlig og alltid god stemning.'],
  ['Massasjehuset Frogner', 'Massasje', 'Vibes gate 8, Oslo', 'Frogner', 59.9235, 10.7230, 4.6, 65, 24, [0, 3],
    'Klassisk massasje og hot stone i et lyst og rolig lokale.'],
  ['Salong Glow Negler', 'Negler', 'Sørkedalsveien 60, Oslo', 'Vinderen', 59.9350, 10.6950, 4.0, 22, 2, [1, 2, 3],
    'Hyggelig neglesalong med gratis parkering rett utenfor.'],
  ['Ren Hud Klinikk', 'Hudpleie', 'Skovveien 11, Oslo', 'Frogner', 59.9165, 10.7170, 4.7, 44, 24, [0, 1],
    'Klinikk for hudpleie med fokus på akne og sensitiv hud.'],
  ['Tøyen Barbershop', 'Barber', 'Hagegata 30, Oslo', 'Tøyen', 59.9140, 10.7720, 4.8, 156, 2, [0, 1, 2, 3],
    'Fades, skjeggtrim og varmt håndkle. Musikken står alltid på.'],
  ['Gamle Oslo Barber', 'Barber', 'Schweigaards gate 15, Oslo', 'Gamle Oslo', 59.9090, 10.7600, 4.5, 64, 12, [0, 2, 3, 4],
    'Tradisjonelt barberhåndverk i moderne lokaler ved Oslo S.'],
  ['Negler hos Linh', 'Negler', '', 'Furuset', 59.9395, 10.8960, 4.9, 23, 24, [0, 1, 3],
    'Hjemmesalong på Furuset. Rolig og personlig, med parkering rett utenfor.', 'home'],
];

const REVIEW_TEXTS = {
  Frisør: [
    [5, 'Veldig fornøyd med klippen! Hun tok seg god tid og lyttet til hva jeg ville ha.'],
    [5, 'Endelig en frisør som får fargen akkurat sånn jeg ønsker. Kommer garantert tilbake.'],
    [4, 'Fikk akkurat det jeg ba om. Måtte vente ti minutter, men det var verdt det.'],
    [5, 'Hyggelig stemning og presis oppstart. Booket ny time rett etterpå.'],
    [3, 'Fint resultat, men litt dyrt for det man får.'],
  ],
  Barber: [
    [5, 'Beste fade jeg har hatt på lenge. Detaljert og nøye arbeid.'],
    [5, 'Varmt håndkle og barbering med kniv – anbefales på det sterkeste.'],
    [4, 'Rask og effektiv, og god stemning i lokalet.'],
    [5, 'Har gått her i to år nå. Alltid like fornøyd.'],
  ],
  Negler: [
    [5, 'Geléneglene holdt i over tre uker. Veldig nøyaktig arbeid.'],
    [5, 'Koselig sted og flinke ansatte. Fikk mange komplimenter på neglene!'],
    [3, 'Ble litt forsinket oppstart, men resultatet var fint.'],
    [4, 'Fine farger å velge mellom og rolig atmosfære.'],
  ],
  Massasje: [
    [5, 'Utrolig avslappende. Massøren fant alle knutene i nakken.'],
    [5, 'Rolig og rent lokale. Perfekt etter en lang arbeidsuke.'],
    [4, 'God massasje, men rommet var litt kaldt.'],
    [5, 'Hot stone-massasjen var helt fantastisk.'],
  ],
  Hudpleie: [
    [5, 'Huden kjentes helt ny ut etterpå. Fikk gode råd om hjemmepleie også.'],
    [5, 'Grundig og behagelig behandling. Booker igjen neste måned.'],
    [4, 'Profesjonelt og hyggelig, litt kort tid til selve massasjen.'],
  ],
  Voksing: [
    [5, 'Raskt og nesten smertefritt. Veldig hyggelig behandler.'],
    [4, 'Rent og ryddig, og godt resultat.'],
    [3, 'Greit nok, men litt stressende stemning da det var travelt.'],
  ],
};

const AUTHORS = [
  'Kari N.', 'Ola H.', 'Ingrid S.', 'Mohammed A.', 'Sofie L.', 'Jonas B.', 'Emma K.',
  'Ahmed R.', 'Nora T.', 'Henrik D.', 'Maja P.', 'Elias F.', 'Sara M.', 'Lukas J.',
];

// Faste, lesbare ID-er gjør at scriptet kan kjøres flere ganger uten å lage duplikater.
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/ø/g, 'oe')
    .replace(/å/g, 'aa')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function rotate(list, offset, count) {
  return Array.from({ length: count }, (_, index) => list[(offset + index) % list.length]);
}

function buildSalons() {
  const counters = {};
  return SALONS.map(([name, category, address, area, lat, lng, rating, reviewCount, cancellationHours, serviceIdx, description, locationType = 'salon'], index) => {
    const offset = counters[category] ?? 0;
    counters[category] = offset + 1;
    const staffCount = locationType === 'home' ? 1 : category === 'Voksing' ? 2 : 2 + (index % 2);

    return {
      id: slugify(name),
      data: {
        name,
        category,
        address,
        area,
        description,
        phone: `+47 000 00 ${String(100 + index).slice(-3)}`,
        imageUrl: photo(PHOTOS[category][(offset * 3) % PHOTOS[category].length]),
        photos: rotate(PHOTOS[category], offset * 3, 3).map(photo),
        location: { lat, lng },
        ratingSum: Math.round(rating * reviewCount),
        reviewCount,
        cancellationHours,
        services: serviceIdx.map((serviceIndex) => {
          const [group, serviceName, durationMin, basePrice, serviceDescription] = SERVICES[category][serviceIndex];
          // Litt prisvariasjon mellom salongene
          const priceNok = Math.round((basePrice * (0.9 + (index % 4) * 0.07)) / 10) * 10;
          return {
            id: slugify(serviceName),
            category: group,
            name: serviceName,
            durationMin,
            priceNok,
            ...(serviceDescription ? { description: serviceDescription } : {}),
          };
        }),
        staff: rotate(STAFF[category], offset, staffCount).map(([staffName, title]) => ({
          id: slugify(staffName.split(' ')[0]),
          name: staffName,
          title,
        })),
        openingHours: OPENING_HOURS[index % OPENING_HOURS.length],
        locationType,
        closedDates: [],
        published: true,
      },
    };
  });
}

function buildReviews(salons) {
  const reviews = [];
  salons.forEach(({ id, data }, salonIndex) => {
    const texts = REVIEW_TEXTS[data.category];
    texts.forEach(([rating, comment], reviewIndex) => {
      const daysAgo = 3 + reviewIndex * 11 + (salonIndex % 7);
      const service = data.services[(reviewIndex + salonIndex) % data.services.length];
      reviews.push({
        id: `seed_${id}_${reviewIndex + 1}`,
        data: {
          salonId: id,
          rating,
          comment,
          authorName: AUTHORS[(salonIndex * 3 + reviewIndex) % AUTHORS.length],
          serviceName: service.name,
          createdAt: Timestamp.fromDate(new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)),
        },
      });
    });
  });
  return reviews;
}

async function seedSalons() {
  const salons = removeDemo ? [] : buildSalons();
  const reviews = buildReviews(salons);
  const batch = db.batch();

  salons.forEach(({ id, data }) => batch.set(db.collection('salons').doc(id), data));
  reviews.forEach(({ id, data }) => batch.set(db.collection('reviews').doc(id), data));

  // Fjern eksempelsalonger og -anmeldelser fra tidligere kjøringer som ikke lenger finnes.
  // Salonger med eier er registrert av en bedrift i appen og skal aldri røres.
  const salonIds = new Set(salons.map((salon) => salon.id));
  const reviewIds = new Set(reviews.map((review) => review.id));
  const staleSalons = (await db.collection('salons').get()).docs
    .filter((salon) => !salonIds.has(salon.id) && !salon.get('ownerId'))
    .map((salon) => salon.ref);
  const staleReviews = (await db.collection('reviews').listDocuments()).filter(
    (ref) => ref.id.startsWith('seed_') && !reviewIds.has(ref.id)
  );
  await batch.commit();

  // bulkWriter, siden det kan bli flere enn 500 dokumenter (grensen for en batch)
  const writer = db.bulkWriter();
  [...staleSalons, ...staleReviews].forEach((ref) => writer.delete(ref));
  // Timene hos salonger som fjernes, så ingen ser en time hos en salong som ikke finnes
  for (const salon of staleSalons) {
    for (const name of ['bookings', 'slots']) {
      (await db.collection(name).where('salonId', '==', salon.id).get()).forEach((item) => writer.delete(item.ref));
    }
  }
  await writer.close();
  console.log(`Lagret ${salons.length} salonger og ${reviews.length} anmeldelser, fjernet ${staleSalons.length} gamle salonger.`);
  return salons;
}

async function ensureUser({ email, password, displayName }) {
  try {
    // Bekreftet, så varslene på e-post kan testes (de vises i loggen til Functions-emulatoren)
    const { uid } = await getAuth().createUser({ email, password, displayName, emailVerified: true });
    console.log(`Opprettet testkonto ${email} i emulatoren.`);
    return uid;
  } catch (error) {
    if (error.code !== 'auth/email-already-exists') throw error;
    return (await getAuth().getUserByEmail(email)).uid;
  }
}

const pad = (value) => String(value).padStart(2, '0');
const toKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const toTime = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
const toMinutes = (time) => time.split(':').map(Number).reduce((hours, minutes) => hours * 60 + minutes);
const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function day(offset) {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}

/** Legger en booking (og lukene, hvis den fortsatt opptar tid) i batchen. */
function addBooking(batch, salon, { id, userId, customerName, customerPhone, date, time, service, staff, status = 'confirmed', note = '', createdAt }) {
  const key = toKey(date);
  const startAt = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  startAt.setMinutes(toMinutes(time));
  const endAt = new Date(startAt.getTime() + service.durationMin * 60000);
  const slotTimes = Array.from({ length: Math.ceil(service.durationMin / 30) }, (_, index) => toTime(toMinutes(time) + index * 30));
  const slotIds = slotTimes.map((slotTime) => `${salon.id}_${staff.id}_${key}_${slotTime}`);
  const holdsSlots = status === 'confirmed' && endAt > new Date();

  batch.set(db.collection('bookings').doc(id), {
    userId,
    customerName,
    customerPhone,
    note,
    salonId: salon.id,
    salonName: salon.data.name,
    serviceId: service.id,
    serviceName: service.name,
    staffId: staff.id,
    staffName: staff.name,
    durationMin: service.durationMin,
    priceNok: service.priceNok,
    date: key,
    time,
    startAt: Timestamp.fromDate(startAt),
    endAt: Timestamp.fromDate(endAt),
    cancellableUntil: Timestamp.fromDate(new Date(startAt.getTime() - salon.data.cancellationHours * 3600000)),
    slotIds: holdsSlots ? slotIds : [],
    status,
    ...(status === 'cancelled' ? { cancelledAt: Timestamp.now() } : {}),
    createdAt: Timestamp.fromDate(createdAt ?? new Date(startAt.getTime() - 6 * 24 * 3600000)),
  });
  if (holdsSlots) {
    slotTimes.forEach((slotTime, index) => {
      batch.set(db.collection('slots').doc(slotIds[index]), { salonId: salon.id, staffId: staff.id, date: key, time: slotTime, bookingId: id });
    });
  }
}

const DEMO_CUSTOMERS = [
  ['Kari Nordmann', '+47 000 11 101'],
  ['Ahmed Khan', '+47 000 11 102'],
  ['Sofie Lie', '+47 000 11 103'],
  ['Henrik Dahl', '+47 000 11 104'],
  ['Nora Bakken', '+47 000 11 105'],
  ['Emil Strand', '+47 000 11 106'],
  ['Ingrid Moe', '+47 000 11 107'],
  ['Yasmin Ali', '+47 000 11 108'],
];

// Fast mønster per dag: [ansatt, tid, tjeneste]. Noen hoppes over for at dagene skal se ulike ut.
const DEMO_PATTERN = [
  [0, '09:30', 0],
  [0, '11:00', 2],
  [1, '10:00', 1],
  [1, '12:00', 0],
  [1, '15:30', 2],
];

const DEMO_NOTES = ['', 'Vil gjerne ha litt kortere enn sist.', '', 'Allergisk mot ammoniakk.', ''];

async function seedDemoAccounts(salons) {
  const customerUid = await ensureUser(DEMO_USER);
  const ownerUid = await ensureUser(DEMO_OWNER);

  await db.collection('users').doc(customerUid).set({ name: DEMO_USER.displayName, phone: '+47 000 00 000', updatedAt: FieldValue.serverTimestamp() });
  await db.collection('users').doc(ownerUid).set({ name: DEMO_OWNER.displayName, phone: '+47 000 00 106', updatedAt: FieldValue.serverTimestamp() });

  const salon = salons.find((item) => item.id === DEMO_SALON_ID);
  await db.collection('salons').doc(salon.id).update({ ownerId: ownerUid });

  const { services, staff, openingHours } = salon.data;
  const batch = db.batch();

  // Testkundens egne timer: en fullført (kan anmeldes) og en kommende (kan flyttes og avbestilles)
  const own = { userId: customerUid, customerName: DEMO_USER.displayName, customerPhone: '+47 000 00 000', service: services[0], staff: staff[0] };
  addBooking(batch, salon, { ...own, id: 'demo-past', date: day(-5), time: '11:00' });
  addBooking(batch, salon, { ...own, id: 'demo-upcoming', date: day(3), time: '14:00' });

  // En uke med timer i kalenderen til salongen
  const planned = [];
  for (let offset = -3; offset <= 7; offset++) {
    const date = day(offset);
    const hours = openingHours[WEEKDAY_KEYS[date.getDay()]];
    if (!hours) continue;
    DEMO_PATTERN.forEach(([staffIndex, time, serviceIndex], index) => {
      const service = services[serviceIndex];
      if ((offset + index + 9) % 4 === 0) return;
      if (toMinutes(time) < toMinutes(hours.open) || toMinutes(time) + service.durationMin > toMinutes(hours.close)) return;
      planned.push({ offset, index, date, time, service, staff: staff[staffIndex] });
    });
  }
  // Én kunde som ikke møtte i går eller før, én som har avbestilt, og to timer som nettopp ble booket
  const noShow = planned.filter((item) => item.offset < 0).pop();
  const cancelled = planned.find((item) => item.offset >= 2);
  const recent = planned.filter((item) => item.offset >= 1 && item !== cancelled).slice(0, 2);

  planned.forEach((item) => {
    const [customerName, customerPhone] = DEMO_CUSTOMERS[(item.offset + 3 + item.index * 3) % DEMO_CUSTOMERS.length];
    addBooking(batch, salon, {
      id: `demo-${toKey(item.date)}-${item.index}`,
      userId: `demo-kunde-${slugify(customerName)}`,
      customerName,
      customerPhone,
      date: item.date,
      time: item.time,
      service: item.service,
      staff: item.staff,
      status: item === noShow ? 'noShow' : item === cancelled ? 'cancelled' : 'confirmed',
      note: DEMO_NOTES[(item.offset + item.index + 5) % DEMO_NOTES.length],
      createdAt: recent.includes(item) ? new Date(Date.now() - (recent.indexOf(item) + 1) * 3600000) : undefined,
    });
  });
  const count = planned.length;

  await batch.commit();
  console.log(`La inn timer for testkunden og ${count} timer i kalenderen til ${salon.data.name} (eier: ${DEMO_OWNER.email}).`);
}

seedSalons()
  .then((salons) => (useEmulator && !removeDemo ? seedDemoAccounts(salons) : undefined))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
