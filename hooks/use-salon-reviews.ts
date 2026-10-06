import { useEffect, useState } from 'react';
import { fetchSalonReviews, type Review } from '@/lib/reviews';

/** Siste anmeldelser for en salong. Hentes på nytt når antallet endrer seg (f.eks. etter en ny anmeldelse). */
export function useSalonReviews(salonId: string, reviewCount: number) {
  const key = `${salonId}_${reviewCount}`;
  const [state, setState] = useState<{ key: string; reviews: Review[]; error: boolean } | null>(null);

  useEffect(() => {
    let active = true;
    fetchSalonReviews(salonId)
      .then((reviews) => {
        if (active) setState({ key, reviews, error: false });
      })
      .catch((error) => {
        console.warn('Kunne ikke hente anmeldelser:', error);
        if (active) setState({ key, reviews: [], error: true });
      });
    return () => {
      active = false;
    };
  }, [salonId, key]);

  const current = state?.key === key ? state : null;
  return { reviews: current?.reviews ?? [], loading: current === null, error: current?.error ?? false };
}
