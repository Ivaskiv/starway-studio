// backend/src/modules/subscriptions/types.ts

export type SubscriptionStatusAPI = 'trial' | 'active' | 'inactive' | 'expired' | 'cancelled';
export type SubscriptionPlanAPI = 'free' | 'basic' | 'pro' | 'enterprise' | 'trial' | 'monthly' | 'yearly';

export interface SubscriptionInfo {
  status: SubscriptionStatusAPI;
  plan?: SubscriptionPlanAPI;
  startsAt?: string;
  endsAt?: string;
  autoRenew?: boolean;
  daysLeft?: number;
}

export interface TrialInfo {
  isActive: boolean;
  startsAt?: string;
  endsAt?: string;
  daysLeft: number;
}

export interface PaymentCallbackData {
  order_reference: string;
  amount: number;
  currency: string;
  product_name?: string[];
  product_price?: number[];
  product_count?: number[];
  clientAccountId?: string; // userId
  merchant_signature?: string;
  transaction_status?: string;
  reason_code?: string;
}
