# Timeflyt

Timeflyt is a booking app for salons. Instead of booking through DMs and phone calls, customers find a place nearby, pick a service, a staff member and a free time, and the appointment is confirmed straight away.

The app is built with Expo (SDK 57) and Firebase and runs on iOS, Android and the web. The UI is in Norwegian.

## Features

- Home screen with categories, upcoming appointment, "book again", favourites, nearby and popular salons
- Search with category filters and sorting by rating, price or distance
- Salon pages with photo gallery, services grouped by category, reviews, opening hours, staff and cancellation policy
- Booking flow: service → staff ("anyone" or a specific person) → date → time → confirmation
- Real-time availability based on opening hours, service duration and existing bookings, with double-booking prevented on the server
- Appointments: reschedule, cancel (within the salon's deadline), book again, directions and call the salon
- Reviews that can only be written for completed appointments
- Notifications sent from the server, so they also work on the web:
  - email confirmation when you book, move or cancel, and if the salon cancels
  - a reminder the day before (or two hours before for same-day bookings) – a push notification in the app, otherwise an email
- Account: sign up, sign in, password reset, edit profile, delete account

### For businesses

Timeflyt is built first and foremost for home-based salons, solo technicians and small businesses, with room to grow into larger salons. Business mode lives in the same app (Profile → *Timeflyt for bedrifter*) and works on the web, so the salon can use it on a PC.

- Register a business in one form: name, category, home salon or salon/studio, area and contact info. The owner becomes the first person customers can book with, so a solo business doesn't need to set up staff at all
- Home salons can leave the address empty; customers then only see the area
- New businesses are hidden from customers until they have added services and choose to publish
- Calendar with day and week views. On a phone the week is a list per day; on a wide screen it's a seven-day grid and the menu moves to a sidebar. With several staff members, the day view has one column per person and can be filtered
- Appointment details with the customer's name, phone (call/SMS), note and history at the salon (number of visits and no-shows)
- The salon can cancel an appointment at any time (the slot is freed and the customer sees that the salon cancelled), and mark "didn't show up" once it has started
- Services (name, group, duration, price, description), staff, opening hours, days off and holidays for the whole salon or one person, cancellation deadline and profile
- Push notification and email when someone books, moves or cancels. Email can be turned off under *Salongen → Varsler*

## Getting started

```bash
npm install
npm start
```

Press `i` for iOS, `a` for Android or `w` for web.

Expo Go works for most things. Reminders and location are best tested in a development build (`npx expo run:ios` / `npx expo run:android`).

## Firebase setup (one time)

1. **Enable email sign-in:** Firebase Console → Authentication → Sign-in method → enable *Email/Password*.
2. **Deploy security rules and indexes:** `npm run deploy:firestore` (requires `npm i -g firebase-tools` and `firebase login`). The reviews list and the business calendar need the composite indexes in `firestore.indexes.json`; they take a few minutes to build after deploying.
3. **Add sample salons:** download a service account key (Project settings → Service accounts → Generate new private key), save it as `serviceAccountKey.json` in the project root (it is git-ignored) and run `npm run seed`. This replaces the sample salons; salons registered by businesses in the app are never touched.

## Notifications (one time)

Notifications are sent by Cloud Functions in `functions/`. They need the Blaze plan (pay as you go – the free quota covers a small business with plenty to spare).

1. **Email:** create an account at [Resend](https://resend.com), verify the domain you will send from and create an API key.
2. **Push:** run `npx eas-cli init` to create an Expo project (this adds `extra.eas.projectId` to `app.json`). Set up push credentials with `npx eas-cli credentials` (an FCM V1 key for Android and an APNs key for iOS – see [Expo's guide](https://docs.expo.dev/push-notifications/push-notifications-setup/)). On [expo.dev](https://expo.dev), turn on *Enhanced security for push notifications* for the project and create an access token. Push needs a development build; it doesn't work in Expo Go on Android.
3. **Secrets:** they are stored in Google Secret Manager, never in the code:
   ```bash
   firebase functions:secrets:set RESEND_API_KEY
   firebase functions:secrets:set EXPO_ACCESS_TOKEN
   ```
4. **Deploy:** `npm --prefix functions install`, then `npm run deploy:firestore` and `npm run deploy:functions`. The first deploy asks for `EMAIL_FROM` (for example `Timeflyt <varsler@yourdomain.no>`) and `APP_URL` (the address of the web version, used for links in emails – can be left empty) and saves them in `functions/.env.timeflyt`.
5. **Optional:** turn on a TTL policy on the `expireAt` field for the `sentNotifications` and `pushTickets` collections (Firestore → TTL) so old entries are deleted automatically.

How it works:

- When a booking is created or cancelled, a function sends push and email to the right person and plans the reminder in `reminders/{bookingId}`. A scheduled function sends due reminders every ten minutes.
- Email is only sent to verified email addresses, so nobody can sign up with someone else's address and have us email them. New accounts get a verification link, and the profile shows a reminder until it's done.
- Names of the salon, service and staff in notifications come from the salon document, not from the booking the customer wrote. Everything from users is escaped before it goes into an email.
- A device belongs to the last person who signed in on it (`pushTokens/{token}`), and is removed when they sign out, so the next person never gets someone else's notifications.
- Each notification is sent at most once, even if Firestore delivers the same event twice.

## Local development with emulators

You can run everything against local emulators without touching the real database:

```bash
npm --prefix functions install   # once
npm run emulators        # Auth, Firestore and Functions (UI at http://127.0.0.1:4000)
npm run seed:emulator    # sample salons, reviews and a test account with two appointments
```

In the emulator, emails and push notifications are written to the Functions log instead of being sent, so test data never reaches real people. To keep the emulator from looking for the real secrets, create `functions/.secret.local` (git-ignored) with `RESEND_API_KEY=test` and `EXPO_ACCESS_TOKEN=test` on separate lines. Scheduled reminders don't run in the emulator.

Then create `.env.local` with `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true` and restart Expo. On a physical phone, also set `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` to your computer's IP address (Android emulator: `10.0.2.2`). Delete `.env.local` to go back to the real database.

This creates two test accounts (email and password are in `scripts/seedSalons.js`): a customer with two appointments, and the owner of *Salong Nord* with a week of appointments in the calendar, including a no-show and a cancellation.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start Expo |
| `npm run lint` | Run ESLint |
| `npm run test:rules` | Test `firestore.rules` against the emulator (requires Java) |
| `npm run test:functions` | Test the notification texts and reminder times |
| `npm run seed` / `seed:emulator` | Add sample salons |
| `npm run deploy:firestore` | Deploy rules and indexes |
| `npm run deploy:functions` | Deploy the notification functions |

## Project structure

```
app/                   screens (Expo Router)
  index.tsx            onboarding (first launch only)
  (tabs)/              Home, Search, Appointments, Profile
  business/            business mode: start page, registration, calendar, services,
                       salon settings, appointment details, hours, days off, staff
  salon/[id].tsx       salon page
  book/                choose time → confirm → success
  booking/[id].tsx     appointment details
  review/, account/    review, edit profile, delete account
components/            shared UI (components/ui is the design system, components/business is used by business mode)
constants/theme.ts     colours, fonts, radii and shadows
context/               auth, salons, bookings, business, favourites, location, onboarding
hooks/                 small data hooks
lib/                   Firebase setup, types, scheduling and formatting helpers
scripts/               seed and test scripts
tests/                 security rules tests
functions/             Cloud Functions: notifications and reminders
```

## Data model (Firestore)

- `salons/{id}` — name, category, home salon or salon, address, photos, location, services, staff, opening hours, days off (`closedDates`: `2026-10-12` for the whole salon, `2026-10-12_staffId` for one person), cancellation deadline, `published` and rating totals. Anyone signed in can create a salon and becomes its `ownerId`. Only the owner can edit it, and never the rating totals, which are only updated together with a new review.
- `bookings/{id}` — one appointment. The customer can read it and cancel before the salon's deadline. The salon owner can read all appointments at the salon, cancel at any time (`cancelledBy: 'salon'`) and mark `noShow` once the appointment has started. Bookings on days off are rejected by the rules. When the customer moves an appointment, the new booking has `replacesBookingId` and the old one is cancelled in the same transaction.
- `slots/{salonId_staffId_date_time}` — one 30-minute slot. Created in the same transaction as the booking and can never be overwritten, so two customers can't get the same time. Deleted when the customer or the salon cancels.
- `reviews/{bookingId}` — public. One per completed booking, written by the person who had the appointment.
- `users/{uid}` and `users/{uid}/favorites/{salonId}` — profile, notification settings (`reminders`, `salonEmails`) and favourites, private to the user.
- `pushTokens/{token}` — which user a device belongs to. Written by the app, only read by the server.
- `reminders/{bookingId}`, `sentNotifications/{key}` and `pushTickets/{id}` — used only by Cloud Functions. The app can't read or write them.

Sample data uses photos from [Unsplash](https://unsplash.com) and fictional phone numbers.
