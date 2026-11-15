import { useEffect, useState } from 'react';

/** Holds a message that clears itself after `ms` milliseconds; setting a new message restarts the countdown. */
export function useTimedMessage(ms: number): [string | null, (message: string | null) => void] {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), ms);
    return () => clearTimeout(timer);
  }, [message, ms]);

  return [message, setMessage];
}
