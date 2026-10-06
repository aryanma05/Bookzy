import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './AuthContext';

type FavoritesContextType = {
  favoriteIds: Set<string>;
  isFavorite: (salonId: string) => boolean;
  toggleFavorite: (salonId: string) => Promise<void>;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [snapshot, setSnapshot] = useState<{ uid: string; ids: Set<string> } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      collection(db, 'users', uid, 'favorites'),
      (result) => setSnapshot({ uid, ids: new Set(result.docs.map((favorite) => favorite.id)) }),
      (error) => console.warn('Kunne ikke hente favoritter:', error)
    );
  }, [uid]);

  const favoriteIds = uid && snapshot?.uid === uid ? snapshot.ids : new Set<string>();

  const toggleFavorite = async (salonId: string) => {
    if (!uid) throw new Error('Ikke innlogget');
    const ref = doc(db, 'users', uid, 'favorites', salonId);
    if (favoriteIds.has(salonId)) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, { createdAt: serverTimestamp() });
    }
  };

  return (
    <FavoritesContext.Provider
      value={{ favoriteIds, isFavorite: (salonId) => favoriteIds.has(salonId), toggleFavorite }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites må brukes innenfor en FavoritesProvider');
  }
  return context;
}
