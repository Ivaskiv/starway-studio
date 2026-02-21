// frontend/src/features/social/hooks/useSocialAuth.ts
import toast from 'react-hot-toast';
import { getSocialPlatformMetadata, type SocialPlatform } from '../types/social.types';

export function useSocialAuth() {

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