// backend/src/modules/auth/auth.types.ts
import { MentorConfig, Subscription, UserProgress } from '@starway/db/prisma-client';
import { toSafeUser } from '../../modules/user/types.js'
import type { SafeUser, UserRole, UserWithSub } from '../../types/globalTypes.js'

// ======================= API TYPES =======================
export interface AuthApiResponse {
  user: SafeUser;
  accessToken: string;
  refreshToken?: string;
  needsProfile: boolean;
  expiresIn: number;
}

export interface JwtPayload {
  id: string;
  role: UserRole;
  email: string | null;
}

// ======================= INPUTS =======================
export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  expertId?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateUserSettingsInput {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  settings?: {
    accentColor?: string | null;
    theme?: string | null;
    language?: string | null;
  };
}

// ======================= HELPERS =======================

/**
 * Конвертує UserWithSub → SafeUser
 */
export function userToSafe(user: UserWithSub): SafeUser {
  return toSafeUser(user);
}

export function toUserWithSub(user: PrismaUserWithRelations): UserWithSub {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    lastLoginAt: user.lastLoginAt,
    passwordHash: user.passwordHash,
    telegramUserId: user.telegramUserId,
    telegramUserName: user.telegramUserName,
    telegramChatId: user.telegramChatId,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    subscription: user.subscriptions[0] ?? null,
    userProgress: user.progress ?? null,
    mentorConfigs: user.mentorConfig ? [{ config: user.mentorConfig.config }] : [],
    notificationPreference: null,
  }
}
export interface PrismaUserWithRelations {
  id: string
  email: string | null
  name: string | null
  firstName: string | null
  lastName: string | null
  role: UserRole
  passwordHash: string | null
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
  telegramUserId: string | null
  telegramUserName: string | null
  telegramChatId: string | null
  subscriptions: Subscription[]
  progress: UserProgress | null
  mentorConfig: MentorConfig | null
}
