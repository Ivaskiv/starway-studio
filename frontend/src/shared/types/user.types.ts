
/* ===== USER ===== */

import { withNormalizer } from "@/shared/utils/apiNormalizer";

export type UserRole = 'user' | 'admin' | 'super_admin';

export const normalizeUserRole = withNormalizer<any, UserRole>(api => {
  if (api === 'admin' || api === 'super_admin') return api;
  return 'user';
});
export type UserSettings = {
  theme?: 'light' | 'dark';
  language?: 'uk' | 'en';
  notifications?: boolean;
};
export const normalizeUserSettings = (api: any): UserSettings => ({
  theme: api?.theme,
  language: api?.language,
  notifications: Boolean(api?.notifications),
});

export interface User {
  id: string;
  email?: string;

  userName?: string;
  firstName: string;
  lastName?: string;

  role: UserRole;
  createdAt: string;

  settings?: UserSettings;
  abilities?: string[];

  trialEndsAt?: string;

  subscriptionStatus?: 'active' | 'inactive';
  subscriptionPlan?: string;
  subscriptionsRole: string[];

  isAdmin: boolean;

  telegramId?: string;
  telegramUsername?: string;

  needsProfile?: boolean; 

  subscriptionEndsAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;

  stats?: {
    totalPosts: number;
    totalComments: number;
    totalLikes: number;
    totalDislikes: number;
  };
}
export const normalizeSingleUser = (api: any): User => ({
  id: String(api.id),
  email: api.email ?? undefined,
  userName: api.user_name ?? api.userName,
  firstName: api.first_name ?? api.firstName ?? '',
  lastName: api.last_name ?? api.lastName,
  role: normalizeUserRole(api.role) as UserRole,
  createdAt: api.created_at ?? api.createdAt,
  settings: api.settings ? normalizeUserSettings(api.settings) : undefined,
  abilities: Array.isArray(api.abilities) ? api.abilities : [],
  trialEndsAt: api.trial_ends_at ?? api.trialEndsAt,
  subscriptionStatus: api.subscription_status,
  subscriptionPlan: api.subscription_plan,
  subscriptionsRole: Array.isArray(api.subscriptionsRole) ? api.subscriptionsRole : [],
  isAdmin: Boolean(api.is_admin ?? api.isAdmin),
  telegramId: api.telegram_id ?? api.telegramId,
  telegramUsername: api.telegram_username ?? api.telegramUsername,
  subscriptionEndsAt: api.subscription_ends_at,
  updatedAt: api.updated_at,
  lastLoginAt: api.last_login_at,
  stats: api.stats
    ? {
        totalPosts: api.stats.totalPosts ?? 0,
        totalComments: api.stats.totalComments ?? 0,
        totalLikes: api.stats.totalLikes ?? 0,
        totalDislikes: api.stats.totalDislikes ?? 0,
      }
    : undefined,
});

export const normalizeUser = withNormalizer<any, User>(api => ({
  id: String(api.id),

  email: api.email ?? undefined,

  userName: api.user_name ?? api.userName,
  firstName: api.first_name ?? api.firstName ?? '',
  lastName: api.last_name ?? api.lastName,

  role: normalizeUserRole(api.role) as UserRole,

  createdAt: api.created_at ?? api.createdAt,

  settings: api.settings ? normalizeUserSettings(api.settings) : undefined,

  abilities: Array.isArray(api.abilities) ? api.abilities : [],

  trialEndsAt: api.trial_ends_at ?? api.trialEndsAt,

  subscriptionStatus: api.subscription_status,
  subscriptionPlan: api.subscription_plan,
  subscriptionsRole: Array.isArray(api.subscriptionsRole) ? api.subscriptionsRole : [],

  isAdmin: Boolean(api.is_admin ?? api.isAdmin),

  telegramId: api.telegram_id ?? api.telegramId,
  telegramUsername: api.telegram_username ?? api.telegramUsername,

  subscriptionEndsAt: api.subscription_ends_at,
  updatedAt: api.updated_at,
  lastLoginAt: api.last_login_at,

  stats: api.stats
    ? {
        totalPosts: Number(api.stats.totalPosts ?? 0),
        totalComments: Number(api.stats.totalComments ?? 0),
        totalLikes: Number(api.stats.totalLikes ?? 0),
        totalDislikes: Number(api.stats.totalDislikes ?? 0),
      }
    : undefined,
}));

/* ===== AUTH ===== */
// export interface UserAuth {
//   id: string;
//   email: string;
//   password_hash: string;
//   role: UserRole;
// }
// export interface AuthTokens {
//   accessToken: string;
//   refreshToken?: string;
// }
// export const normalizeAuthTokens = withNormalizer<any, AuthTokens>(api => ({
//   accessToken: api.access_token ?? api.accessToken,
//   refreshToken: api.refresh_token ?? api.refreshToken,
// }));
// export interface AuthResponse {
//   success: boolean;
//   user: User;
//   tokens: AuthTokens;
// }
// export const normalizeAuthResponse = withNormalizer<any, AuthResponse>(api => ({
//   success: Boolean(api.success),
//   user: normalizeUser(api.user) as User,
//   tokens: normalizeAuthTokens(api.tokens) as AuthTokens,
// }));
// export interface MeResponse {
//   success: boolean;
//   user: User;
// }
// export const normalizeMeResponse = withNormalizer<any, MeResponse>(api => ({
//   success: Boolean(api.success),
//   user: normalizeUser(api.user) as User,
// }));
// export const normalizeAuthCredentials = withNormalizer<any, AuthCredentials>(api => ({
//   user: normalizeUser(api.user) as User,
//   accessToken: api.accessToken ?? api.access_token,
// }));

/* ===== REQUESTS ===== */

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserRequest {
  id: string;
  firstName?: string;
  lastName?: string;
  settings?: Partial<UserSettings>;
}

/* ===== AUTH STATE ===== */

export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  status: AuthStatus;
}

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}
/* ===== ERRORS ===== */

export interface ApiError {
  status: number;
  data: { message: string };
}

export const isApiError = (e: unknown): e is ApiError => {
  if (typeof e !== 'object' || e === null) return false;

  const err = e as any;

  return (
    typeof err.status === 'number' &&
    typeof err.data === 'object' &&
    err.data !== null &&
    typeof err.data.message === 'string'
  );
};

// /* ================= AUTH STATE ================= */

// export interface AuthCredentials {
//   user: User;
//   accessToken: string;
// }

// import z from 'zod';
// import { SocialPlatform } from '../constants/socialPlatforms.constants';

// /* ======================================================
//   AUTH / USER — ЄДИНЕ ДЖЕРЕЛО ПРАВДИ
// ====================================================== */

// export type UserRole = 'user' | 'admin' | 'super_admin';

// export type UserSettings = {
//   theme?: 'light' | 'dark';
//   language?: 'uk' | 'en';
//   notifications?: boolean;
// };

// export interface User {
//   id: string;
//   email?: string;
//   firstName: string;
//   lastName?: string;
//   passwordHash?: string;
//   role: UserRole;
//   createdAt: string;
//   settings?: UserSettings;

//   trialEndsAt?: string;
//   subscription_status?: 'active' | 'inactive' | 'canceled';

//   timezone?: string;

//   // social
//   name?: string;
//   authProvider?: SocialPlatform;
//   telegramId?: string;
//   telegramUsername?: string;
//   instagramId?: string;
//   instagramUsername?: string;
//   discordId?: string;

//   abilities?: string[];

//   // Гейміфікація / статистика
//   streak?: number;
//   completedBlocks?: number;
//   totalPoints?: number;
//   level?: number;
// }

// export interface SocialConnection {
//   provider: SocialPlatform;
//   externalId: string;
//   username?: string;
//   metadata?: Record<string, any>;
//   connectedAt: string;
//   notifications?: boolean;
//   accessToken?: string;
//   refreshToken?: string;
// }

// export interface TelegramLink {
//   link: string;
//   expiresIn: number;
// }

// /* ================= TOKENS ================= */

// export interface AuthTokens {
//   accessToken: string;
//   refreshToken?: string;
//   expiresIn?: number;
// }

// /* ================= RESPONSES ================= */

// export interface AuthResponse {
//   success: boolean;
//   user: User;
//   tokens: AuthTokens;
// }

// export interface MeResponse {
//   success: boolean;
//   user: User;
// }

// /* ================= REQUESTS ================= */

// export interface LoginRequest {
//   email: string;
//   password: string;
// }

// export interface RegisterRequest {
//   name: string;
//   email: string;
//   password: string;
//   role?: UserRole;
// }

// /* ================= UPDATE ================= */

// export interface UpdateUserRequest {
//   id: string;
//   firstName?: string;
//   lastName?: string;
//   settings?: Partial<UserSettings>;
// }

// /* ================= SETTINGS TOGGLE ================= */

// export interface ToggleProps {
//   label: string;
//   icon: React.ReactNode;
//   options: Array<{ value: string; label: string }>;
//   value: string;
//   onChange: (value: string) => void;
//   disabled?: boolean;
// }

// /* ================= FORMS (zod) ================= */

// export const loginSchema = z.object({
//   email: z.string().min(1, "Email обов'язковий").email('Введіть коректний email'),
//   password: z.string().min(1, "Пароль обов'язковий").min(8, 'Мінімум 8 символів'),
// });

// export const registerSchema = z
//   .object({
//     name: z.string().min(1, "Ім'я обов'язкове").min(2, 'Мінімум 2 символи'),
//     email: z.string().min(1, "Email обов'язковий").email('Введіть коректний email'),
//     password: z
//       .string()
//       .min(1, "Пароль обов'язковий")
//       .min(8, 'Мінімум 8 символів')
//       .regex(/[A-Za-z]/, 'Має містити літеру')
//       .regex(/[0-9]/, 'Має містити цифру'),
//     confirmPassword: z.string().min(1, "Підтвердження обов'язкове"),
//   })
//   .refine(data => data.password === data.confirmPassword, {
//     message: 'Паролі не співпадають',
//     path: ['confirmPassword'],
//   });

// export type LoginFormData = z.infer<typeof loginSchema>;
// export type RegisterFormData = z.infer<typeof registerSchema>;

// export type AuthStatus = 'idle' | 'loading' | 'authenticated' | 'unauthenticated';

// export interface AuthState {
//   user: User | null;
//   accessToken: string | null;
//   status: AuthStatus;
// }

// /* ================= API ERROR ================= */

// export interface ApiError {
//   status: number;
//   data: { message: string };
// }

// export const isApiError = (e: unknown): e is ApiError =>
//   typeof e === 'object' && e !== null && 'status' in e && 'data' in e;

// /* ================= ADMIN DASHBOARD ================= */

// export interface AdminStats {
//   totalFunnels: number;
//   activeFunnels: number;
//   totalUsers: number;
//   totalRevenue: number;
//   conversionRate: number;
// }

// export type ActivityType = 'purchase' | 'progress' | 'signup' | 'review';

// export interface AdminActivity {
//   user: string;
//   action: string;
//   time: string;
//   type: ActivityType;
//   amount?: string;
// }

// export type Trend = 'up' | 'neutral' | 'down';

// export interface TopProduct {
//   name: string;
//   students: number;
//   revenue: string;
//   completion: number;
//   trend: Trend;
// }

// /* ================= MODALS ================= */

// export interface AuthModalProps {
//   isOpen: boolean;
//   onClose: () => void;
// }
