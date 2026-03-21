// frontend/src/features/social/types/social.types.ts
// всі можливі (іконки, дизайн, майбутнє)
export type SocialPlatform =
  | 'telegram'
  | 'google'
  | 'instagram'
  | 'facebook'
  | 'whatsapp'
  | 'twitter'
  | 'linkedin'
  | 'tiktok';

// реально доступні для auth ЗАРАЗ
export type EnabledSocialPlatform =
  | 'telegram'
  | 'google';

export type SocialPlatformAuthUrl = Record<SocialPlatform, string>;

export interface SocialPlatformMetadata {
  id: SocialPlatform;
  name: string;
  iconName: string;
  iconPath: string;
  color: string;
  gradient: string;
  authUrl: string;
}


export const SOCIAL_PLATFORMS_METADATA: Record<
  SocialPlatform,
  SocialPlatformMetadata
> = {  
   facebook: { 
    id: 'facebook',
    name: 'Facebook',
    iconName: 'facebook',
    iconPath: '/icons/facebook.svg',
    color: '#1877F2',
    gradient: 'linear-gradient(135deg, #1877F2 0%, #1877F2 50%, #1877F2 100%)',
    authUrl: '/api/auth/facebook',
  },
  twitter: {
    id: 'twitter',
    name: 'Twitter',
    iconName: 'twitter',
    iconPath: '/icons/twitter.svg',
    color: '#1DA1F2',
    gradient: 'linear-gradient(135deg, #1DA1F2 0%, #1DA1F2 50%, #1DA1F2 100%)',
    authUrl: '/api/auth/twitter',

  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    iconName: 'linkedin',
    iconPath: '/icons/linkedin.svg',
    color: '#0077B5',
    gradient: 'linear-gradient(135deg, #0077B5 0%, #0077B5 50%, #0077B5 100%)',
    authUrl: '/api/auth/linkedin',
  },
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    iconName: 'whatsapp',
    iconPath: '/icons/whatsapp.svg',
    color: '#25D366',
    gradient: 'linear-gradient(135deg, #25D366 0%, #25D366 50%, #25D366 100%)',
    authUrl: '/api/auth/whatsapp',
  },
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
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    iconName: 'tiktok',
    iconPath: '/icons/tiktok.svg',
    color: '#000000',
    gradient: 'linear-gradient(135deg, #000000 0%, #000000 100%)',
    authUrl: '/api/auth/tiktok',
  }
} as const;

export const getSocialPlatformMetadata = (platform: SocialPlatform) => SOCIAL_PLATFORMS_METADATA[platform];
export const ENABLED_SOCIAL_PLATFORMS: readonly EnabledSocialPlatform[] = [
  'telegram',
  'google',
];