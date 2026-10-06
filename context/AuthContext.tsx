import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/auth';

type AuthContextType = {
  user: User | null;
  displayName: string | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setDisplayName(nextUser?.displayName ?? null);
      setInitializing(false);
    });
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const signUp = async (name: string, email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(credential.user, { displayName: name.trim() });
    // updateProfile endrer brukerobjektet uten å varsle onAuthStateChanged, så navnet settes her.
    setDisplayName(name.trim());
  };

  const signOut = () => firebaseSignOut(auth);

  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email.trim());

  return (
    <AuthContext.Provider
      value={{ user, displayName, initializing, signIn, signUp, signOut, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth må brukes innenfor en AuthProvider');
  }
  return context;
}

export function authErrorMessage(error: unknown): string {
  switch ((error as { code?: string } | null)?.code) {
    case 'auth/invalid-email':
      return 'E-postadressen er ikke gyldig.';
    case 'auth/missing-password':
      return 'Skriv inn passordet ditt.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Feil e-post eller passord.';
    case 'auth/email-already-in-use':
      return 'Det finnes allerede en konto med denne e-postadressen.';
    case 'auth/weak-password':
      return 'Passordet må være minst 6 tegn.';
    case 'auth/too-many-requests':
      return 'For mange forsøk. Vent litt og prøv igjen.';
    case 'auth/network-request-failed':
      return 'Ingen nettverksforbindelse. Prøv igjen.';
    case 'auth/operation-not-allowed':
      return 'Innlogging med e-post er ikke slått på i Firebase-prosjektet ennå.';
    default:
      return 'Noe gikk galt. Prøv igjen.';
  }
}
