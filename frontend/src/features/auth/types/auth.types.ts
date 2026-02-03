// frontend/src/features/auth/types/auth.types.ts
import { SocialPlatform } from '@/features/social/types/social.types';
import { User } from '@/features/user/types/user.types';

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
  needsProfile?: boolean;
  expiresIn?: number;
  permissions?: string[];

  isNewUser?: boolean; //is_new_user
  email?: string;
}

export interface MeResponse {
  user: User;
  permissions?: string[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface SocialAuthInput {
  provider: SocialPlatform;
  token: string;
}

export interface AuthCredentials {
  user: User;
  accessToken: string;
}
