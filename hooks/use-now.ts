import { useEffect, useState } from 'react';

/** Nåværende tidspunkt, oppdatert jevnlig slik at passerte tider forsvinner av seg selv. */
export function useNow(intervalMs = 60_000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
