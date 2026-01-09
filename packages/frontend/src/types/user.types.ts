// packages/frontend/src/features/auth/user.types.ts
export type userRole = 'super_admin' | 'funnel_admin' | 'user' 

// 👁 UI-стан (до логіну)
export type userType = userRole | 'guest'

// Mapping з AuthPage userType на backend role
export const USER_TYPE_TO_ROLE: Record<string, userType | null> = {
  funnel_admin: 'funnel_admin',
  user: 'user',
  guest: null
  }
// ==================== USER TYPES ====================
export interface User {
id: string
  email: string
  firstName: string
  lastName: string
  role: userType
  isActive?: boolean
  isEmailVerified?: boolean
  createdAt?: string
  updatedAt?: string
  
  // Trial & Subscription
  trialEndsAt?: string
  subscriptionStatus?: 'active' | 'expired' | 'none'
  subscriptionPlan?: 'free' | 'monthly' | 'yearly' | 'yearly_plus'

// ✅ Telegram integration
  telegramId?: string
  telegramUsername?: string
  telegramConnectedAt?: string

}

// ==================== TOKENS ====================
export interface Tokens {
  accessToken: string;
  refreshToken?: string;
}

// ==================== AUTH RESPONSES ====================
export interface AuthResponse {
  success: boolean;
  user: User;
  tokens: Tokens;
  message?: string;
}

export interface UserResponse {
  user: User;
}

// ==================== AUTH REQUESTS ====================
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string
  lastName: string
  email: string
  password: string
  role: userRole  
  confirmPassword?: string;
}

export interface RegisterUserInFunnelRequest {
  funnelId: string;
  name: string;
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

// ==================== REDUX STATE ====================
export interface AuthState {
  user: User | null;
  tokens: Tokens | null;
  isLoggedIn: boolean;
  isRefreshing: boolean;
  error: string | null;
}

// ==================== HELPER FUNCTIONS ====================
export const isAdmin = (role?: userType): boolean => 
  role === 'super_admin' || role === 'funnel_admin'

export const isSuperAdmin = (role?: userType): boolean => 
  role === 'super_admin'

export const isUser = (role?: userType): boolean => 
  role === 'user'

export const getRoleLabel = (role?: userType): string => {
  switch (role) {
    case 'super_admin': return '👑 Super Admin'
    case 'funnel_admin': return '🎯 Funnel Admin'
    case 'user': return '✨ Користувач'
    case 'guest': return '👁 Гість'
    default: return 'Невідомо'
  }
}