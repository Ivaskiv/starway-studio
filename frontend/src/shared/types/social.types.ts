// frontend/src/shared/types/social.types.ts

import { SOCIAL_PLATFORMS } from "@/shared/constants/socialPlatforms.constants";

// ============ CORE TYPES ============
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

// ============ METADATA ============
export interface SocialPlatformMetadata {
  id: SocialPlatform;
  name: string;
  gradient: string;   // Tailwind gradient
  color: string;      // Hex color
  iconName: string;   // Назва SVG файлу або іконки
}

// ============ HELPERS ============
export const isSocialPlatform = (value: string): value is SocialPlatform =>
  SOCIAL_PLATFORMS.includes(value as SocialPlatform);

export const getIconPath = (iconName: string) => `/icons/${iconName}.svg`;
