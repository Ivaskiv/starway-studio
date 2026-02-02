// frontend/src/features/social/constants/social.constants.ts
import type { SocialPlatform, SocialPlatformMetadata } from '../types/social.types';

export const SOCIAL_PLATFORMS_METADATA: Record<SocialPlatform, SocialPlatformMetadata> = {
  google: {
    id: 'google',
    name: 'Google',
    iconName: 'google',
    iconPath: '/icons/google.svg',
    color: '#4285F4',
    gradient: 'linear-gradient(135deg, #4285F4 0%, #34A853 50%, #FBBC05 100%)',
    authUrl: '/api/auth/google',
  },
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    iconName: 'telegram-app-100',
    iconPath: '/icons/telegram.svg',
    color: '#0088cc',
    gradient: 'linear-gradient(135deg, #0088cc 0%, #00aaff 100%)',
    authUrl: '/api/auth/telegram',
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    iconName: 'instagram',
    iconPath: '/icons/instagram.svg',
    color: '#E4405F',
    gradient: 'linear-gradient(135deg, #405DE6, #5851DB, #833AB4, #C13584, #E1306C, #FD1D1D)',
    authUrl: '/api/auth/instagram',
  },
} as const;

export const getSocialPlatformMetadata = (platform: SocialPlatform) => SOCIAL_PLATFORMS_METADATA[platform];
export const SOCIAL_PLATFORMS = Object.keys(SOCIAL_PLATFORMS_METADATA) as readonly SocialPlatform[];