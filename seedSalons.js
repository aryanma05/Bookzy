const { initializeApp } = require('firebase-admin/app');
const { cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

const salons = [
  {
    "name": "Oslo Frisør & Styling",
    "category": "Frisør",
    "address": "Karl Johans gate 12, Oslo",
    "rating": "4,9",
    "reviews": 128,
    "services": [
      { "name": "Herreklipp", "duration": "45 min", "price": "450 kr" },
      { "name": "Dameklipp", "duration": "60 min", "price": "650 kr" },
      { "name": "Farging", "duration": "90 min", "price": "1200 kr" }
    ],
    "availableTimes": ["10:00", "11:30", "13:00", "14:30", "16:00"],
    "imageUrl": "https://picsum.photos/seed/oslo-frisoer-styling/600/400"
  },
  {
    "name": "Grünerløkka Hårstudio",
    "category": "Frisør",
    "address": "Grünerløkka Torg 4, Oslo",
    "rating": "4,7",
    "reviews": 70,
    "services": [
      { "name": "Dameklipp", "duration": "60 min", "price": "650 kr" },
      { "name": "Herreklipp", "duration": "45 min", "price": "450 kr" }
    ],
    "availableTimes": ["09:00", "09:30", "16:00", "17:00"],
    "imageUrl": "https://picsum.photos/seed/grunerloekka-haarstudio/600/400"
  },
  {
    "name": "Oslo Massasje & Velvære",
    "category": "Massasje",
    "address": "Bogstadveien 45, Oslo",
    "rating": "4,4",
    "reviews": 55,
    "services": [
      { "name": "Klassisk massasje 60 min", "duration": "60 min", "price": "800 kr" },
      { "name": "Hot stone massasje", "duration": "75 min", "price": "1000 kr" },
      { "name": "Ryggmassasje 30 min", "duration": "30 min", "price": "500 kr" }
    ],
    "availableTimes": ["10:00", "11:00", "13:30", "15:00", "16:30"],
    "imageUrl": "https://picsum.photos/seed/oslo-massasje-velvaere/600/400"
  },
  {
    "name": "Negleriet Oslo",
    "category": "Negler",
    "address": "Thorvald Meyers gate 22, Oslo",
    "rating": "4,6",
    "reviews": 92,
    "services": [
      { "name": "Gelenegler", "duration": "60 min", "price": "550 kr" },
      { "name": "Manikyr", "duration": "45 min", "price": "400 kr" },
      { "name": "Pedikyr", "duration": "60 min", "price": "550 kr" }
    ],
    "availableTimes": ["09:30", "11:00", "12:00", "14:00", "15:30", "17:00"],
    "imageUrl": "https://picsum.photos/seed/negleriet-oslo/600/400"
  },
  {
    "name": "Hudpleieklinikken Oslo",
    "category": "Hudpleie",
    "address": "Grensen 9, Oslo",
    "rating": "4,8",
    "reviews": 61,
    "services": [
      { "name": "Ansiktsbehandling", "duration": "60 min", "price": "900 kr" },
      { "name": "Dybderens", "duration": "75 min", "price": "1100 kr" }
    ],
    "availableTimes": ["10:30", "12:00", "13:00", "15:00", "16:00"],
    "imageUrl": "https://picsum.photos/seed/hudpleieklinikken-oslo/600/400"
  },
  {
    "name": "Voksestudio Oslo",
    "category": "Voksing",
    "address": "Kirkeveien 78, Oslo",
    "rating": "4,1",
    "reviews": 33,
    "services": [
      { "name": "Ben voksing", "duration": "45 min", "price": "500 kr" },
      { "name": "Helkropp voksing", "duration": "90 min", "price": "1200 kr" },
      { "name": "Vipper voksing", "duration": "15 min", "price": "150 kr" }
    ],
    "availableTimes": ["10:30", "11:00", "14:30", "15:00", "17:30"],
    "imageUrl": "https://picsum.photos/seed/voksestudio-oslo/600/400"
  },
  {
    "name": "Salong Nord",
    "category": "Frisør",
    "address": "Markveien 18, Oslo",
    "rating": "4,3",
    "reviews": 47,
    "services": [
      { "name": "Herreklipp", "duration": "45 min", "price": "450 kr" },
      { "name": "Striper/Balayage", "duration": "120 min", "price": "1600 kr" },
      { "name": "Barneklipp", "duration": "30 min", "price": "300 kr" }
    ],
    "availableTimes": ["09:00", "10:00", "12:30", "14:00", "16:30", "17:30"],
    "imageUrl": "https://picsum.photos/seed/salong-nord/600/400"
  },
  {
    "name": "Zen Massasje Studio",
    "category": "Massasje",
    "address": "Frognerveien 33, Oslo",
    "rating": "4,9",
    "reviews": 140,
    "services": [
      { "name": "Dyp vevsmassasje", "duration": "60 min", "price": "900 kr" },
      { "name": "Klassisk massasje 60 min", "duration": "60 min", "price": "800 kr" }
    ],
    "availableTimes": ["09:30", "11:30", "13:00", "15:30"],
    "imageUrl": "https://picsum.photos/seed/zen-massasje-studio/600/400"
  },
  {
    "name": "Nail Bar Grünerløkka",
    "category": "Negler",
    "address": "Torggata 7, Oslo",
    "rating": "3,9",
    "reviews": 18,
    "services": [
      { "name": "Manikyr", "duration": "45 min", "price": "400 kr" },
      { "name": "Neglforlengelse", "duration": "90 min", "price": "750 kr" }
    ],
    "availableTimes": ["10:00", "11:30", "14:00", "16:00", "17:00"],
    "imageUrl": "https://picsum.photos/seed/nail-bar-grunerloekka/600/400"
  },
  {
    "name": "Glow Skincare Studio",
    "category": "Hudpleie",
    "address": "Aker Brygge 5, Oslo",
    "rating": "5,0",
    "reviews": 102,
    "services": [
      { "name": "Anti-age behandling", "duration": "90 min", "price": "1400 kr" },
      { "name": "Ansiktsbehandling", "duration": "60 min", "price": "900 kr" },
      { "name": "Dybderens", "duration": "75 min", "price": "1100 kr" }
    ],
    "availableTimes": ["09:00", "10:30", "12:00", "13:30", "15:00", "16:30"],
    "imageUrl": "https://picsum.photos/seed/glow-skincare-studio/600/400"
  },
  {
    "name": "Smooth Skin Voksing",
    "category": "Voksing",
    "address": "Majorstuen Torg 2, Oslo",
    "rating": "4,2",
    "reviews": 27,
    "services": [
      { "name": "Vipper voksing", "duration": "15 min", "price": "150 kr" },
      { "name": "Ben voksing", "duration": "45 min", "price": "500 kr" }
    ],
    "availableTimes": ["11:00", "12:30", "14:00", "16:00"],
    "imageUrl": "https://picsum.photos/seed/smooth-skin-voksing/600/400"
  },
  {
    "name": "Frisørkollektivet",
    "category": "Frisør",
    "address": "Sagene Ring 14, Oslo",
    "rating": "4,5",
    "reviews": 83,
    "services": [
      { "name": "Dameklipp", "duration": "60 min", "price": "650 kr" },
      { "name": "Farging", "duration": "90 min", "price": "1200 kr" },
      { "name": "Barneklipp", "duration": "30 min", "price": "300 kr" }
    ],
    "availableTimes": ["09:30", "10:30", "12:00", "13:30", "15:30", "17:00"],
    "imageUrl": "https://picsum.photos/seed/frisoerkollektivet/600/400"
  },
  {
    "name": "Massasjehuset Frogner",
    "category": "Massasje",
    "address": "Vibes gate 8, Oslo",
    "rating": "4,6",
    "reviews": 65,
    "services": [
      { "name": "Ryggmassasje 30 min", "duration": "30 min", "price": "500 kr" },
      { "name": "Hot stone massasje", "duration": "75 min", "price": "1000 kr" }
    ],
    "availableTimes": ["10:00", "11:30", "13:00", "14:30", "16:00"],
    "imageUrl": "https://picsum.photos/seed/massasjehuset-frogner/600/400"
  },
  {
    "name": "Salong Glow Negler",
    "category": "Negler",
    "address": "Sørkedalsveien 60, Oslo",
    "rating": "4,0",
    "reviews": 22,
    "services": [
      { "name": "Gelenegler", "duration": "60 min", "price": "550 kr" },
      { "name": "Pedikyr", "duration": "60 min", "price": "550 kr" },
      { "name": "Neglforlengelse", "duration": "90 min", "price": "750 kr" }
    ],
    "availableTimes": ["09:00", "10:30", "12:00", "15:00", "16:30"],
    "imageUrl": "https://picsum.photos/seed/salong-glow-negler/600/400"
  },
  {
    "name": "Ren Hud Klinikk",
    "category": "Hudpleie",
    "address": "Skovveien 11, Oslo",
    "rating": "4,7",
    "reviews": 44,
    "services": [
      { "name": "Dybderens", "duration": "75 min", "price": "1100 kr" },
      { "name": "Ansiktsbehandling", "duration": "60 min", "price": "900 kr" }
    ],
    "availableTimes": ["10:00", "11:00", "13:00", "14:30", "17:00"],
    "imageUrl": "https://picsum.photos/seed/ren-hud-klinikk/600/400"
  }
];

async function seedSalons() {
  const batch = db.batch();
  const salonsRef = db.collection('salons');

  salons.forEach((salon) => {
    const docRef = salonsRef.doc();
    batch.set(docRef, salon);
  });

  await batch.commit();
  console.log(`Seeded ${salons.length} salons into Firestore (Picsum-bilder, garantert stabile).`);
}

seedSalons().catch(console.error);