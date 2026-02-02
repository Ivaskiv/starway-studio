// frontend/src/features/social/types/social.types.ts
export type SocialPlatform = 'google' | 'telegram' | 'instagram';

export interface SocialPlatformMetadata {
  id: SocialPlatform;
  name: string;
  iconName: string;
  iconPath: string;
  color: string;
  gradient: string;
  authUrl: string;
}