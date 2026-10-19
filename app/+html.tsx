import type { ReactNode } from 'react';
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import { colors } from '@/constants/theme';

const TITLE = 'Bookzy – book time hos frisør, barber og negler';
const DESCRIPTION =
  'Book time hos salonger nær deg: frisør, barber, negler, massasje og hudpleie, også hjemmesalonger. Se ledige tider og book direkte.';
const APP_URL = (process.env.EXPO_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');

// Rot-HTML for alle sidene på nettet. Kjøres bare når nettversjonen eksporteres, ikke i nettleseren.
// Tittel og beskrivelse er det Google og lenkeforhåndsvisninger (Instagram, SMS, Messenger) viser.
export default function Root({ children }: { children: ReactNode }) {
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();

  return (
    <html {...htmlAttributes} lang="nb">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="theme-color" content={colors.surface} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Bookzy" />
        <meta property="og:locale" content="nb_NO" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        {APP_URL && <meta property="og:image" content={`${APP_URL}/icon.png`} />}
        <link rel="apple-touch-icon" href="/icon.png" />
        <ScrollViewStyleReset />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
