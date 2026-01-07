// packages/frontend/src/features/auth/authTypes.ts

// ==================== USER TYPES ====================
export interface User {
  id: string;
  email: string;
  firstName: string;  
  lastName: string;   
  role: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
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
  name: string;
  email: string;
  password: string;
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
