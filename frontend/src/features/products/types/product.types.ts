// frontend/src/features/products/types/product.types.ts

import type { UserRole } from '@/features/user/types/user.types';

// ✅ Пояснення:
// Глобальні ролі (UserRole) — для авторизації у всьому додатку.
// Локальні ролі (LocalProductRole) — для доступу всередині продукту.
// ProductMember — дозволяє користувачу бути admin в одному продукті та user в іншому.
// ProductFormInputs + formToCreatePayload — єдина логіка для створення продуктів.
// AIMentorSettings — тут ти зберігаєш wheel → questions → schedule.
// TrialInfo — зручний тип для підписки/тріалу.

/* ====== Базові ролі ====== */
export type LocalProductRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'USER';

/* ====== Продукт ====== */
export type ProductType = 'course' | 'funnel' | 'mentorship' | 'mentor';
export type ProductFormat = 'video' | 'text' | 'mixed' | 'digital';
export type ProductStatus = 'draft' | 'published' | 'archived';
export type ProductIntegration = 'telegram' | 'web' | 'future';
export type Currency = 'UAH' | 'EUR' | 'USD';
export type MentorStyle = 'strict' | 'supportive' | 'provocative' | 'soft';
export type MentorLanguage = 'UA' | 'EN';

export interface Product {
  id: string;
  name: string;
  title: string;
  description?: string | null;
  type: ProductType;
  format: ProductFormat;
  price: number;
  currency: string;
  priceCents?: number;
  includesTrial: boolean;
  trialDays: number;
  includesMentorship: boolean;
  integration?: string;
  status: ProductStatus;
  thumbnailUrl?: string;
  modules: string[];
  funnelId?: string;
  goals?: string[];
  creatorId: string;
  expertId?: string;
  createdAt: string;
  updatedAt: string;
  analytics?: Record<string, any>;
  ownerId: string;
  systemPrompt?: string;
  mentorConfig?: MentorPromptConfig;
}

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  course: 'Курс',
  funnel: 'Funnel',
  mentorship: 'Менторство',
  mentor: 'AI-ментор',
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  UAH: '₴',
  EUR: '€',
  USD: '$',
};

/* ====== Форми для створення продукту ====== */
export interface MentorPromptConfig {
  mentorName: string
  style: MentorStyle
  language: MentorLanguage
  signaturePhrase: string
  focusAreas: string[]
  onStreakBreak?: string
  onLowState?: string
  onAchievement?: string
  forbiddenTopics?: string[]
  upsellNotes?: string
}

export interface ProductFormInputs {
  name: string;
  title: string;
  description: string;
  code?: string;
  ownerEmail?: string;
  type: ProductType;
  format: ProductFormat;
  price: number;
  currency: string;
  includesTrial: boolean;
  trialDays: number;
  includesMentorship: boolean;
  integration?: string;
  status: ProductStatus;
  thumbnailUrl?: string;
  modules: string[];
  funnelId?: string;
  goals?: string[];
  systemPrompt?: string;
  mentorConfig?: MentorPromptConfig;
}

/* ====== Payload для бекенду при створенні продукту ====== */
export type CreateProductPayload = Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'analytics'> & {
  creatorId: string
  description: string
}

export const formToCreatePayload = (
  form: ProductFormInputs,
  creatorId: string,
): CreateProductPayload => ({
  creatorId,
  name: form.name,
  title: form.title,
  description: form.description,
  ownerId: creatorId,
  type: form.type,
  format: form.format,
  price: form.price,
  currency: form.currency,
  includesTrial: form.includesTrial,
  trialDays: form.trialDays,
  includesMentorship: form.includesMentorship,
  integration: form.integration,
  status: form.status,
  thumbnailUrl: form.thumbnailUrl,
  modules: form.modules,
  funnelId: form.funnelId,
  goals: form.goals ?? [],
  systemPrompt: form.systemPrompt,
  mentorConfig: form.mentorConfig,
});

export const formToUpdatePayload = (form: ProductFormInputs) => ({
  ...form,
});

export const productToForm = (product: Product): ProductFormInputs => ({
  name: product.name,
  title: product.title,
  description: product.description ?? '',
  type: product.type,
  format: product.format,
  price: product.price,
  currency: product.currency,
  includesTrial: product.includesTrial,
  trialDays: product.trialDays,
  includesMentorship: product.includesMentorship,
  integration: product.integration ?? 'telegram',
  status: product.status,
  thumbnailUrl: product.thumbnailUrl ?? '',
  modules: product.modules ?? [],
  funnelId: product.funnelId,
  goals: product.goals ?? [],
  systemPrompt: product.systemPrompt,
  mentorConfig: product.mentorConfig,
});


/* ====== Членство користувачів у продукті ====== */
export interface ProductMember {
  productId: string;
  userId: string;
  role: LocalProductRole;
  joinedAt: string;
}

/* ====== Payload для додавання учасника продукту ====== */
export interface AddProductMemberRequest {
  productId: string;
  userId: string;
  role: LocalProductRole;
}

/* ====== AI Mentor / Wheel ====== */
export type DailyFrequency = 'once_daily' | 'twice_daily';

export interface AIMentorSettings {
  wheelId: string;
  productId: string;
  morningQuestion?: string;
  eveningQuestion?: string;
  schedule: DailyFrequency;
  startDate: string;
}

/* ====== Trial ====== */
export interface TrialInfo {
  active: boolean;
  trialEndsAt?: string;
}
/* ====== Enrollment (доступ до продукту) ====== */
export interface Enrollment {
  productId: string;
  userId: string;
  enrolledAt: string;
  purchased: boolean;
  trialEnd?: string | null;
  expiresAt?: string | null;
}

/* ====== Subscription ====== */
export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'EXPIRED';

export interface Subscription {
  id: string;
  userId: string;
  productId?: string | null;
  expertId?: string | null;
  status: SubscriptionStatus;
  currentPeriodEnd?: string | null;
  trialEndsAt?: string | null;
}

/* ====== Access context (зручно для хуків) ====== */
export interface ProductAccessContext {
  enrollments?: Enrollment[];
  subscriptions?: Subscription[];
}
