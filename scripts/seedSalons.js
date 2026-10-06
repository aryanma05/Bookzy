// Fyller Firestore med testsalonger.
//   npm run seed           → den ekte databasen (krever serviceAccountKey.json i prosjektroten,
//                            hentes fra Firebase Console → Prosjektinnstillinger → Tjenestekontoer)
//   npm run seed:emulator  → lokal emulator (npm run emulators må kjøre), inkludert testkontoen under
const { initializeApp } = require('firebase-admin/app');
const { cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

const useEmulator = process.argv.includes('--emulator');

// Testkonto som bare finnes i den lokale Auth-emulatoren
const DEMO_USER = { email: 'kunde@timeflyt.test', password: 'timeflyt-test', displayName: 'Test Kunde' };

if (useEmulator) {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
  initializeApp({ projectId: 'timeflyt' });
} else {
  initializeApp({ credential: cert(require('../serviceAccountKey.json')) });
}

const db = getFirestore();

const weekdays = (open, close) => ({
  mon: { open, close },
  tue: { open, close },
  wed: { open, close },
  thu: { open, close },
  fri: { open, close },
});

// Åpningstider per ukedag (null = stengt). Ledige tider regnes ut fra disse i appen.
const OPENING_HOURS = [
  { ...weekdays('09:00', '18:00'), sat: { open: '10:00', close: '16:00' }, sun: null },
  { ...weekdays('10:00', '20:00'), sat: { open: '10:00', close: '17:00' }, sun: null },
  { ...weekdays('09:00', '17:00'), mon: null, sat: { open: '09:00', close: '17:00' }, sun: { open: '12:00', close: '16:00' } },
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

const salons = [
  {
    "name": "Oslo Frisør & Styling",
    "category": "Frisør",
    "address": "Karl Johans gate 12, Oslo",
    "rating": 4.9,
    "reviewCount": 128,
    "services": [
      { "name": "Herreklipp", "durationMin": 45, "priceNok": 450 },
      { "name": "Dameklipp", "durationMin": 60, "priceNok": 650 },
      { "name": "Farging", "durationMin": 90, "priceNok": 1200 }
    ],
    "imageUrl": "https://picsum.photos/seed/oslo-frisoer-styling/600/400"
  },
  {
    "name": "Grünerløkka Hårstudio",
    "category": "Frisør",
    "address": "Grünerløkka Torg 4, Oslo",
    "rating": 4.7,
    "reviewCount": 70,
    "services": [
      { "name": "Dameklipp", "durationMin": 60, "priceNok": 650 },
      { "name": "Herreklipp", "durationMin": 45, "priceNok": 450 }
    ],
    "imageUrl": "https://picsum.photos/seed/grunerloekka-haarstudio/600/400"
  },
  {
    "name": "Oslo Massasje & Velvære",
    "category": "Massasje",
    "address": "Bogstadveien 45, Oslo",
    "rating": 4.4,
    "reviewCount": 55,
    "services": [
      { "name": "Klassisk massasje 60 min", "durationMin": 60, "priceNok": 800 },
      { "name": "Hot stone massasje", "durationMin": 75, "priceNok": 1000 },
      { "name": "Ryggmassasje 30 min", "durationMin": 30, "priceNok": 500 }
    ],
    "imageUrl": "https://picsum.photos/seed/oslo-massasje-velvaere/600/400"
  },
  {
    "name": "Negleriet Oslo",
    "category": "Negler",
    "address": "Thorvald Meyers gate 22, Oslo",
    "rating": 4.6,
    "reviewCount": 92,
    "services": [
      { "name": "Gelenegler", "durationMin": 60, "priceNok": 550 },
      { "name": "Manikyr", "durationMin": 45, "priceNok": 400 },
      { "name": "Pedikyr", "durationMin": 60, "priceNok": 550 }
    ],
    "imageUrl": "https://picsum.photos/seed/negleriet-oslo/600/400"
  },
  {
    "name": "Hudpleieklinikken Oslo",
    "category": "Hudpleie",
    "address": "Grensen 9, Oslo",
    "rating": 4.8,
    "reviewCount": 61,
    "services": [
      { "name": "Ansiktsbehandling", "durationMin": 60, "priceNok": 900 },
      { "name": "Dybderens", "durationMin": 75, "priceNok": 1100 }
    ],
    "imageUrl": "https://picsum.photos/seed/hudpleieklinikken-oslo/600/400"
  },
  {
    "name": "Voksestudio Oslo",
    "category": "Voksing",
    "address": "Kirkeveien 78, Oslo",
    "rating": 4.1,
    "reviewCount": 33,
    "services": [
      { "name": "Ben voksing", "durationMin": 45, "priceNok": 500 },
      { "name": "Helkropp voksing", "durationMin": 90, "priceNok": 1200 },
      { "name": "Vipper voksing", "durationMin": 15, "priceNok": 150 }
    ],
    "imageUrl": "https://picsum.photos/seed/voksestudio-oslo/600/400"
  },
  {
    "name": "Salong Nord",
    "category": "Frisør",
    "address": "Markveien 18, Oslo",
    "rating": 4.3,
    "reviewCount": 47,
    "services": [
      { "name": "Herreklipp", "durationMin": 45, "priceNok": 450 },
      { "name": "Striper/Balayage", "durationMin": 120, "priceNok": 1600 },
      { "name": "Barneklipp", "durationMin": 30, "priceNok": 300 }
    ],
    "imageUrl": "https://picsum.photos/seed/salong-nord/600/400"
  },
  {
    "name": "Zen Massasje Studio",
    "category": "Massasje",
    "address": "Frognerveien 33, Oslo",
    "rating": 4.9,
    "reviewCount": 140,
    "services": [
      { "name": "Dyp vevsmassasje", "durationMin": 60, "priceNok": 900 },
      { "name": "Klassisk massasje 60 min", "durationMin": 60, "priceNok": 800 }
    ],
    "imageUrl": "https://picsum.photos/seed/zen-massasje-studio/600/400"
  },
  {
    "name": "Nail Bar Grünerløkka",
    "category": "Negler",
    "address": "Torggata 7, Oslo",
    "rating": 3.9,
    "reviewCount": 18,
    "services": [
      { "name": "Manikyr", "durationMin": 45, "priceNok": 400 },
      { "name": "Neglforlengelse", "durationMin": 90, "priceNok": 750 }
    ],
    "imageUrl": "https://picsum.photos/seed/nail-bar-grunerloekka/600/400"
  },
  {
    "name": "Glow Skincare Studio",
    "category": "Hudpleie",
    "address": "Aker Brygge 5, Oslo",
    "rating": 5.0,
    "reviewCount": 102,
    "services": [
      { "name": "Anti-age behandling", "durationMin": 90, "priceNok": 1400 },
      { "name": "Ansiktsbehandling", "durationMin": 60, "priceNok": 900 },
      { "name": "Dybderens", "durationMin": 75, "priceNok": 1100 }
    ],
    "imageUrl": "https://picsum.photos/seed/glow-skincare-studio/600/400"
  },
  {
    "name": "Smooth Skin Voksing",
    "category": "Voksing",
    "address": "Majorstuen Torg 2, Oslo",
    "rating": 4.2,
    "reviewCount": 27,
    "services": [
      { "name": "Vipper voksing", "durationMin": 15, "priceNok": 150 },
      { "name": "Ben voksing", "durationMin": 45, "priceNok": 500 }
    ],
    "imageUrl": "https://picsum.photos/seed/smooth-skin-voksing/600/400"
  },
  {
    "name": "Frisørkollektivet",
    "category": "Frisør",
    "address": "Sagene Ring 14, Oslo",
    "rating": 4.5,
    "reviewCount": 83,
    "services": [
      { "name": "Dameklipp", "durationMin": 60, "priceNok": 650 },
      { "name": "Farging", "durationMin": 90, "priceNok": 1200 },
      { "name": "Barneklipp", "durationMin": 30, "priceNok": 300 }
    ],
    "imageUrl": "https://picsum.photos/seed/frisoerkollektivet/600/400"
  },
  {
    "name": "Massasjehuset Frogner",
    "category": "Massasje",
    "address": "Vibes gate 8, Oslo",
    "rating": 4.6,
    "reviewCount": 65,
    "services": [
      { "name": "Ryggmassasje 30 min", "durationMin": 30, "priceNok": 500 },
      { "name": "Hot stone massasje", "durationMin": 75, "priceNok": 1000 }
    ],
    "imageUrl": "https://picsum.photos/seed/massasjehuset-frogner/600/400"
  },
  {
    "name": "Salong Glow Negler",
    "category": "Negler",
    "address": "Sørkedalsveien 60, Oslo",
    "rating": 4.0,
    "reviewCount": 22,
    "services": [
      { "name": "Gelenegler", "durationMin": 60, "priceNok": 550 },
      { "name": "Pedikyr", "durationMin": 60, "priceNok": 550 },
      { "name": "Neglforlengelse", "durationMin": 90, "priceNok": 750 }
    ],
    "imageUrl": "https://picsum.photos/seed/salong-glow-negler/600/400"
  },
  {
    "name": "Ren Hud Klinikk",
    "category": "Hudpleie",
    "address": "Skovveien 11, Oslo",
    "rating": 4.7,
    "reviewCount": 44,
    "services": [
      { "name": "Dybderens", "durationMin": 75, "priceNok": 1100 },
      { "name": "Ansiktsbehandling", "durationMin": 60, "priceNok": 900 }
    ],
    "imageUrl": "https://picsum.photos/seed/ren-hud-klinikk/600/400"
  }
];

async function seedSalons() {
  const salonsRef = db.collection('salons');
  const batch = db.batch();
  const seededIds = new Set();

  salons.forEach((salon, index) => {
    const id = slugify(salon.name);
    seededIds.add(id);
    batch.set(salonsRef.doc(id), {
      ...salon,
      services: salon.services.map((service) => ({ id: slugify(service.name), ...service })),
      openingHours: OPENING_HOURS[index % OPENING_HOURS.length],
    });
  });

  // Fjern salonger fra tidligere kjøringer (tilfeldige ID-er og gammelt dataformat)
  const existing = await salonsRef.listDocuments();
  const stale = existing.filter((docRef) => !seededIds.has(docRef.id));
  stale.forEach((docRef) => batch.delete(docRef));

  await batch.commit();
  console.log(`Lagret ${salons.length} salonger, fjernet ${stale.length} gamle.`);
}

async function seedDemoUser() {
  try {
    await getAuth().createUser(DEMO_USER);
    console.log(`Opprettet testkonto ${DEMO_USER.email} i emulatoren.`);
  } catch (error) {
    if (error.code !== 'auth/email-already-exists') throw error;
  }
}

seedSalons()
  .then(() => (useEmulator ? seedDemoUser() : undefined))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
