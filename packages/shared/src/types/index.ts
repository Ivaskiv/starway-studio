// packages/shared/src/types/index.ts
// import { AuthenticatedRequest } from './index';

// ==================== BASE TYPES ====================
export type ID = string;
export type ISODate = string;

// ==================== USER & AUTH ====================
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  FUNNEL_ADMIN = 'funnel_admin',
  USER = 'user',
  ADMIN = 'admin',
  MENTOR = 'mentor',
  STUDENT = 'student',
}

export interface User {
  id: string;
  email: string | null;
  name: string;
  role: UserRole | string;
  funnel_id?: string | null;
  telegram_id?: string | null;
  telegram_username?: string | null;
  avatar?: string;
  password_hash?: string;
  password?: string;
  demo?: boolean;
  token?: string;
  created_at: string | Date;
  updated_at?: string | Date;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoggedIn?: boolean;
  isLoading: boolean;
  isRefreshing?: boolean;
  error: string | null;
}

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
  name: string;
  email: string;
  password: string;
  funnelId: string;
}

export interface CreateTelegramUserBody {
  telegram_id: string;
  telegram_username?: string;
  name?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}

export interface UserResponse {
  success: boolean;
  user: User;
}

export interface AuthError {
  success: false;
  message: string;
}

export interface JwtPayload {
  id: string;
  role: string;
}

export interface NormalizedUser {
  id: number;
  telegram_id: string;
  username: string | null;
  name: string | null;
  email: string | null;
  created_at: Date;
}

// ==================== PRODUCT ====================
export type ProductType = 
  | 'digital_product'
  | 'course'
  | 'coaching'
  | 'service'
  | 'physical_product'
  | 'membership'
  | 'other';

export interface ProductItem {
  slug: string;
  title: string;
  type: 'free' | 'paid';
  payment_url: string | null;
  is_active: boolean;
  progress: number;
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

// ==================== FUNNEL ====================
export type FunnelStage =
  | 'Discovery'
  | 'Value'
  | 'Habit'
  | 'Depth'
  | 'Monetization';

export type FunnelType = 'telegram' | 'email' | 'mixed';

export type FunnelStatus = 'draft' | 'active' | 'paused' | 'archived';

export interface Funnel {
  id: string;
  owner_id: string;
  name: string;
  type: FunnelType;
  description?: string;
  slug: string;
  status: FunnelStatus;
  is_public: boolean;
  steps: FunnelStep[];
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FunnelStep {
  id: ID;
  order: number;
  stage: FunnelStage;
  title: string;
  description: string;
  blocks: Block[];
}

export interface FunnelDraft {
  id?: string;
  name: string;
  audience: string;
  niche: string;
  goal: string;
  productType?: ProductType | string | null;
  offer: string;
  steps?: FunnelStep[];
  blocks?: Block[];
}

export interface CreateFunnelRequest {
  name: string;
  type?: FunnelType;
  description?: string;
}

export interface UpdateFunnelRequest {
  name?: string;
  type?: FunnelType;
  description?: string;
  status?: FunnelStatus;
  steps?: FunnelStep[];
  settings?: Record<string, unknown>;
}

export interface FunnelResponse {
  success: boolean;
  funnel: Funnel;
}

export interface FunnelsResponse {
  success: boolean;
  funnels: Funnel[];
}

export interface FunnelUser {
  id: string;
  name: string;
  email: string;
  role: 'user';
  funnel_id: string;
  telegram_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FunnelUsersResponse {
  success: boolean;
  users: FunnelUser[];
  total: number;
}

// ==================== BLOCKS ====================
export type BlockType = 
  | 'video' 
  | 'text' 
  | 'task' 
  | 'ai_session' 
  | 'bonus' 
  | 'quiz'
  | 'trigger'
  | 'email'
  | 'telegram'
  | 'payment'
  | 'gift'
  | 'segment'
  | 'notify';

export interface Block {
  id: ID;
  product_id?: number;
  type: BlockType;
  order?: number;
  label?: string;
  title: string;
  description: string;
  content?: string;
  duration?: number;
  points?: number;
  settings?: Record<string, unknown>;
  video_url?: string | null;
  short_text?: string | null;
  full_text?: string | null;
  tasks?: any;
  completed?: boolean;
  locked?: boolean;
  user_answer?: string;
  next?: string[];
  [key: string]: any;
}

export interface CompleteBlockBody {
  block_id: string;
  answer?: string;
}

// ==================== LESSONS ====================
export interface Lesson {
  id: number;
  title: string;
  video_url: string | null;
  short_text: string | null;
  full_text: string | null;
  tasks: any;
  order_index: number;
}

// ==================== PROGRESS ====================
export interface UserProgress {
  id?: string;
  user_id: number;
  product_id: number;
  lesson_id?: number;
  total_points: number;
  completed_blocks: number;
  total_blocks?: number;
  current_streak: number;
  level: number;
  time_spent_minutes?: number;
  last_activity_date?: Date;
  completed?: boolean;
  watched_video?: boolean;
  task_sent?: boolean;
  status?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface Achievement {
  id: string;
  title: string;
  description?: string;
  icon: string;
  unlocked_at?: Date | null;
  unlocked: boolean;
  progress?: number;
  requirement?: number;
  created_at?: Date;
}

// ==================== MINIAPPS ====================
export interface Miniapp {
  id: number;
  slug: string;
  title: string;
  code?: string | null;
  description: string | null;
  icon_url: string | null;
  url: string;
  is_free: boolean;
  status?: 'active' | 'locked';
  price?: number;
  sort?: number;
  created_at?: Date;
}

export interface Purchase {
  id: number;
  user_id: number;
  miniapp_id: number;
  source: string;
  external_id: string | null;
  status: string;
  amount: number | null;
  currency: string | null;
  created_at?: Date;
}

// ==================== PRACTICUM ====================
export interface Practicum {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  duration_days: number | null;
  price: number | null;
  steps: any;
  created_by: string;
  created_at?: Date;
}

export interface PracticumBody {
  title: string;
  description?: string;
  category?: string;
  duration_days?: number;
  price?: number;
  steps?: any;
}

// ==================== CABINET ====================
export interface CabinetResponse {
  products: ProductItem[];
  miniapps: Miniapp[];
}

// ==================== PAYMENT ====================
export interface WayForPayPayload {
  orderReference: string;
  merchantSignature: string;
  email?: string;
  product?: string;
  telegram_id?: string;
  amount?: number;
  currency?: string;
}

export interface StartParamPayload {
  start?: string;
  startParam?: string;
  email?: string;
  telegram_id?: string;
}

export type WebhookPayload = Partial<WayForPayPayload & StartParamPayload>;

// ==================== AI ====================
export type AIFieldFocus =
  | 'name'
  | 'audience'
  | 'niche'
  | 'goal'
  | 'offer'
  | 'productType'
  | 'content'
  | 'funnel-structure'
  | 'headline'
  | 'description'
  | 'cta'
  | 'structure';

export interface AIGenerateRequest {
  prompt: string;
  context?: Partial<FunnelDraft>;
}

export interface AIGenerateResponse {
  data: string | Block[];
  remainingGenerations: number;
  error?: string;
}

export interface GenerationsBalance {
  base: number;
  bonus: number;
  total: number;
  used_today: number;
}

export interface AIFunnelAssistantProps {
  currentField: AIFieldFocus;
  funnelDraft: Partial<FunnelDraft>;
  generations: {
    base: number;
    bonus: number;
  };
  isGenerating: boolean;
  onGenerate: (result: string) => void;
}

// ==================== DEMO ====================
export interface DemoFunnelStage {
  day: number;
  title: string;
  type: FunnelStage;
  description: string;
}

export interface DemoFunnelResult {
  title: string;
  stages: DemoFunnelStage[];
}

export interface DemoState {
  active: boolean;
  step: number;
  loading: boolean;
  mentor: User | null;
  student: User | null;
  admin: User | null;
  funnel: DemoFunnelResult | null;
  error?: string;
}

// ==================== API RESPONSES ====================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ==================== EXPRESS REQUEST ====================
export interface AuthRequest {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
  body?: any;
  params?: any;
  query?: any;
}

export interface AuthenticatedRequest {
  user: User;
  body?: any;
  params?: any;
  query?: any;
}

// ==================== API RESPONSES ====================
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
