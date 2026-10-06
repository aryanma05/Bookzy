import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'timeflyt:hasSeenOnboarding';

type OnboardingContextType = {
  ready: boolean;
  hasSeenOnboarding: boolean;
  completeOnboarding: () => void;
};

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  // null = ikke lest fra lagringen ennå
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => setHasSeenOnboarding(value === 'true'))
      .catch(() => setHasSeenOnboarding(false));
  }, []);

  const completeOnboarding = () => {
    setHasSeenOnboarding(true);
    AsyncStorage.setItem(STORAGE_KEY, 'true').catch((error) => {
      console.warn('Kunne ikke lagre at onboarding er sett:', error);
    });
  };

  return (
    <OnboardingContext.Provider
      value={{
        ready: hasSeenOnboarding !== null,
        hasSeenOnboarding: hasSeenOnboarding === true,
        completeOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding må brukes innenfor en OnboardingProvider');
  }
  return context;
}
