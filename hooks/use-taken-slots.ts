import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TakenSlots } from '@/lib/schedule';

type State = { key: string; taken: TakenSlots; error: boolean };

/** Lytter på opptatte luker for en salong på en dato, gruppert per ansatt. `taken` er null mens de lastes. */
export function useTakenSlots(salonId: string | null, dateKey: string) {
  const key = `${salonId}_${dateKey}`;
  const [state, setState] = useState<State | null>(null);

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
        const taken: TakenSlots = new Map();
        for (const slot of snapshot.docs) {
          const { staffId, time } = slot.data() as { staffId: string; time: string };
          if (!taken.has(staffId)) taken.set(staffId, new Set());
          taken.get(staffId)!.add(time);
        }
        setState({ key, taken, error: false });
      },
      (error) => {
        console.error('Kunne ikke hente opptatte tider:', error);
        setState({ key, taken: new Map(), error: true });
      }
    );
  }, [salonId, dateKey, key]);

  const current = state?.key === key ? state : null;
  return { taken: current?.taken ?? null, error: current?.error ?? false };
}
