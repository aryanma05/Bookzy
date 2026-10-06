import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as Location from 'expo-location';
import type { GeoPoint } from '@/lib/salons';

type LocationStatus = 'unknown' | 'loading' | 'granted' | 'denied';

type LocationContextType = {
  coords: GeoPoint | null;
  status: LocationStatus;
  requestLocation: () => Promise<void>;
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

async function readPosition(): Promise<GeoPoint | null> {
  const last = await Location.getLastKnownPositionAsync().catch(() => null);
  const position = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  return { lat: position.coords.latitude, lng: position.coords.longitude };
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [coords, setCoords] = useState<GeoPoint | null>(null);
  const [status, setStatus] = useState<LocationStatus>('unknown');

  // Bruker posisjonen bare hvis brukeren allerede har gitt tillatelse – vi spør først når de ber om det.
  useEffect(() => {
    Location.getForegroundPermissionsAsync()
      .then(async (permission) => {
        if (!permission.granted) return;
        setStatus('granted');
        setCoords(await readPosition());
      })
      .catch(() => {});
  }, []);

  const requestLocation = async () => {
    setStatus('loading');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setStatus('denied');
        return;
      }
      setCoords(await readPosition());
      setStatus('granted');
    } catch (error) {
      console.warn('Kunne ikke hente posisjon:', error);
      setStatus('denied');
    }
  };

  return (
    <LocationContext.Provider value={{ coords, status, requestLocation }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation må brukes innenfor en LocationProvider');
  }
  return context;
}
