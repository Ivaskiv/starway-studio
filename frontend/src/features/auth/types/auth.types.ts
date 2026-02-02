// frontend/src/features/auth/types/auth.types.ts
import { User } from '@/shared/types/user.types'

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
}

export interface AuthResponse {
  user: User
  token: string
  refreshToken?: string
  needsProfile?: boolean
  expiresIn?: number
  permissions?: string[]
}

export interface MeResponse {
  user: User
  permissions?: string[]
}

export interface LoginInput {
  email: string
  password: string
}

export interface RegisterInput {
  email: string
  password: string
  name?: string
}

export interface SocialAuthInput {
  provider: string
  token: string
}

export interface AuthCredentials {
  user: User
  accessToken: string
}