# Bookzy

Bookzy is a booking app for any kind of salon - hairdressers, barbers, nail studios, massage and skincare. Instead of booking through DMs and phone calls, customers find a place nearby, pick a service, a staff member and a free time, and the appointment is confirmed straight away.

The app is built with Expo (SDK 57) and Firebase and runs on iOS, Android and the web. The UI is in Norwegian.

## Features

- Home screen with categories, upcoming appointment, "book again", favourites, nearby and popular salons
- Search with category filters and sorting by rating, price or distance
- Salon pages with photo gallery, services grouped by category, reviews, opening hours, staff and cancellation policy
- Booking flow: service → staff ("anyone" or a specific person) → date → time → confirmation
- On the web, customers book without an account: name, mobile number and a code sent by SMS on the confirmation page. That's all someone who taps a booking link in an Instagram bio has to do
- Real-time availability based on opening hours, service duration and existing bookings, with double-booking prevented on the server
- Appointments: reschedule, cancel (within the salon's deadline), book again, directions and call the salon
- Reviews that can only be written for completed appointments
- Notifications sent from the server, so they also work on the web:
  - email confirmation when you book, move or cancel, and if the salon cancels. Customers who booked on the web with only their mobile number get an SMS instead when they book or move, and if the salon cancels
  - a reminder the day before (or two hours before for same-day bookings) – a push notification in the app, otherwise an email or SMS
- Account: sign up, sign in, password reset, edit profile, delete account. On the web you can also sign in with your mobile number and an SMS code, which is how customers find their appointments again

### For businesses

Bookzy is built first and foremost for home-based salons, solo technicians and small businesses, with room to grow into larger salons. Business mode lives in the same app (Profile → *Bookzy for bedrifter*) and works on the web, so the salon can use it on a PC.

- Register a business in one form: name, category, home salon or salon/studio, area and contact info. The owner becomes the first person customers can book with, so a solo business doesn't need to set up staff at all
- Home salons can leave the address empty; customers then only see the area
- *Godkjenn bookinger selv*: bookings become requests the salon approves or declines (Profil og kontaktinfo). The address is then kept in `salons/{id}/private/address`, which only the owner can read, and is copied onto the booking when it is approved, so customers only see it once they're approved. Declining frees the time. Pending requests are shown at the top of the calendar. The salon gets a push notification and email for new and withdrawn requests. The customer gets an email when the request is sent (without the address), and a push notification and email (or SMS) when it's approved, with the address, or declined. The reminder is set up when the request is approved
- The salon can write its own terms (*Vilkår*), which customers must accept before they can book
- New businesses are hidden from customers until they have added services and choose to publish
- Calendar with day and week views. On a phone the week is a list per day; on a wide screen it's a seven-day grid and the menu moves to a sidebar. With several staff members, the day view has one column per person and can be filtered. Cancelled appointments stay in the calendar in red, marked "Avbestilt"
- Appointment details with the customer's name, phone (call/SMS), note and history at the salon (number of visits and no-shows)
- The salon can cancel an appointment at any time (the slot is freed and the customer sees that the salon cancelled), and mark "didn't show up" once it has started
- Services (name, group, duration, price, description and an optional thumbnail), staff, opening hours, days off and holidays for the whole salon or one person, cancellation deadline and profile. The duration is set in quarters with + and –, or typed in minutes. Bookings still start every half hour and take whole half hours in the calendar, so a 50-minute service holds an hour; the form says so
- Breaks: each open day can have one or more breaks (lunch, picking up the kids). Customers can't book a time that runs into a break, the salon page lists them under the opening hours, and the calendar shows them in grey
- *Fleksibel salong*: a home salon can hide its opening hours. Customers then only see free times. The weekly hours still decide when they can book, so nobody books in the middle of the night
- Up to 8 cover photos (*Forsidebilder*), picked from the phone or PC. They are shrunk before upload (max 1600 px, JPEG), and the owner chooses the cover, which is shown first on the salon page and in search. Without photos the salon shows its category icon
- Push notification and email when someone books, moves or cancels. Email can be turned off under *Salongen → Varsler*

## Getting started

```bash
npm install
npm start
```

Press `i` for iOS, `a` for Android or `w` for web.

Expo Go works for most things. Reminders and location are best tested in a development build (`npx expo run:ios` / `npx expo run:android`).

## Firebase setup (one time)

1. **Enable sign-in:** Firebase Console → Authentication → Sign-in method → enable *Email/Password* and *Phone*.
   - **Phone needs these too, or SMS will fail on the web:** under Authentication → Settings → *Authorized domains*, add `bookzy.no` (and `www.bookzy.no`). Under *SMS region policy*, choose *Allow* and select only Norway (and any other countries your customers have numbers from). This stops bots from sending SMS to expensive foreign numbers on your bill (SMS pumping).
   - SMS costs money per message on the Blaze plan. Set a budget alert in Google Cloud Console → Billing → Budgets.
   - Business accounts must use email, since that's where the salon is told about new bookings. In the apps (iOS/Android), customers still sign in with email: SMS sign-in there needs `@react-native-firebase/auth` and a development build.
2. **Enable Storage** (for salon photos): Firebase Console → Storage → *Get started*, and pick a location in Europe. The bucket is `timeflyt.firebasestorage.app`, already set in `lib/firebase.ts`.
3. **Deploy security rules and indexes:** `npm run deploy:firestore` and `npm run deploy:storage` (requires `npm i -g firebase-tools` and `firebase login`). The reviews list and the business calendar need the composite indexes in `firestore.indexes.json`; they take a few minutes to build after deploying. `storage.rules` reads the salon document to check who owns it, so the first Storage deploy asks to let Storage read Firestore. Answer yes, or uploads will be denied.
4. **Remove the sample salons before launch:** the database may still have the sample salons with fictional phone numbers from earlier testing. Download a service account key (Project settings → Service accounts → Generate new private key), save it as `serviceAccountKey.json` in the project root (it is git-ignored) and run `npm run seed:remove`. It deletes every salon without an owner, the sample reviews and any appointments at those salons. Salons registered by businesses in the app are never touched. Sample salons can only be added to the emulator (`npm run seed:emulator`).

## Booking link

Each salon gets a short link, `<web address>/<id>` (for example `bookzy.no/negler-hos-lina`), to put in the Instagram bio or send by SMS. The id is the salon's name, with four extra characters only if the name is taken or is the name of a page in the app. The link is shown under *Bookinglenke* in business mode and is also included when customers share a salon.

Link previews (Instagram, Messenger, iMessage, SMS) don't run JavaScript, so the static pages would show the same title and logo for every salon. The short link is therefore served by the `salonLinkPage` function: it returns the salon's name, description and first cover photo as Open Graph tags and sends the browser on to `/salon/<id>`. Hosting caches the answer for an hour, and clears it on every deploy. Old links to `/salon/<id>` still work, but show the general preview.

The web version is hosted on Firebase Hosting at `https://bookzy.no`. The address is set in two places: `EXPO_PUBLIC_APP_URL` in `.env` for the app, and `APP_URL` in `functions/.env.timeflyt` for links in emails. It is built into the app when it is exported, so if the domain ever changes, update both and deploy the web version, the functions and the apps again.

1. Run `npm run deploy:web`. It exports the web version to `dist/` and deploys it together with `salonLinkPage`, since Hosting sends every address that isn't a page to that function. The functions must be set up first (see Notifications). If the deploy says the site doesn't exist, open Hosting in Firebase Console and click *Get started* once.
2. Connect the domain (one time): Firebase Console → Hosting → *Add custom domain* → `bookzy.no`, and add the DNS records it shows at your domain registrar. Add `www.bookzy.no` too and let it redirect to `bookzy.no`. The certificate can take a few hours; until then the site is only at `https://timeflyt.web.app`.

Without `EXPO_PUBLIC_APP_URL`, salons are shared without a link and the button in business mode is hidden.

The web version is a set of static pages. Pages with an id in the address, such as `salon/[id]`, are exported once and served for every id by the rewrites in `firebase.json`. A new screen with an id in its path needs a rewrite there too. To test it locally, run `npx expo export -p web` and `firebase emulators:start --only hosting`, then open `http://127.0.0.1:5000/salon/<id>`.

## Notifications (one time)

Notifications are sent by Cloud Functions in `functions/`. They need the Blaze plan (pay as you go – the free quota covers a small business with plenty to spare).

1. **Email:** create an account at [Resend](https://resend.com), verify `bookzy.no` (emails are sent from `varsler@bookzy.no`) and create an API key.
2. **SMS:** create an account at [Sveve](https://sveve.no) and turn on API access. Under *API → API-nøkkel* you find the API password. Add your Sveve username to `functions/.env.timeflyt` as `SVEVE_USER=...`. Sveve is a Norwegian provider with self-service sign-up, pay per message and no contract, and messages are sent from *Bookzy*.
3. **Push:** run `npx eas-cli init` to create an Expo project (this adds `extra.eas.projectId` to `app.json`). Set up push credentials with `npx eas-cli credentials` (an FCM V1 key for Android and an APNs key for iOS – see [Expo's guide](https://docs.expo.dev/push-notifications/push-notifications-setup/)). On [expo.dev](https://expo.dev), turn on *Enhanced security for push notifications* for the project and create an access token. Push needs a development build; it doesn't work in Expo Go on Android.
4. **Secrets:** they are stored in Google Secret Manager, never in the code. `SVEVE_API_KEY` is the API password from Sveve:
   ```bash
   firebase functions:secrets:set RESEND_API_KEY
   firebase functions:secrets:set EXPO_ACCESS_TOKEN
   firebase functions:secrets:set SVEVE_API_KEY
   ```
5. **Deploy:** `npm --prefix functions install`, then `npm run deploy:firestore` and `npm run deploy:functions`. The sender (`EMAIL_FROM`), the Sveve username (`SVEVE_USER`) and the address used for links in emails and SMS (`APP_URL`) are in `functions/.env.timeflyt`. Until `SVEVE_USER` is set, SMS are skipped and the Functions log says so.
6. **Optional:** turn on a TTL policy on the `expireAt` field for the `sentNotifications` and `pushTickets` collections (Firestore → TTL) so old entries are deleted automatically.

How it works:

- When a booking is created or cancelled, a function sends push, email or SMS to the right person and plans the reminder in `reminders/{bookingId}`. A scheduled function sends due reminders every ten minutes.
- Email is only sent to verified email addresses, so nobody can sign up with someone else's address and have us email them. New accounts get a verification link, and the profile shows a reminder until it's done.
- SMS go to customers without a verified email who signed in with their mobile number. The number comes from their sign-in (verified with an SMS code), never from the booking. A customer who cancels in the app gets no SMS, and the salon is never sent SMS. Each SMS costs money, so keep an eye on the balance at Sveve.
- Names of the salon, service and staff in notifications come from the salon document, not from the booking the customer wrote. Everything from users is escaped before it goes into an email.
- A device belongs to the last person who signed in on it (`pushTokens/{token}`), and is removed when they sign out, so the next person never gets someone else's notifications.
- Each notification is sent at most once, even if Firestore delivers the same event twice.

## Local development with emulators

You can run everything against local emulators without touching the real database:

```bash
npm --prefix functions install   # once
npm run emulators        # Auth, Firestore, Functions and Storage (UI at http://127.0.0.1:4000)
npm run seed:emulator    # sample salons, reviews and a test account with two appointments
```

In the emulator, emails, SMS and push notifications are written to the Functions log instead of being sent, so test data never reaches real people. To keep the emulator from looking for the real secrets, create `functions/.secret.local` (git-ignored) with `RESEND_API_KEY=test`, `EXPO_ACCESS_TOKEN=test` and `SVEVE_API_KEY=test` on separate lines. Scheduled reminders don't run in the emulator. SMS codes aren't sent either; the Auth emulator prints them in its log and shows them in the Emulator UI.

Then create `.env.local` with `EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true` and restart Expo. On a physical phone, also set `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST` to your computer's IP address (Android emulator: `10.0.2.2`). Delete `.env.local` to go back to the real database.

This creates two test accounts (email and password are in `scripts/seedSalons.js`): a customer with two appointments, and the owner of *Salong Nord* with a week of appointments in the calendar, including a no-show and a cancellation.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Start Expo |
| `npm run lint` | Run ESLint |
| `npm run test:rules` | Test `firestore.rules` and `storage.rules` against the emulators (requires Java) |
| `npm run test:functions` | Test the notification texts and reminder times |
| `npm run test:app` | Test the phone number formatting |
| `npm run seed:emulator` | Add sample salons, reviews and test accounts to the emulator |
| `npm run seed:remove` | Remove the sample salons from the real database |
| `npm run deploy:firestore` | Deploy Firestore rules and indexes |
| `npm run deploy:storage` | Deploy Storage rules |
| `npm run deploy:functions` | Deploy the notification functions |
| `npm run deploy:web` | Export the web version and deploy it to Firebase Hosting, together with the short-link function |

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

- `salons/{id}` — name, category, home salon or salon, address, `photos` (up to 8 image URLs, the first is the cover), location, services, staff, opening hours, days off (`closedDates`: `2026-10-12` for the whole salon, `2026-10-12_staffId` for one person), cancellation deadline, `flexibleHours` (hide the opening hours), `published` and rating totals. Anyone signed in can create a salon and becomes its `ownerId`. Only the owner can edit it, and never the rating totals, which are only updated together with a new review.
- `bookings/{id}` — one appointment. The customer can read it and cancel before the salon's deadline. The salon owner can read all appointments at the salon, cancel at any time (`cancelledBy: 'salon'`) and mark `noShow` once the appointment has started. Bookings on days off are rejected by the rules. A customer who signed in with SMS can only book with the number they verified. When the customer moves an appointment, the new booking has `replacesBookingId` and the old one is cancelled in the same transaction.
- `slots/{salonId_staffId_date_time}` — one 30-minute slot. Created in the same transaction as the booking and can never be overwritten, so two customers can't get the same time. Deleted when the customer or the salon cancels.
- `reviews/{bookingId}` — public. One per completed booking, written by the person who had the appointment.
- `users/{uid}` and `users/{uid}/favorites/{salonId}` — profile, notification settings (`reminders`, `salonEmails`) and favourites, private to the user.
- `pushTokens/{token}` — which user a device belongs to. Written by the app, only read by the server.
- `reminders/{bookingId}`, `sentNotifications/{key}` and `pushTickets/{id}` — used only by Cloud Functions. The app can't read or write them.

Photos are stored in Firebase Storage at `salons/{salonId}/{random}.jpg`. Anyone can view them. Only the salon's owner can upload (images under 5 MB) and delete them (`storage.rules`). Files are not cleaned up when an owner deletes their account.

Sample data uses photos from [Unsplash](https://unsplash.com) and fictional phone numbers.
