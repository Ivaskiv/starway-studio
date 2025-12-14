// src/types/user.ts

export type UserPlan = 'free' | 'pro' | 'enterprise';

export interface UserIntegration {
  connected: boolean;
  credentials?: Record<string, string>;
}

export interface UserIntegrations {
  telegram: UserIntegration & {
    botToken?: string;
    botUsername?: string;
  };
  sendpulse: UserIntegration & {
    accessToken?: string;
    refreshToken?: string;
  };
  wayforp: UserIntegration & {
    merchantAccount?: string;
    secretKey?: string;
  };
  openai?: UserIntegration & {
    apiKey?: string;
  };
}

export interface UserLimits {
  gptRequests: number;
  gptRequestsMax: number;
  funnels: number;
  funnelsMax: number;
  subscribers: number;
  subscribersMax: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  plan: UserPlan;
  
  // Інтеграції
  integrations: UserIntegrations;
  
  // Ліміти
  limits: UserLimits;
  
  // Мета-дані
  createdAt: Date;
  updatedAt: Date;
  subscriptionExpiresAt?: Date;
}

// План конфігурації
export const PLAN_CONFIGS: Record<UserPlan, Partial<UserLimits>> = {
  free: {
    gptRequestsMax: 50,
    funnelsMax: 1,
    subscribersMax: 100
  },
  pro: {
    gptRequestsMax: -1, 
    funnelsMax: -1,
    subscribersMax: 10000
  },
  enterprise: {
    gptRequestsMax: -1,
    funnelsMax: -1,
    subscribersMax: -1
  }
};