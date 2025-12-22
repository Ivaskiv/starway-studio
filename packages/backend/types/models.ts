// /starway-studio/packages/backend/types/models.ts

export interface User {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  telegram_id: string;
  telegram_username: string | null;
  avatar?: string;
  created_at: Date;
  updated_at: Date;
  password_hash?: string;
}

export interface Enrollment {
  id: number;
  user_id: number;
  product_id: number;
  status: string;
  pay_source: string;
  pay_ref: string;
  amount: number;
  currency: string;
  expires_at: Date | null;
  created_at: Date;
}

export interface Progress {
  id: number;
  user_id: number;
  product_id: number;
  lesson_id: number;
  completed: boolean;
  status: string;
  watched_video?: boolean;
  task_sent?: boolean;
  created_at: Date;
  updated_at: Date;
}


export interface Miniapp {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  icon_url: string | null;
  url: string;
  is_free: boolean;
  price: number;
  sort: number;
  created_at: Date;
}

// Cabinet responses
export interface NormalizedUser {
  id: number;
  telegram_id: string;
  username: string | null;
  name: string | null;
  email: string | null;
  created_at: Date;
}

export interface ProductItem {
  slug: string;
  title: string;
  type: "free" | "paid";
  payment_url: string | null;
  is_active: boolean;
  progress: number;
}

export interface MiniappItem {
  id: number;
  title: string;
  description: string | null;
  icon_url: string | null;
  is_free: boolean;
  status: "active" | "locked";
  url: string;
}

export interface CabinetResponse {
  products: ProductItem[];
  miniapps: MiniappItem[];
}

// ───────────────────────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────────────────────


export interface RegisterBody {
  email: string;
  password: string;
  name?: string;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface AuthRequest extends Request {
  user: User;
}

export interface JwtPayload {
  id: string;
  role: string;
}
