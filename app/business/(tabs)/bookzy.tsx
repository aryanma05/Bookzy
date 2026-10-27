import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useBusiness } from '@/context/BusinessContext';

/** Fanen «Til Bookzy»: samme som «Bytt til kundemodus», så appen åpner på kundesiden neste gang også. */
export default function ToBookzyScreen() {
  const { setBusinessMode } = useBusiness();

  useEffect(() => {
    setBusinessMode(false);
  }, [setBusinessMode]);

  return <Redirect href="/explore" />;
}
