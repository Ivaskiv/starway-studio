// packages/frontend/src/constants/socialPlatforms.ts

// ============ CORE TYPES ============

export const SOCIAL_PLATFORMS = [
  'telegram',
  // 'viber',
  'whatsapp',
  'instagram',
  'facebook',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

// ============ METADATA ============

export interface SocialPlatformMetadata {
  id: SocialPlatform;
  name: string;
  icon: string;      // Назва SVG файлу (без .svg)
  gradient: string;  // Tailwind gradient
  color: string;     // Hex color
}

export const SOCIAL_PLATFORM_METADATA: Record<SocialPlatform, SocialPlatformMetadata> = {
  telegram: {
    id: 'telegram',
    name: 'Telegram',
    icon: 'telegram',
    color: '#0088cc',
    gradient: 'from-blue-500 to-cyan-500',
  },
  // viber: {
  //   id: 'viber',
  //   name: 'Viber',
  //   icon: 'viber',
  //   color: '#7360f2',
  //   gradient: 'from-purple-500 to-indigo-500',
  // },
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    icon: 'whatsapp',
    color: '#25D366',
    gradient: 'from-green-500 to-emerald-500',
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    gradient: 'from-pink-500 via-purple-500 to-yellow-500',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    gradient: 'from-blue-600 to-blue-400',
  },
};

// ============ HELPERS ============

export const getSocialPlatformMetadata = (platform: SocialPlatform): SocialPlatformMetadata => {
  return SOCIAL_PLATFORM_METADATA[platform];
};

export const isSocialPlatform = (value: string): value is SocialPlatform => {
  return SOCIAL_PLATFORMS.includes(value as SocialPlatform);
};

export const getIconPath = (iconName: string): string => {
  return `/icons/${iconName}.svg`;
};