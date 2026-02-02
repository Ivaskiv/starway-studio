// frontend/src/features/social/types/social.types.ts
export type SocialPlatform =
  | 'app'
  | 'telegram' 
  | 'instagram' 
  | 'facebook' 
  | 'google' 
  | 'whatsapp'

export interface SocialPlatformMetadata {
  id: SocialPlatform;
  name: string;
  iconName: string;
  iconPath: string;
  color: string;
  gradient: string;
  authUrl: string;
}