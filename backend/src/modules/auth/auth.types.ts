// backend/src/modules/auth/auth.types.ts


export interface AuthApiResponse {
  user: SafeUser;
  accessToken: string;
  refreshToken?: string;
  needsProfile: boolean;
  expiresIn: number;
}

export interface JwtPayload {
  id: string;
  role: string;
  email: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface SafeUser {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  role: 'user' | 'admin' | 'mentor';
  isAdmin: boolean;
  isSuperAdmin: boolean;
  abilities: string[];
  access: {
    plan: 'free' | 'trial' | 'paid';
    isPaid: boolean;
    isTrial: boolean;
    trialEnd: string | null;
  };
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  trialEndsAt: string | null;
  isTrialActive: boolean;
  stats: {
    totalPoints: number;
    completedBlocks: number;
    level: number;
  };
  settings: {
    accentColor: string | null;
    theme: string | null;
    language: string | null;
  };
  lastLoginAt: string | null;
}
