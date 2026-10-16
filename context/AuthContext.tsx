import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs, onSnapshot, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { auth } from '@/lib/auth';
import { db } from '@/lib/firebase';
import { unregisterPush } from '@/lib/push';

export type Profile = { name: string; phone: string };

/** Lagres i users/{uid} og leses av serveren. Mangler et felt, er det slått på. */
export type Preferences = { reminders: boolean; salonEmails: boolean };

const DEFAULT_PREFERENCES: Preferences = { reminders: true, salonEmails: true };

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  displayName: string;
  preferences: Preferences;
  /** Vi sender bare e-post til bekreftede adresser. */
  emailVerified: boolean;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { name: string; email: string; password: string; phone: string }) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  saveProfile: (profile: Profile) => Promise<void>;
  savePreferences: (changes: Partial<Preferences>) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  /** Sjekker på nytt om brukeren har trykket på lenken i e-posten. */
  refreshEmailVerified: () => Promise<boolean>;
  reauthenticate: (password: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type ProfileSnapshot = { uid: string; profile: Profile | null; preferences: Preferences };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authName, setAuthName] = useState<string | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [profileSnapshot, setProfileSnapshot] = useState<ProfileSnapshot | null>(null);
  const uid = user?.uid ?? null;

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthName(nextUser?.displayName ?? null);
      setEmailVerified(nextUser?.emailVerified ?? false);
      setInitializing(false);
    });
  }, []);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(db, 'users', uid),
      (snapshot) => {
        const data = snapshot.data();
        setProfileSnapshot({
          uid,
          profile: data ? { name: data.name ?? '', phone: data.phone ?? '' } : null,
          preferences: { reminders: data?.reminders !== false, salonEmails: data?.salonEmails !== false },
        });
      },
      (error) => console.warn('Kunne ikke hente profil:', error)
    );
  }, [uid]);

  const currentSnapshot = uid && profileSnapshot?.uid === uid ? profileSnapshot : null;
  const profile = currentSnapshot?.profile ?? null;
  const preferences = currentSnapshot?.preferences ?? DEFAULT_PREFERENCES;
  const displayName = profile?.name || authName || user?.email?.split('@')[0] || '';

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const signUp = async ({ name, email, password, phone }: { name: string; email: string; password: string; phone: string }) => {
    const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(credential.user, { displayName: name.trim() });
    // updateProfile varsler ikke onAuthStateChanged, så navnet settes her.
    setAuthName(name.trim());
    await setDoc(doc(db, 'users', credential.user.uid), {
      name: name.trim(),
      phone: phone.trim(),
      updatedAt: serverTimestamp(),
    }).catch((error) => console.warn('Kunne ikke lagre profil:', error));
    sendEmailVerification(credential.user).catch((error) => console.warn('Kunne ikke sende bekreftelse:', error));
  };

  const signOut = async () => {
    await unregisterPush();
    await firebaseSignOut(auth);
  };

  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email.trim());

  const saveProfile = async ({ name, phone }: Profile) => {
    if (!user) throw new Error('Ikke innlogget');
    // merge, så innstillingene for varsler blir liggende
    await setDoc(doc(db, 'users', user.uid), { name: name.trim(), phone: phone.trim(), updatedAt: serverTimestamp() }, { merge: true });
    if (name.trim() !== user.displayName) {
      await updateProfile(user, { displayName: name.trim() });
      setAuthName(name.trim());
    }
  };

  const savePreferences = async (changes: Partial<Preferences>) => {
    if (!user) throw new Error('Ikke innlogget');
    await setDoc(doc(db, 'users', user.uid), { ...changes, updatedAt: serverTimestamp() }, { merge: true });
  };

  const sendVerificationEmail = async () => {
    if (!user) throw new Error('Ikke innlogget');
    await sendEmailVerification(user);
  };

  const refreshEmailVerified = async () => {
    if (!user) return false;
    await reload(user);
    setEmailVerified(user.emailVerified);
    return user.emailVerified;
  };

  const reauthenticate = async (password: string) => {
    if (!user?.email) throw new Error('Ikke innlogget');
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  };

  // Kall reauthenticate først – Firebase krever nylig innlogging for å slette en konto.
  const deleteAccount = async () => {
    if (!user) return;
    const favorites = await getDocs(collection(db, 'users', user.uid, 'favorites'));
    const batch = writeBatch(db);
    favorites.forEach((favorite) => batch.delete(favorite.ref));
    await batch.commit();
    await deleteDoc(doc(db, 'users', user.uid));
    await unregisterPush();
    await deleteUser(user);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        displayName,
        preferences,
        emailVerified,
        initializing,
        signIn,
        signUp,
        signOut,
        resetPassword,
        saveProfile,
        savePreferences,
        sendVerificationEmail,
        refreshEmailVerified,
        reauthenticate,
        deleteAccount,
      }}
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
    case 'auth/requires-recent-login':
      return 'Av sikkerhetshensyn må du logge inn på nytt før du gjør dette.';
    case 'auth/operation-not-allowed':
      return 'Innlogging med e-post er ikke slått på i Firebase-prosjektet ennå.';
    default:
      return 'Noe gikk galt. Prøv igjen.';
  }
}

/** «Kari Nordmann» → «Kari N.» – slik navn vises på offentlige anmeldelser. */
export function publicName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Kunde';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}
