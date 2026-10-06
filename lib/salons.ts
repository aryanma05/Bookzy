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
};

export type StaffMember = {
  id: string;
  name: string;
  title: string;
};

export type GeoPoint = { lat: number; lng: number };

export type Salon = {
  id: string;
  name: string;
  category: string;
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
  cancellationHours: number;
};

export function unsplash(photoId: string, width = 800) {
  return `https://images.unsplash.com/photo-${photoId}?w=${width}&q=75&auto=format&fit=crop`;
}

export const CATEGORIES: { name: string; icon: keyof typeof Ionicons.glyphMap; image: string }[] = [
  { name: 'Frisør', icon: 'cut-outline', image: unsplash('1580618672591-eb180b1a973f', 300) },
  { name: 'Barber', icon: 'man-outline', image: unsplash('1599351431202-1e0f0137899a', 300) },
  { name: 'Negler', icon: 'color-palette-outline', image: unsplash('1632345031435-8727f6897d53', 300) },
  { name: 'Massasje', icon: 'leaf-outline', image: unsplash('1600334089648-b0d9d3028eb2', 300) },
  { name: 'Hudpleie', icon: 'sparkles-outline', image: unsplash('1570172619644-dfd03ed5d881', 300) },
  { name: 'Voksing', icon: 'flower-outline', image: unsplash('1757689373248-a6cd07328ba5', 300) },
];

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
    name: data.name ?? 'Uten navn',
    category: data.category ?? '',
    address: data.address ?? '',
    area: data.area ?? '',
    description: data.description ?? '',
    phone: typeof data.phone === 'string' && data.phone ? data.phone : null,
    imageUrl: data.imageUrl ?? photos[0] ?? null,
    photos: photos.length > 0 ? photos : data.imageUrl ? [data.imageUrl] : [],
    location:
      typeof data.location?.lat === 'number' && typeof data.location?.lng === 'number'
        ? { lat: data.location.lat, lng: data.location.lng }
        : null,
    rating: reviewCount > 0 ? ratingSum / reviewCount : null,
    ratingSum,
    reviewCount,
    services: Array.isArray(data.services)
      ? data.services.filter(isService).map((service: Service) => ({ ...service, category: service.category ?? 'Behandlinger' }))
      : [],
    staff: staff.map((member) => ({ ...member, title: member.title ?? '' })),
    openingHours: data.openingHours ?? {},
    cancellationHours: typeof data.cancellationHours === 'number' ? data.cancellationHours : 24,
  };
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

export function lowestPrice(salon: Salon): number | null {
  if (salon.services.length === 0) return null;
  return Math.min(...salon.services.map((service) => service.priceNok));
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
