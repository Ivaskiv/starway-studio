// frontend/src/constants/socialPlatforms.ts
// // ============ CORE TYPES ============

export const SOCIAL_PLATFORMS = [
  'app',
  'telegram',
  // 'viber',
  // 'whatsapp',
  'instagram',
  // 'facebook',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface SocialPlatformMetadata {
  id: SocialPlatform;
  name: string;
  // icon: string;
  gradient: string;
  color: string;
  iconName: string;
}

export const SOCIAL_PLATFORM_METADATA = {
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    color: '#0088cc',
    gradient: 'from-blue-500 to-cyan-500',
    iconName: 'icons8-telegram-app-100',
  },
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    color: '#25D366',
    gradient: 'from-green-500 to-emerald-500',
    iconName: 'icons8-whatsapp-100',
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    color: '#E4405F',
    gradient: 'from-pink-500 via-purple-500 to-yellow-500',
    iconName: 'icons8-instagram-100',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    gradient: 'from-blue-600 to-blue-400',
    iconName: 'icons8-facebook-100',
  },
  app: {
    id: 'app',
    name: 'Google',
    iconName: 'icons8-google-100',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    iconName: 'icons8-tiktok-100',
  },
} as const

export const getSocialPlatformMetadata = (platform: SocialPlatform) => SOCIAL_PLATFORM_METADATA[platform];
export const isSocialPlatform = (value: string): value is SocialPlatform => SOCIAL_PLATFORMS.includes(value as SocialPlatform);
export const getIconPath = (iconName: string) => `/icons/${iconName}.svg`;
