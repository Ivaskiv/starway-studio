import { SocialPlatform } from '../constants/socialPlatforms.constants'

/* ===== USER ===== */

export type UserRole = 'user' | 'admin' | 'super_admin'

export type UserSettings = {
  theme?: 'light' | 'dark'
  language?: 'uk' | 'en'
  notifications?: boolean
}

export interface User {
  id: string
  email?: string
  password_hash?: string

  firstName: string
  lastName?: string
  role: UserRole
  createdAt: string
  settings?: UserSettings
  abilities?: string[]
  trialEndsAt?: string

  subscriptionStatus?: 'active' | 'inactive'
  subscriptionPlan?: string
  subscriptionsRole?: string[] 

  isAdmin: boolean
}

/* ===== AUTH ===== */

export interface AuthTokens {
  accessToken: string
  refreshToken?: string
}

export interface AuthResponse {
  success: boolean
  user: User
  tokens: AuthTokens
}

export interface MeResponse {
  success: boolean
  user: User
}

/* ===== REQUESTS ===== */

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
  role?: UserRole
}

export interface UpdateUserRequest {
  id: string
  firstName?: string
  lastName?: string
  settings?: Partial<UserSettings>
}

/* ===== AUTH STATE ===== */

export type AuthStatus =
  | 'idle'
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'

export interface AuthState {
  user: User | null
  accessToken: string | null
  status: AuthStatus
}

export interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}
/* ===== ERRORS ===== */

export interface ApiError {
  status: number
  data: { message: string }
}

export const isApiError = (e: unknown): e is ApiError => {
  if (typeof e !== 'object' || e === null) return false

  const err = e as any

  return (
    typeof err.status === 'number' &&
    typeof err.data === 'object' &&
    err.data !== null &&
    typeof err.data.message === 'string'
  )
}

// /* ================= AUTH STATE ================= */

export interface AuthCredentials {
  user: User;
  accessToken: string;
}





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
