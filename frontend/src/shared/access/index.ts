import type { User, UserRole } from '@/features/user/types/user.types';
import type { SocialPlatform } from '@/features/social/types/social.types';

/**
 * Ключі доступу – всі фічі платформи
 */
export type AccessKey =
  // Mentor modules
  | 'mentor.core'
  | 'mentor.daily'
  | 'mentor.decisions'
  | 'mentor.wheel'
  | 'mentor.vision'
  | 'mentor.goals'
  | 'mentor.actions'
  | 'mentor.zoom'
  | 'mentor.mentorship'
  // AI modules
  | 'ai.basic'
  | 'ai.deep'
  | 'ai.pdf'
  | 'ai.export'
  | 'ai.use'
  // Base / Core shortcuts
  | 'dashboard.view'
  | 'profile.view'
  | 'wheel.view'
  | 'progress.view'
  | 'dashboard'
  | 'mentor'
  | 'vision'
  | 'goal'
  | 'actions'
  | 'wheel'
  | 'progress'
  | 'ai-generator'
  // Commerce
  | 'products'
  | 'subscription'
  // System
  | 'profile'
  | 'settings'
  | 'products.manage'
  | 'settings.manage';

/**
 * План користувача
 */
export type UserPlan = 'free' | 'trial' | 'paid';

/**
 * Результат доступів користувача
 */
export interface UserAccessResult {
  abilities: Record<AccessKey, boolean>;
  plan: UserPlan;
  role: UserRole;
  trialEnd: Date | null;
}

/**
 * Окремий елемент доступу
 */
export interface AccessItem {
  key: AccessKey;
  source: 'trial' | 'purchase' | 'free' | 'admin';
  expiresAt: Date | null;
  productId?: string;
  enrollmentId?: string;
}

/* ===== AUTH API ===== */
export interface AuthApiResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
  isNewUser?: boolean;
  needsCompletion?: boolean;
  email?: string;
  name?: string;
  expiresIn: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  role?: UserRole;
}

export interface SocialAuthApiInput {
  provider: SocialPlatform;
  externalId: string;
  email?: string;
  name?: string;
  username?: string;
}

export interface SocialAuthResult {
  provider: SocialPlatform;
  isNewUser?: boolean;
  needsCompletion: boolean;
  name?: string;
  email?: string;
}

export interface UpdateUserSettingsInput {
  id: string;
  email?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  newPassword?: string;
  newPasswordConfirm?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  phone?: string;
  gender?: string;
  birthday?: string;
  timezone?: string;
  language?: string;
  currency?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  settings?: Record<string, any>;
}

/* ===== REDUX ===== */
export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  status: AuthStatus;
  role: UserRole | null;
}

/* ===== ROLE ABILITIES ===== */
export const ROLE_ABILITIES: Record<UserRole, AccessKey[]> = {
  user: [
    'dashboard.view',
    'profile.view',
    'wheel.view',
    'progress.view',
    'dashboard',
    'progress',
    'profile',
  ],
  admin: [
    'dashboard.view',
    'profile.view',
    'wheel.view',
    'progress.view',
    'mentor.core',
    'ai.basic',
    'products.manage',
    'settings.manage',
    'dashboard',
    'mentor',
    'goal',
    'actions',
    'progress',
    'profile',
    'settings',
  ],
  mentor: [
    'dashboard.view',
    'profile.view',
    'wheel.view',
    'progress.view',
    'mentor.core',
    'mentor.daily',
    'mentor.decisions',
    'mentor.actions',
    'ai.basic',
    'dashboard',
    'mentor',
    'goal',
    'actions',
    'progress',
    'profile',
    'settings',
  ],
};
