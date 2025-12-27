// packages/ai-mentor/src/hooks/useTelegramWebApp.ts

import { useEffect, useState } from 'react';

export function useTelegramWebApp() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramWebApp['initDataUnsafe']['user'] | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    
    if (tg) {
      setWebApp(tg);
      setUser(tg.initDataUnsafe.user || null);
      
      tg.ready();
      tg.expand();
    }
  }, []);

  return {
    webApp,
    user,
    isInTelegram: !!webApp,
    platform: webApp?.platform,
    colorScheme: webApp?.colorScheme,
  };
}