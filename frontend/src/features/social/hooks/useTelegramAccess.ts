import { useState, useEffect } from 'react';
import axios from 'axios';
import { useMentorAccess } from '@/features/ai-mentor/hooks/useMentorAccess';

export function useTelegramAccess() {
  const { canAccessAll, isPaid } = useMentorAccess();
  const [link, setLink] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState<number>(0);
  const [isVerified, setVerified] = useState(false);

  // Генеруємо Telegram link
  const generateLink = async () => {
    if (!canAccessAll) return;
    const res = await axios.get('/api/social/telegram/link');
    setLink(res.data.link);
    setExpiresIn(res.data.expiresIn);
  };

  // Верифікація коду від користувача
  const verifyCode = async (code: string) => {
    try {
      const res = await axios.post('/api/social/telegram/verify', { code });
      if (res.data.success) setVerified(true);
      return res.data;
    } catch {
      setVerified(false);
      return null;
    }
  };

  return {
    canAccessAll,
    isPaid,
    link,
    expiresIn,
    isVerified,
    generateLink,
    verifyCode,
  };
}
