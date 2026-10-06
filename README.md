# Timeflyt

Timeflyt is a booking app for salons — hairdressers, barbers, nail studios, massage and skincare. Instead of booking through DMs and phone calls, customers find a place nearby, pick a service, a staff member and a free time, and the appointment is confirmed straight away.

The app is built with Expo (SDK 57) and Firebase and runs on iOS, Android and the web. The UI is in Norwegian.

## Features

- Home screen with categories, upcoming appointment, "book again", favourites, nearby and popular salons
- Search with category filters and sorting by rating, price or distance
- Salon pages with photo gallery, services grouped by category, reviews, opening hours, staff and cancellation policy
- Booking flow: service → staff ("anyone" or a specific person) → date → time → confirmation
- Real-time availability based on opening hours, service duration and existing bookings, with double-booking prevented on the server
- Appointments: reschedule, cancel (within the salon's deadline), book again, directions and call the salon
- Reviews that can only be written for completed appointments
- Local reminders the day before an appointment (iOS/Android)
- Account: sign up, sign in, password reset, edit profile, delete account

## Getting started

```bash
npm install
npm start
```

Press `i` for iOS, `a` for Android or `w` for web.

Expo Go works for most things. Reminders and location are best tested in a development build (`npx expo run:ios` / `npx expo run:android`).

## Firebase setup (one time)

1. **Enable email sign-in:** Firebase Console → Authentication → Sign-in method → enable *Email/Password*.
2. **Deploy security rules and indexes:** `npm run deploy:firestore` (requires `npm i -g firebase-tools` and `firebase login`). The reviews query needs the composite index in `firestore.indexes.json`; it takes a few minutes to build after deploying.
3. **Add sample salons:** download a service account key (Project settings → Service accounts → Generate new private key), save it as `serviceAccountKey.json` in the project root (it is git-ignored) and run `npm run seed`. This replaces any salons in the old data format.

## Local development with emulators

You can run everything against local emulators without touching the real database:

```bash
npm run emulators        # Auth + Firestore (UI at http://127.0.0.1:4000)
npm run seed:emulator    # sample salons, reviews and a test account with two appointments
```

Then create `.env.local` with `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true` and restart Expo. On a physical phone, also set `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` to your computer's IP address (Android emulator: `10.0.2.2`). Delete `.env.local` to go back to the real database.

The test account's email and password are defined in `scripts/seedSalons.js`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start Expo |
| `npm run lint` | Run ESLint |
| `npm run test:rules` | Test `firestore.rules` against the emulator (requires Java) |
| `npm run seed` / `seed:emulator` | Add sample salons |
| `npm run deploy:firestore` | Deploy rules and indexes |

## Project structure

```
app/                   screens (Expo Router)
  index.tsx            onboarding (first launch only)
  (tabs)/              Home, Search, Appointments, Profile
  salon/[id].tsx       salon page
  book/                choose time → confirm → success
  booking/[id].tsx     appointment details
  review/, account/    review, edit profile, delete account
components/            shared UI (components/ui is the design system)
constants/theme.ts     colours, fonts, radii and shadows
context/               auth, salons, bookings, favourites, location, onboarding
hooks/                 small data hooks
lib/                   Firebase setup, types, scheduling and formatting helpers
scripts/               seed and test scripts
tests/                 security rules tests
```

## Data model (Firestore)

- `salons/{id}` — name, category, address, photos, location, services, staff, opening hours, cancellation deadline and rating totals. Read-only from the app, except for updating rating totals together with a new review.
- `bookings/{id}` — one appointment. Only the owner can read it, and the only allowed change is cancelling before the salon's deadline.
- `slots/{salonId_staffId_date_time}` — one 30-minute slot. Created in the same transaction as the booking and can never be overwritten, so two customers can't get the same time. Deleted when the booking is cancelled.
- `reviews/{bookingId}` — public. One per completed booking, written by the person who had the appointment.
- `users/{uid}` and `users/{uid}/favorites/{salonId}` — profile and favourites, private to the user.

Sample data uses photos from [Unsplash](https://unsplash.com) and fictional phone numbers.
