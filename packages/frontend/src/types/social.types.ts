// packages/frontend/src/features/social/types/social.types.ts
import { SocialProvider } from '@/constants/socialPlatforms'

export interface SocialConnection {
  provider: SocialProvider
  external_id: string
  username?: string
  accessToken?: string
  refreshToken?: string
  metadata?: Record<string, any>
  is_notifications?: boolean 
}
