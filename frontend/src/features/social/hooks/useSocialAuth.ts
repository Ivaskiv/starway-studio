// frontend/src/features/social/hooks/useSocialAuth.ts
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { SocialPlatform } from '../types/social.types';
import { getSocialPlatformMetadata } from '../constants/social.constants';

export function useSocialAuth() {
  const navigate = useNavigate();

  const login = (provider: SocialPlatform) => {
    const metadata = getSocialPlatformMetadata(provider);
    
    if (!metadata?.authUrl) {
      toast.error(`Авторизація через ${provider} не підтримується`);
      return;
    }

    window.location.href = metadata.authUrl;
  };

  return {
    login,
    isLoading: false, // якщо потрібен loading — додай useMutation
  };
}