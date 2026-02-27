import { useState, useEffect } from 'react';

export function useFrontendReady(url: string = 'http://localhost:5173/', maxRetries = 5, delayMs = 1000) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let retries = 0;
    let cancelled = false;

    async function check() {
      while (retries < maxRetries && !cancelled) {
        try {
          const resp = await fetch(url);
          if (resp.ok) {
            setReady(true);
            return;
          }
        } catch {}
        retries++;
        await new Promise(r => setTimeout(r, delayMs));
      }
      if (!cancelled) {
        console.warn('Frontend never started, fallback UI will render.');
        setReady(false);
      }
    }

    check();

    return () => { cancelled = true; };
  }, [url, maxRetries, delayMs]);

  return ready;
}