import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

type TakenTimes = { key: string; times: Set<string>; error: boolean };

/** Lytter på opptatte luker for en salong på en dato. `times` er null mens de lastes. */
export function useTakenTimes(salonId: string | null, dateKey: string) {
  const key = `${salonId}_${dateKey}`;
  const [state, setState] = useState<TakenTimes | null>(null);

  useEffect(() => {
    if (!salonId) return;

    const slotsQuery = query(
      collection(db, 'slots'),
      where('salonId', '==', salonId),
      where('date', '==', dateKey)
    );

    return onSnapshot(
      slotsQuery,
      (snapshot) => {
        const times = new Set(snapshot.docs.map((slot) => slot.data().time as string));
        setState({ key, times, error: false });
      },
      (error) => {
        console.error('Kunne ikke hente opptatte tider:', error);
        setState({ key, times: new Set(), error: true });
      }
    );
  }, [salonId, dateKey, key]);

  const current = state?.key === key ? state : null;
  return { times: current?.times ?? null, error: current?.error ?? false };
}
