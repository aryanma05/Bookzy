import type { Ionicons } from '@expo/vector-icons';
import type { DocumentData } from 'firebase/firestore';
import type { OpeningHours } from './schedule';

export type Service = {
  id: string;
  name: string;
  category: string;
  durationMin: number;
  priceNok: number;
  description?: string;
  /** Småbilde av tjenesten, lastet opp av eieren. */
  imageUrl?: string;
  /** Tilleggstjeneste: bookes ikke alene, men kan legges til en annen tjeneste. Tid og pris legges til timen. */
  addOn?: boolean;
};

export type StaffMember = {
  id: string;
  name: string;
  title: string;
};

export type GeoPoint = { lat: number; lng: number };

/** Hjemmesalong eller vanlig salong/studio. */
export type LocationType = 'home' | 'salon';

export type Salon = {
  id: string;
  ownerId: string | null;
  name: string;
  category: string;
  locationType: LocationType;
  address: string;
  area: string;
  description: string;
  phone: string | null;
  imageUrl: string | null;
  photos: string[];
  location: GeoPoint | null;
  rating: number | null;
  ratingSum: number;
  reviewCount: number;
  services: Service[];
  staff: StaffMember[];
  openingHours: OpeningHours;
  /** Fleksibel salong: kundene ser ingen åpningstider, bare ledige timer. Ukeplanen styrer fortsatt når de kan booke. */
  flexibleHours: boolean;
  /** «2026-10-12» = hele salongen er stengt, «2026-10-12_maria» = bare Maria har fri. */
  closedDates: string[];
  cancellationHours: number;
  /** Nye bedrifter er skjult for kundene til eieren publiserer siden. */
  published: boolean;
  /** Salongens egne vilkår, som kunden må godta før de booker. Tom = ingen. */
  terms: string;
  /** Eieren godkjenner hver booking selv. Kunden får adressen først når timen er godkjent. */
  requiresApproval: boolean;
  /** Tjenestene vises som en meny: kunden blar mellom gruppene i stedet for å se alt i én lang liste. */
  serviceMenu: boolean;
};

export function unsplash(photoId: string, width = 800) {
  return `https://images.unsplash.com/photo-${photoId}?w=${width}&q=75&auto=format&fit=crop`;
}

export const CATEGORIES: { name: string; icon: keyof typeof Ionicons.glyphMap; image: string }[] = [
  { name: 'Frisør', icon: 'cut-outline', image: unsplash('1580618672591-eb180b1a973f', 300) },
  { name: 'Barber', icon: 'man-outline', image: unsplash('1599351431202-1e0f0137899a', 300) },
  { name: 'Negler', icon: 'color-palette-outline', image: unsplash('1632345031435-8727f6897d53', 300) },
  { name: 'Vipper', icon: 'eye-outline', image: unsplash('1589710751893-f9a6770ad71b', 300) },
  { name: 'Massasje', icon: 'leaf-outline', image: unsplash('1600334089648-b0d9d3028eb2', 300) },
  { name: 'Hudpleie', icon: 'sparkles-outline', image: unsplash('1570172619644-dfd03ed5d881', 300) },
  { name: 'Voksing', icon: 'flower-outline', image: unsplash('1757689373248-a6cd07328ba5', 300) },
];

export const LOCATION_TYPES: { value: LocationType; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'home', label: 'Hjemme hos meg', description: 'Kundene kommer hjem til deg', icon: 'home-outline' },
  { value: 'salon', label: 'Salong eller studio', description: 'Eget lokale eller leid stol', icon: 'storefront-outline' },
];

/** Forslag til grupper i tjenestelisten, ut fra hva slags bedrift det er. */
export const SERVICE_GROUPS: Record<string, string[]> = {
  Frisør: ['Klipp', 'Farge', 'Styling'],
  Barber: ['Klipp', 'Skjegg'],
  Negler: ['Manikyr', 'Pedikyr', 'Negledesign'],
  Vipper: ['Extensions', 'Vippeløft', 'Bryn'],
  Massasje: ['Massasje'],
  Hudpleie: ['Ansikt', 'Øyne og bryn'],
  Voksing: ['Kropp', 'Ansikt'],
};

function isService(value: unknown): value is Service {
  const service = value as Partial<Service> | null;
  return (
    typeof service?.id === 'string' &&
    typeof service.name === 'string' &&
    typeof service.durationMin === 'number' &&
    typeof service.priceNok === 'number'
  );
}

function isStaffMember(value: unknown): value is StaffMember {
  const staff = value as Partial<StaffMember> | null;
  return typeof staff?.id === 'string' && typeof staff.name === 'string';
}

// Firestore-dokumenter har ingen garantert form, så vi fyller inn trygge standardverdier her.
export function toSalon(id: string, data: DocumentData): Salon {
  const ratingSum = typeof data.ratingSum === 'number' ? data.ratingSum : 0;
  const reviewCount = typeof data.reviewCount === 'number' ? data.reviewCount : 0;
  const photos: string[] = Array.isArray(data.photos) ? data.photos.filter((url: unknown) => typeof url === 'string') : [];
  const staff = Array.isArray(data.staff) ? data.staff.filter(isStaffMember) : [];

  return {
    id,
    ownerId: typeof data.ownerId === 'string' ? data.ownerId : null,
    name: data.name ?? 'Uten navn',
    category: data.category ?? '',
    locationType: data.locationType === 'home' ? 'home' : 'salon',
    address: data.address ?? '',
    area: data.area ?? '',
    description: data.description ?? '',
    phone: typeof data.phone === 'string' && data.phone ? data.phone : null,
    // Eksempelsalongene har også imageUrl, men forsidebildet eieren velger, er det første i photos
    imageUrl: photos[0] ?? data.imageUrl ?? null,
    photos: photos.length > 0 ? photos : data.imageUrl ? [data.imageUrl] : [],
    location:
      typeof data.location?.lat === 'number' && typeof data.location?.lng === 'number'
        ? { lat: data.location.lat, lng: data.location.lng }
        : null,
    rating: reviewCount > 0 ? ratingSum / reviewCount : null,
    ratingSum,
    reviewCount,
    services: Array.isArray(data.services)
      ? data.services.filter(isService).map((service: Service) => ({
          ...service,
          category: service.category ?? 'Behandlinger',
          imageUrl: typeof service.imageUrl === 'string' ? service.imageUrl : undefined,
          addOn: service.addOn === true ? true : undefined,
        }))
      : [],
    staff: staff.map((member) => ({ ...member, title: member.title ?? '' })),
    openingHours: data.openingHours ?? {},
    flexibleHours: data.flexibleHours === true,
    closedDates: Array.isArray(data.closedDates) ? data.closedDates.filter((key: unknown) => typeof key === 'string') : [],
    cancellationHours: typeof data.cancellationHours === 'number' ? data.cancellationHours : 24,
    // Salongene fra før feltet fantes, er synlige
    published: data.published !== false,
    terms: typeof data.terms === 'string' ? data.terms : '',
    requiresApproval: data.requiresApproval === true,
    serviceMenu: data.serviceMenu === true,
  };
}

/** «Negler hos Lina» → «negler-hos-lina». Samme regler som i seed-scriptet. */
export function slugify(text: string): string {
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

/** Kort tilfeldig ID til tjenester og ansatte. Brukes i luke-ID-er, så den har aldri understrek. */
export function shortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Adressen, eller bare området for hjemmesalonger som ikke vil vise hjemmeadressen. */
export function displayAddress(salon: Salon): string {
  return salon.address || salon.area;
}

export function groupServices(services: Service[]): { category: string; services: Service[] }[] {
  const groups = new Map<string, Service[]>();
  for (const service of services) {
    const list = groups.get(service.category) ?? [];
    list.push(service);
    groups.set(service.category, list);
  }
  return [...groups].map(([category, list]) => ({ category, services: list }));
}

/** Hele timen når kunden har lagt til tilleggstjenester: navnene etter hverandre, og tid og pris lagt sammen. */
export function withAddOns(service: Service, addOns: Service[]) {
  return {
    name: [service, ...addOns].map((item) => item.name).join(' + '),
    durationMin: addOns.reduce((sum, item) => sum + item.durationMin, service.durationMin),
    priceNok: addOns.reduce((sum, item) => sum + item.priceNok, service.priceNok),
  };
}

export function lowestPrice(salon: Salon): number | null {
  // Tilleggene kan ikke bookes alene, så de teller ikke som «fra»-pris
  const prices = salon.services.filter((service) => !service.addOn).map((service) => service.priceNok);
  return prices.length > 0 ? Math.min(...prices) : null;
}

export function formatPrice(priceNok: number): string {
  return `${priceNok.toLocaleString('nb-NO')} kr`;
}

export function formatDuration(durationMin: number): string {
  if (durationMin < 60) return `${durationMin} min`;
  const hours = Math.floor(durationMin / 60);
  const minutes = durationMin % 60;
  return minutes ? `${hours} t ${minutes} min` : `${hours} t`;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1).replace('.', ',');
}

export function formatCancellationPolicy(hours: number): string {
  if (hours <= 0) return 'Du kan avbestille helt frem til timen starter.';
  return `Gratis avbestilling og endring frem til ${hours} timer før timen.`;
}
