import { ScrollView, StyleSheet, View } from 'react-native';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Text } from '@/components/ui/text';
import { colors, radius, shadows } from '@/constants/theme';

// Må være en adresse som faktisk tas imot. Henvendelser om innsyn og sletting skal besvares innen 30 dager.
const CONTACT_EMAIL = 'kontakt@bookzy.no';
const UPDATED = '19. oktober 2026';

const PRIVACY = [
  {
    title: 'Hvem som er ansvarlig',
    text: [
      'Bookzy er ansvarlig for kontoen din og opplysningene vi trenger for å drive tjenesten. Når du booker, får salongen navnet ditt, mobilnummeret og timen. Salongen er ansvarlig for hvordan de bruker kundeopplysningene sine, og Bookzy lagrer dem på vegne av salongen.',
      `Spørsmål om personvern sender du til ${CONTACT_EMAIL}.`,
    ],
  },
  {
    title: 'Hva vi lagrer',
    text: [
      'Konto: navn, e-postadresse eller mobilnummer. Passordet lagres kryptert av Google, og vi kan ikke se det.',
      'Timer: salong, behandling, hvem du skal til, tid, pris, navn, mobilnummer og beskjeden du skriver til salongen. Skriv bare det salongen trenger å vite.',
      'Favoritter og om du vil ha påminnelser og e-post.',
      'Anmeldelser: stjerner, kommentar og fornavnet ditt med forbokstaven i etternavnet. Anmeldelser er offentlige.',
      'Varsler i appen: en kode for mobilen din, så vi kan sende varsler dit.',
      'Posisjon: brukes bare på mobilen eller i nettleseren din for å vise salonger i nærheten. Vi lagrer den ikke.',
      'Bedrifter: navn, adresse eller område, telefon, tjenester, priser, ansatte og åpningstider. Dette vises på salongsiden. Eierens e-postadresse er ikke offentlig.',
    ],
  },
  {
    title: 'Hva vi bruker det til',
    text: [
      'For å gjennomføre bookingen og gi deg tjenesten du har bedt om (avtale, personvernforordningen art. 6 nr. 1 b): bekreftelser, endringer, avlysninger og påminnelser på e-post, SMS eller varsel. Påminnelser kan slås av under Profil.',
      'For å hindre misbruk, for eksempel med SMS-kode og en robotsjekk når du logger inn med mobilnummer (berettiget interesse, art. 6 nr. 1 f).',
      'Vi sender ikke reklame, selger ikke opplysninger og bruker ikke sporing eller analyseverktøy.',
    ],
  },
  {
    title: 'Hvem som får opplysningene',
    text: [
      'Salongen du booker hos.',
      'Leverandører som lagrer og sender for oss: Google Firebase (innlogging, database og servere, databasen og serverne står i EU), Google reCAPTCHA (robotsjekk ved SMS-kode), Resend (e-post), Sveve (SMS) og Expo (varsler i appen).',
      'Noen av leverandørene er amerikanske. Opplysninger som overføres til USA, er beskyttet av EU–US Data Privacy Framework eller EUs standardavtaler.',
    ],
  },
  {
    title: 'Hvor lenge vi lagrer',
    text: [
      'Kontoen, profilen og favorittene lagres til du sletter kontoen under Profil → Slett konto. Da slettes de med en gang.',
      'Timer du har hatt blir liggende i salongens kalender også etter at kontoen er slettet, fordi salongen trenger oversikt over kundene sine. Vil du ha dem slettet, kontakter du salongen eller oss.',
      'Anmeldelser blir liggende, uten kobling til kontoen din.',
    ],
  },
  {
    title: 'Lagring i nettleseren',
    text: [
      'Nettsiden lagrer innloggingen i nettleseren, så du slipper å logge inn hver gang. Når du får kode på SMS, bruker Google reCAPTCHA informasjonskapsler for å sjekke at du ikke er en robot. Vi bruker ingen informasjonskapsler til reklame eller statistikk.',
    ],
  },
  {
    title: 'Rettighetene dine',
    text: [
      `Du kan be om innsyn, retting, sletting eller å få opplysningene dine utlevert. Send e-post til ${CONTACT_EMAIL}, så svarer vi innen 30 dager.`,
      'Mener du at vi behandler opplysningene dine feil, kan du klage til Datatilsynet (datatilsynet.no).',
    ],
  },
];

const TERMS = [
  {
    title: 'For kunder',
    text: [
      'Bookzy formidler bookingen. Selve avtalen om behandlingen inngår du med salongen, og du betaler direkte til salongen. Salongen er ansvarlig for behandlingen, prisen og at timen blir holdt.',
      'Du kan flytte eller avbestille frem til salongens frist, som vises før du booker. Etter fristen må du kontakte salongen. Møter du ikke opp, kan salongen registrere det.',
      'Ikke book timer du ikke har tenkt å bruke, og ikke skriv anmeldelser som er usanne eller krenkende. Vi kan fjerne anmeldelser og stenge kontoer som misbruker Bookzy.',
    ],
  },
  {
    title: 'For bedrifter',
    text: [
      'Du er ansvarlig for at informasjonen på siden din er riktig, og for å holde timene kundene booker. Må du avlyse, gjør du det i kalenderen, så får kunden beskjed.',
      'Kundenes navn, mobilnummer og beskjed får du for å gjennomføre timen. Du kan ikke bruke dem til markedsføring uten at kunden har sagt ja til det.',
      'Det koster ingenting å bruke Bookzy nå. Innfører vi pris, får du beskjed på e-post minst 30 dager før, og vi tar ikke betalt uten at du har sagt ja.',
      'Du kan skjule siden eller slette kontoen når du vil.',
    ],
  },
  {
    title: 'Databehandleravtale',
    text: [
      'Når kunder booker hos deg, er du behandlingsansvarlig for kundeopplysningene, og Bookzy er databehandler. Dette avsnittet er databehandleravtalen mellom deg og Bookzy.',
      'Opplysningene gjelder kundene dine: navn, mobilnummer, e-postadresse for kunder med konto, timene og beskjeder til deg. Vi behandler dem bare for å drive bookingen, kalenderen og varslene, så lenge du bruker Bookzy.',
      'Vi holder opplysningene sikre og konfidensielle, bruker bare leverandørene som står i personvernerklæringen (og sier ifra før vi bytter), hjelper deg hvis en kunde ber om innsyn eller sletting, og varsler deg uten ugrunnet opphold hvis det skjer et sikkerhetsbrudd.',
      `Sletter du kontoen, sletter vi kundeopplysningene som hører til salongen din når du ber om det. Spørsmål sender du til ${CONTACT_EMAIL}.`,
    ],
  },
  {
    title: 'Ansvar og endringer',
    text: [
      'Vi jobber for at Bookzy skal virke hele tiden, men kan ikke love at det aldri blir feil eller nedetid. Så langt loven tillater, er vi ikke ansvarlige for tap som følge av dette, eller for feil i informasjon salongene legger inn.',
      'Endrer vi vilkårene vesentlig, sier vi ifra på e-post eller i Bookzy før endringen gjelder. Vilkårene følger norsk lov.',
    ],
  },
];

function Section({ title, text }: { title: string; text: string[] }) {
  return (
    <View style={styles.section}>
      <Text variant="subheading">{title}</Text>
      {text.map((paragraph) => (
        <Text key={paragraph} variant="body" color={colors.textSecondary}>{paragraph}</Text>
      ))}
    </View>
  );
}

export default function PrivacyScreen() {
  return (
    <View style={styles.screen}>
      <ScreenHeader title="Personvern og vilkår" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="caption">Sist oppdatert {UPDATED}</Text>

        <Text variant="title">Personvernerklæring</Text>
        <View style={styles.card}>
          {PRIVACY.map((section) => <Section key={section.title} {...section} />)}
        </View>

        <Text variant="title" style={styles.heading}>Vilkår for bruk</Text>
        <View style={styles.card}>
          {TERMS.map((section) => <Section key={section.title} {...section} />)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  heading: { marginTop: 16 },
  card: { borderRadius: radius.lg, backgroundColor: colors.surface, padding: 16, gap: 24, ...shadows.card },
  section: { gap: 8 },
});
