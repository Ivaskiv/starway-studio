// backend/src/modules/social/social.types.ts

export type SocialPlatform =
  | 'app'
  | 'telegram' 
  | 'instagram' 
  | 'facebook' 
  | 'google' 
  | 'whatsapp'

export type SocialProvider = SocialPlatform;

export interface SocialConnection {
  provider: SocialProvider;
  externalId: string;
  username?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  metadata?: Record<string, any> | null;
  connectedAt?: Date | string;
}

export interface SocialResponse {
  success: boolean;
  connections?: SocialConnection[];
  link?: string;
  expiresIn?: number;
  message?: string;
}

export interface TelegramLinkData {
  link: string;
  expiresIn: number;
}

export interface ConnectSocialInput {
  provider: SocialProvider;
  externalId: string;
  username?: string;
  accessToken?: string;
  refreshToken?: string;
  metadata?: Record<string, any>;
}

export interface DisconnectSocialInput {
  provider: SocialProvider;
}