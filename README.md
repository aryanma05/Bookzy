# Timeflyt

Bookingtjeneste for salonger (frisør, massasje, negler, hudpleie, voksing) – book en time på noen få trykk i stedet for via private meldinger. Bygget med Expo (SDK 57) og Firebase, for iOS, Android og web.

## Kom i gang

```bash
npm install
npm start
```

Trykk `i` for iOS, `a` for Android eller `w` for web.

## Firebase-oppsett (gjøres én gang)

1. **Slå på e-post-innlogging:** Firebase Console → Authentication → Sign-in method → aktiver *E-post/passord*.
2. **Publiser sikkerhetsreglene:** `npm run deploy:firestore` (krever `npm i -g firebase-tools` og `firebase login`).
3. **Legg inn testsalonger:** last ned en tjenestekontonøkkel (Prosjektinnstillinger → Tjenestekontoer → Generer ny privat nøkkel), lagre den som `serviceAccountKey.json` i prosjektroten (den er i `.gitignore`), og kjør `npm run seed`.

## Lokal utvikling mot emulatorer

Du kan teste alt uten å røre den ekte databasen:

```bash
npm run emulators        # Auth + Firestore lokalt (UI på http://127.0.0.1:4000)
npm run seed:emulator    # salonger + testkontoen kunde@timeflyt.test (se scripts/seedSalons.js)
```

Lag så `.env.local` med `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true` og start appen på nytt. På en fysisk telefon må du også sette `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` til datamaskinens IP-adresse (Android-emulator: `10.0.2.2`). Slett `.env.local` for å gå tilbake til den ekte databasen.

## Skript

| Kommando | Hva den gjør |
| --- | --- |
| `npm start` | Starter Expo |
| `npm run lint` | ESLint |
| `npm run test:rules` | Tester `firestore.rules` mot emulatoren (krever Java) |
| `npm run seed` / `seed:emulator` | Legger inn testsalonger |
| `npm run deploy:firestore` | Publiserer regler og indekser |

## Struktur

```
app/                 skjermer (Expo Router)
  index.tsx          onboarding (vises bare første gang)
  login.tsx          innlogging, registrering og glemt passord
  (tabs)/            Utforsk, Bestillinger, Profil
  business/[id].tsx  salongside med tjeneste-, dato- og tidsvalg
context/             AuthContext, BookingContext, OnboardingContext
hooks/               useNow, useTakenTimes
lib/                 Firebase-oppsett, datatyper og dato-/tidshjelpere
scripts/             seed- og testskript
tests/               tester for sikkerhetsreglene
```

## Datamodell (Firestore)

- `salons/{id}` – navn, kategori, adresse, `rating`, `reviewCount`, `services[]` (`id`, `name`, `durationMin`, `priceNok`) og `openingHours` per ukedag. Kun lesbar fra appen.
- `bookings/{id}` – én time: kunde, salong, tjeneste, `date`, `time`, `startAt`, `slotIds`, `status` (`confirmed`/`cancelled`). Bare eieren kan lese og avbestille.
- `slots/{salongId_dato_tid}` – én 30-minutters luke. Opprettes i samme transaksjon som bookingen og kan aldri overskrives, slik at to kunder ikke kan få samme tid. Slettes ved avbestilling.
