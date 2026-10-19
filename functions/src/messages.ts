// Innholdet i varslene. Alt som kommer fra brukerne, er renset før det havner her (se booking.ts),
// og escapes når det settes inn i HTML.
import { endTime, escapeHtml, firstName, formatDate, formatDateTime, formatPrice, relativeDate, shortName } from './format';

export type BookingInfo = {
  id: string;
  customerName: string;
  customerPhone: string;
  note: string;
  salonName: string;
  salonPhone: string;
  /** Adressen, eller bare området for hjemmesalonger. */
  salonPlace: string;
  serviceName: string;
  staffName: string;
  priceNok: number;
  durationMin: number;
  date: string;
  time: string;
  cancellableUntil: Date | null;
};

export type Push = { title: string; body: string };
export type Email = { subject: string; text: string; html: string };

type Row = [label: string, value: string];

const BRAND = '#2999D9';

function when(booking: BookingInfo): string {
  return `${formatDate(booking.date)} kl ${booking.time}`;
}

function timeRange(booking: BookingInfo): string {
  return `${formatDate(booking.date)} kl ${booking.time}–${endTime(booking.time, booking.durationMin)}`;
}

function layout({
  greeting,
  intro,
  rows = [],
  paragraphs = [],
  link,
  footer,
}: {
  greeting?: string;
  intro: string;
  rows?: Row[];
  paragraphs?: string[];
  link?: { label: string; url: string };
  footer: string;
}): { text: string; html: string } {
  const visibleRows = rows.filter(([, value]) => value);

  const text = [
    greeting,
    intro,
    visibleRows.map(([label, value]) => `${label}: ${value}`).join('\n'),
    ...paragraphs,
    link ? `${link.label}: ${link.url}` : '',
    '--',
    footer,
  ]
    .filter(Boolean)
    .join('\n\n');

  const paragraph = (content: string) =>
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;color:#1A2B3C">${escapeHtml(content).replace(/\n/g, '<br>')}</p>`;

  const table = visibleRows.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 20px;border-collapse:collapse">${visibleRows
        .map(
          ([label, value]) =>
            `<tr><td style="padding:8px 12px 8px 0;font-size:14px;color:#6B7A8A;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>` +
            `<td style="padding:8px 0;font-size:14px;color:#1A2B3C;font-weight:600">${escapeHtml(value).replace(/\n/g, '<br>')}</td></tr>`
        )
        .join('')}</table>`
    : '';

  const button = link
    ? `<p style="margin:8px 0 24px"><a href="${escapeHtml(link.url)}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:${BRAND};color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none">${escapeHtml(link.label)}</a></p>`
    : '';

  const html = `<!doctype html>
<html lang="nb">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F4F7FA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<p style="margin:0 0 20px;font-size:20px;font-weight:800;color:${BRAND}">Bookzy</p>
<div style="background:#FFFFFF;border-radius:14px;padding:24px">
${greeting ? paragraph(greeting) : ''}${paragraph(intro)}${table}${paragraphs.map(paragraph).join('')}${button}
</div>
<p style="margin:16px 4px 0;font-size:12px;line-height:1.5;color:#8A97A6">${escapeHtml(footer)}</p>
</div>
</body>
</html>`;

  return { text, html };
}

function bookingRows(booking: BookingInfo): Row[] {
  return [
    ['Tid', timeRange(booking)],
    ['Behandling', booking.serviceName],
    ['Hos', booking.staffName],
    ['Pris', `${formatPrice(booking.priceNok)}, betales i salongen`],
    ['Sted', booking.salonPlace],
  ];
}

function customerFooter(booking: BookingInfo) {
  return `Du får denne e-posten fordi du har booket time hos ${booking.salonName} med Bookzy.`;
}

const SALON_FOOTER =
  'Du får denne e-posten fordi du har en bedrift på Bookzy. E-post om bookinger slår du av under Salongen → Varsler i appen.';

// ---- Til kunden ----

export function bookingReceipt(booking: BookingInfo, now: Date, link: string | null, moved?: BookingInfo): Email {
  const deadline =
    booking.cancellableUntil && booking.cancellableUntil.getTime() > now.getTime()
      ? `Du kan flytte eller avbestille timen i appen frem til ${formatDateTime(booking.cancellableUntil)}.`
      : 'Fristen for å flytte eller avbestille i appen har gått ut.';
  const call = booking.salonPhone ? ` Skulle noe skje, ring salongen på ${booking.salonPhone}.` : '';

  return {
    subject: moved
      ? `Timen er flyttet til ${when(booking)}`
      : `Bekreftet: ${booking.serviceName} ${when(booking)}`,
    ...layout({
      greeting: booking.customerName ? `Hei ${firstName(booking.customerName)},` : undefined,
      intro: moved
        ? `Timen din hos ${booking.salonName} er flyttet fra ${when(moved)} til ny tid.`
        : `Timen din hos ${booking.salonName} er bekreftet.`,
      rows: bookingRows(booking),
      paragraphs: [deadline + call],
      link: link ? { label: 'Se timen', url: link } : undefined,
      footer: customerFooter(booking),
    }),
  };
}

export function cancelledByCustomerReceipt(booking: BookingInfo): Email {
  return {
    subject: `Avbestilt: ${booking.serviceName} ${when(booking)}`,
    ...layout({
      greeting: booking.customerName ? `Hei ${firstName(booking.customerName)},` : undefined,
      intro: `Du har avbestilt timen hos ${booking.salonName} ${when(booking)}. Du trenger ikke gjøre noe mer.`,
      rows: [
        ['Behandling', booking.serviceName],
        ['Hos', booking.staffName],
      ],
      footer: customerFooter(booking),
    }),
  };
}

export function cancelledBySalonPush(booking: BookingInfo, now: Date): Push {
  return {
    title: 'Timen er avlyst',
    body: `${booking.salonName} har avlyst ${booking.serviceName} ${relativeDate(booking.date, now)} kl ${booking.time}.`,
  };
}

export function cancelledBySalonEmail(booking: BookingInfo, link: string | null): Email {
  const call = booking.salonPhone ? ` Lurer du på noe, kan du ringe salongen på ${booking.salonPhone}.` : '';
  return {
    subject: `Avlyst: ${booking.serviceName} ${when(booking)}`,
    ...layout({
      greeting: booking.customerName ? `Hei ${firstName(booking.customerName)},` : undefined,
      intro: `${booking.salonName} har dessverre avlyst timen din ${when(booking)}.`,
      rows: [
        ['Behandling', booking.serviceName],
        ['Hos', booking.staffName],
      ],
      paragraphs: [`Du kan booke en ny tid i appen.${call}`],
      link: link ? { label: 'Book ny tid', url: link } : undefined,
      footer: customerFooter(booking),
    }),
  };
}

export function reminderPush(booking: BookingInfo, now: Date): Push {
  return {
    title: 'Påminnelse om time',
    body: `${booking.serviceName} hos ${booking.salonName} ${relativeDate(booking.date, now)} kl ${booking.time}.`,
  };
}

export function reminderEmail(booking: BookingInfo, now: Date, link: string | null): Email {
  const day = relativeDate(booking.date, now);
  const call = booking.salonPhone ? ` Kommer du ikke, ring salongen på ${booking.salonPhone}.` : '';
  return {
    subject: `Påminnelse: ${booking.serviceName} ${day} kl ${booking.time}`,
    ...layout({
      greeting: booking.customerName ? `Hei ${firstName(booking.customerName)},` : undefined,
      intro: `Husk timen din hos ${booking.salonName} ${day} kl ${booking.time}.`,
      rows: bookingRows(booking),
      paragraphs: call ? [call.trim()] : [],
      link: link ? { label: 'Se timen', url: link } : undefined,
      footer: `${customerFooter(booking)} Påminnelser slår du av under Profil i appen.`,
    }),
  };
}

// ---- SMS til kunder som har booket med bare mobilnummer ----
// Korte og uten tegn utenfor SMS-alfabetet (som tankestrek), så de helst får plass i én SMS på 160 tegn.

function sms(...parts: (string | false | null)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function bookingSms(booking: BookingInfo, link: string | null, moved?: BookingInfo): string {
  return sms(
    `${moved ? 'Flyttet' : 'Bekreftet'}: ${booking.serviceName} hos ${booking.salonName} ${when(booking)}.`,
    link && `Se timen: ${link}`
  );
}

export function cancelledBySalonSms(booking: BookingInfo, link: string | null): string {
  return sms(
    `${booking.salonName} har avlyst ${booking.serviceName} ${when(booking)}.`,
    booking.salonPhone && `Lurer du på noe, ring ${booking.salonPhone}.`,
    link && `Book ny tid: ${link}`
  );
}

export function reminderSms(booking: BookingInfo, now: Date, link: string | null): string {
  return sms(
    `Påminnelse: ${booking.serviceName} hos ${booking.salonName} ${relativeDate(booking.date, now)} kl ${booking.time}.`,
    booking.salonPhone && `Kommer du ikke, ring ${booking.salonPhone}.`,
    link && `Se timen: ${link}`
  );
}

// ---- Til salongen ----

export function newBookingPush(booking: BookingInfo, now: Date, moved?: BookingInfo): Push {
  const customer = shortName(booking.customerName);
  if (moved) {
    return {
      title: 'Time flyttet',
      body: `${customer} har flyttet ${booking.serviceName} fra ${formatDate(moved.date)} kl ${moved.time} til ${relativeDate(booking.date, now)} kl ${booking.time}.`,
    };
  }
  return {
    title: 'Ny booking',
    body: `${customer} har booket ${booking.serviceName} ${relativeDate(booking.date, now)} kl ${booking.time}.`,
  };
}

export function newBookingEmail(booking: BookingInfo, link: string | null, moved?: BookingInfo): Email {
  const customer = booking.customerName || 'En kunde';
  return {
    subject: moved
      ? `Flyttet: ${customer}, ${when(booking)}`
      : `Ny booking: ${customer}, ${when(booking)}`,
    ...layout({
      intro: moved
        ? `${customer} har flyttet timen sin fra ${when(moved)}. Den gamle tiden er ledig igjen.`
        : `${customer} har booket time hos deg.`,
      rows: [
        ['Tid', timeRange(booking)],
        ['Behandling', booking.serviceName],
        ['Hos', booking.staffName],
        ['Kunde', customer],
        ['Telefon', booking.customerPhone],
        ['Beskjed', booking.note],
      ],
      link: link ? { label: 'Åpne i kalenderen', url: link } : undefined,
      footer: SALON_FOOTER,
    }),
  };
}

export function cancelledByCustomerPush(booking: BookingInfo, now: Date): Push {
  return {
    title: 'Avbestilling',
    body: `${shortName(booking.customerName)} har avbestilt ${booking.serviceName} ${relativeDate(booking.date, now)} kl ${booking.time}. Tiden er ledig igjen.`,
  };
}

export function cancelledByCustomerEmail(booking: BookingInfo, link: string | null): Email {
  const customer = booking.customerName || 'En kunde';
  return {
    subject: `Avbestilt: ${customer}, ${when(booking)}`,
    ...layout({
      intro: `${customer} har avbestilt timen ${when(booking)}. Tiden er ledig for andre kunder igjen.`,
      rows: [
        ['Behandling', booking.serviceName],
        ['Hos', booking.staffName],
        ['Telefon', booking.customerPhone],
      ],
      link: link ? { label: 'Åpne i kalenderen', url: link } : undefined,
      footer: SALON_FOOTER,
    }),
  };
}
