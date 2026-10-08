import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toSalon, type Salon } from '@/lib/salons';

type SalonsContextType = {
  /** Salonger som er publisert og synlige for kundene. */
  salons: Salon[];
  loading: boolean;
  error: boolean;
  retry: () => void;
  getSalon: (id: string) => Salon | undefined;
};

const SalonsContext = createContext<SalonsContextType | undefined>(undefined);

type SalonsState = { salons: Salon[]; error: boolean } | null;

export function SalonsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SalonsState>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Lytter live, så nye anmeldelser og endringer fra salongen vises med en gang
    return onSnapshot(
      collection(db, 'salons'),
      (snapshot) => {
        const salons = snapshot.docs
          .map((salon) => toSalon(salon.id, salon.data()))
          .sort((a, b) => a.name.localeCompare(b.name, 'nb'));
        setState({ salons, error: false });
      },
      (error) => {
        console.error('Kunne ikke hente salonger:', error);
        setState((current) => ({ salons: current?.salons ?? [], error: true }));
      }
    );
  }, [attempt]);

  const all = state?.salons ?? [];
  const salons = all.filter((salon) => salon.published);

  return (
    <SalonsContext.Provider
      value={{
        salons,
        loading: state === null,
        error: state?.error ?? false,
        retry: () => {
          setState(null);
          setAttempt((value) => value + 1);
        },
        // Finner også upubliserte, så eieren kan se siden sin før den publiseres
        getSalon: (id) => all.find((salon) => salon.id === id),
      }}
    >
      {children}
    </SalonsContext.Provider>
  );
}

export function useSalons() {
  const context = useContext(SalonsContext);
  if (context === undefined) {
    throw new Error('useSalons må brukes innenfor en SalonsProvider');
  }
  return context;
}
