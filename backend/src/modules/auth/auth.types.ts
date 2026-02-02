//backend/src/modules/auth/auth.types.ts
import { User } from "../../types/types.js"

export interface AuthResponse {
  user: User
  token: string
  refreshToken?: string
  needsProfile: boolean
  expiresIn: number
}

export interface JwtPayload {
  id: string
  role: string
  email?: string
}

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
  provider: 'telegram' | 'instagram'
  externalId: string
  username?: string
}

export type SafeUser = Omit<User, 'password_hash'>
