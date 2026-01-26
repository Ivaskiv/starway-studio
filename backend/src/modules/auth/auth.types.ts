// backend/src/modules/auth/auth.types.ts
import type { User, UserRole, SocialPlatform } from '../../types/types'

// ================= JWT PAYLOAD =================
export interface JwtPayload {
  id: string
  role: UserRole
  email?: string | null
}

// ================= INPUTS =====================
export interface RegisterInput {
  email: string
  password: string
  name?: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface SocialAuthInput {
  provider: SocialPlatform
  externalId: string
  username?: string
}

// ================= SAFE USER ==================
// без password_hash
export type SafeUser = Omit<User, 'password_hash'>

// ================= AUTH RESPONSE ==============
export interface AuthResponse {
  // user: SafeUser           // без пароля
  user: User
  token: string            // JWT access token
  refreshToken?: string    // optional, для refresh flow
  needsProfile: boolean    // чи потрібно завершити профіль
  expiresIn: number        // life of access token в секундах
}

// ================= GOOGLE OAUTH ===============
export interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope: string
  token_type: string
}

export interface GoogleUserInfo {
  id: string
  email: string
  verified_email: boolean
  name: string
  given_name: string
  family_name: string
  picture: string
}
