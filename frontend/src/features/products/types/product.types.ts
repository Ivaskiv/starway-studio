// frontend/src/features/products/types/product.types.ts

// ✅ Пояснення:
// Глобальні ролі (UserRole) — для авторизації у всьому додатку.
// Локальні ролі (LocalProductRole) — для доступу всередині продукту.
// ProductMember — дозволяє користувачу бути admin в одному продукті та user в іншому.
// ProductFormInputs + formToCreatePayload — єдина логіка для створення продуктів.
// AIMentorSettings — тут ти зберігаєш wheel → questions → schedule.
// TrialInfo — зручний тип для підписки/тріалу.

/* ====== Базові ролі ====== */
export type UserRole = 'admin' | 'user';

/* ====== Продукт ====== */
export type ProductType = 'course' | 'funnel' | 'mentorship' | 'mentor';
export type ProductFormat = 'video' | 'text' | 'mixed' | 'digital';
export type ProductStatus = 'draft' | 'published' | 'archived';

export interface Product {
  id: string;
  name: string;
  title: string;
  description: string;
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
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  analytics?: Record<string, any>;
}

/* ====== Форми для створення продукту ====== */
export interface ProductFormInputs {
  name: string;
  title: string;
  description: string;
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
}

/* ====== Payload для бекенду при створенні продукту ====== */
export const formToCreatePayload = (
  form: ProductFormInputs,
  creatorId: string,
): Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'analytics'> & { creatorId: string } => ({
  creatorId,
  name: form.name,
  title: form.title,
  description: form.description,
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
