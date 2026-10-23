// Den korte bookinglenken (bookzy.no/negler-hos-lina). Nettversjonen er statiske sider, så Instagram, SMS og
// Messenger ser bare den samme tittelen og logoen for alle salonger. Her får lenken salongens navn og forsidebilde,
// og nettleseren sendes videre til salongsiden.
import type { DocumentData } from 'firebase-admin/firestore';
import { clean, escapeHtml } from './format';

export type SalonPreview = { id: string; name: string; text: string; image: string | null };

const isHttps = (value: unknown): value is string => typeof value === 'string' && value.startsWith('https://');

/** Det forhåndsvisningen viser, eller null hvis salongen ikke finnes eller er skjult. */
export function toPreview(id: string, data: DocumentData | undefined): SalonPreview | null {
  if (!data || data.published === false) return null;
  const photos: unknown[] = Array.isArray(data.photos) ? data.photos : [];
  const place = [clean(data.category, 40), clean(data.area, 60)].filter(Boolean).join(' · ');
  return {
    id,
    name: clean(data.name, 80) || 'Salong',
    // Området, ikke adressen – hjemmesalonger vil ikke ha hjemmeadressen i alle forhåndsvisninger
    text: clean(data.description, 160) || `${place ? `${place}. ` : ''}Se ledige timer og book direkte.`,
    image: photos.find(isHttps) ?? (isHttps(data.imageUrl) ? data.imageUrl : null),
  };
}

/**
 * Siden lenken viser. `link` er den korte lenken, `appUrl` adressen til nettversjonen.
 * `salon.id` må være sjekket med isDocId, siden den står i et skript.
 * Forhåndsvisningene kjører ikke JavaScript, så de leser taggene her. Nettlesere går videre til salongsiden.
 */
export function previewHtml(salon: SalonPreview, link: string, appUrl: string): string {
  const name = escapeHtml(salon.name);
  const text = escapeHtml(salon.text);
  const page = `/salon/${salon.id}`;
  const image = escapeHtml(salon.image ?? `${appUrl}/icon.png`);
  return `<!doctype html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name}</title>
<meta name="description" content="${text}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Bookzy">
<meta property="og:locale" content="nb_NO">
<meta property="og:title" content="${name}">
<meta property="og:description" content="${text}">
<meta property="og:url" content="${escapeHtml(link)}">
<meta property="og:image" content="${image}">
<meta name="twitter:card" content="${salon.image ? 'summary_large_image' : 'summary'}">
<link rel="canonical" href="${escapeHtml(`${appUrl}${page}`)}">
<script>location.replace(${JSON.stringify(page)} + location.search)</script>
</head>
<body><p><a href="${page}">Gå til ${name}</a></p></body>
</html>`;
}
