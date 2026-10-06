import type { DocumentData } from 'firebase/firestore';
import type { OpeningHours } from './schedule';

export type Service = {
  id: string;
  name: string;
  durationMin: number;
  priceNok: number;
};

export type Salon = {
  id: string;
  name: string;
  category: string;
  address: string;
  imageUrl: string | null;
  rating: number | null;
  reviewCount: number;
  services: Service[];
  openingHours: OpeningHours;
};

export const CATEGORIES = ['Frisør', 'Massasje', 'Negler', 'Hudpleie', 'Voksing'];

function isService(value: unknown): value is Service {
  const service = value as Partial<Service> | null;
  return (
    typeof service?.id === 'string' &&
    typeof service.name === 'string' &&
    typeof service.durationMin === 'number' &&
    typeof service.priceNok === 'number'
  );
}

// Firestore-dokumenter har ingen garantert form, så vi fyller inn trygge standardverdier her.
export function toSalon(id: string, data: DocumentData): Salon {
  return {
    id,
    name: data.name ?? 'Uten navn',
    category: data.category ?? '',
    address: data.address ?? '',
    imageUrl: data.imageUrl ?? null,
    rating: typeof data.rating === 'number' ? data.rating : null,
    reviewCount: typeof data.reviewCount === 'number' ? data.reviewCount : 0,
    services: Array.isArray(data.services) ? data.services.filter(isService) : [],
    openingHours: data.openingHours ?? {},
  };
}

export function formatPrice(priceNok: number): string {
  return `${priceNok} kr`;
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
