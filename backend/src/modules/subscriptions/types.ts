// backend/src/modules/subscriptions/types.ts
// Типи підписок, платежів WayForPay та callback-даних — синхронізовано з Prisma схемою
// Використовується в: service.ts, payments/*, mapper.ts, controller.ts

import type { SubscriptionStatus } from '../../db/generated/prisma/client.js';

// ── Subscription ──────────────────────────────────────────────────────────────

export type SubscriptionStatusAPI = 'trial' | 'active' | 'inactive' | 'expired' | 'cancelled';
export type SubscriptionPlanAPI   = 'free' | 'basic' | 'pro' | 'enterprise' | 'trial' | 'monthly' | 'yearly';

export interface SubscriptionInfo {
  status:      'trial' | 'active' | 'inactive';
  startsAt?:   string;
  endsAt?:     string;
  autoRenew?:  boolean;
  daysLeft?:   number;
}

export interface TrialInfo {
  isActive:  boolean;
  startsAt?: string;
  endsAt?:   string;
  daysLeft:  number;
}

// Мінімальний зріз юзера для визначення плану (підтягується з Prisma)
export interface PrismaUserSubscriptionLike {
  role:               string;
  subscriptionStatus: SubscriptionStatus | string | null;
  trialEndsAt?:       Date | null;
}

// ── WayForPay ─────────────────────────────────────────────────────────────────

/** Тіло callback від WayForPay */
export interface PaymentCallbackData {
  order_reference:    string;
  amount:             number;
  currency:           string;
  product_name?:      string[];
  product_price?:     number[];
  product_count?:     number[];
  /** userId переданий в clientAccountId при ініціалізації платежу */
  clientAccountId?:   string;
  merchant_signature?: string;
  transaction_status?: string;
  reason_code?:       string;
  transaction_id?:    string;
}

/** Дані для processPayment + generateSignature */
export interface PaymentData {
  userId:         string;
  productId:      string;
  amount:         number;
  payRef:         string;
  currency?:      string;
  product_name?:  string[];
  product_count?: number[];
  product_price?: number[];
}

/** Результат processPayment */
export type PaymentResult =
  | { status: 'approved'; userId: string; productId: string; enrollmentId: string }
  | { status: 'failed';   userId: string; reason: string };