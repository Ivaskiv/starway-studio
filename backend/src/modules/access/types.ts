export type AccessKey =
  // Mentor
  | 'mentor.core'
  | 'mentor.daily'
  | 'mentor.decisions'
  | 'mentor.wheel'
  | 'mentor.vision'
  | 'mentor.goals'
  | 'mentor.actions'
  | 'mentor.zoom'
  | 'mentor.mentorship'
  // AI
  | 'ai.basic'
  | 'ai.deep'
  | 'ai.pdf'
  | 'ai.export'
  // Other
  | 'dashboard.view'
  | 'profile.view'
  | 'wheel.view'
  | 'progress.view'
  | 'products.manage'
  | 'settings.manage'
  | 'admin.clients.view'
  | 'admin.revenue.view'
  | 'admin.roles.manage'
  | 'funnels.manage';

export const PRODUCT_ACCESS_PRODUCTS = ['AI_MENTOR', 'AI_ASSISTANT'] as const;
export type ProductAccessProduct = (typeof PRODUCT_ACCESS_PRODUCTS)[number];

export const PRODUCT_ACCESS_ROLES = ['ADMIN', 'EXPERT'] as const;
export type ProductAccessRole = (typeof PRODUCT_ACCESS_ROLES)[number];

export interface ProductAccessAssignment {
  id: string;
  userId: string;
  product: ProductAccessProduct;
  role: ProductAccessRole;
  createdAt: Date;
}

export interface AccessItem {
  key: AccessKey;
  source: 'trial' | 'purchase' | 'free' | 'admin';
  expiresAt: Date | null;
  productId?: string;
  enrollmentId?: string;
}

export interface UserAccessResult {
  abilities: Record<string, boolean>;
  items: AccessItem[];
  plan: 'free' | 'trial' | 'paid';
  role: string;
  trialEnd: Date | null;
}

export type AccessLevel = 'GUEST' | 'LEAD' | 'CLIENT';
export type CurrentFlow = 'lead-magnet' | 'mentor' | null;
export type AccessBlockReason =
  | 'LEAD_FLOW_LOCK'
  | 'SUBSCRIPTION_REQUIRED'
  | 'CONTACT_REQUIRED'
  | 'TELEGRAM_REQUIRED'
  | 'LEAD_ACCESS_REQUIRED';

export type AccessMode = 'ACTIVE' | 'CONTINUITY' | 'LOCKED';

export type ProductStage =
  | 'test'
  | 'focus'
  | 'absystem_ai'
  | 'paused'
  | 'returning'
  | 'strategic'
  | 'personal_program'
  | 'unknown';

export type BehavioralResource =
  | 'wheel_history'
  | 'wheel_latest'
  | 'wheel_cooldown'
  | 'wheel_analytics'
  | 'daily_history'
  | 'daily_today'
  | 'goals'
  | 'goals_primary'
  | 'progress'
  | 'continuity_artifacts'
  | 'weekly_reports'
  | 'ai_chat'
  | 'ai_generation'
  | 'daily_write'
  | 'wheel_write'
  | 'goals_write'
  | 'progress_write'
  | 'mentor_chat';

export interface BehavioralAccessResolution {
  mode: AccessMode;
  stage: ProductStage;
  resource: BehavioralResource;
  hasContinuityArtifacts: boolean;
  hasActiveAccess: boolean;
  reason: string;
}

export interface AccessControlState {
  accessLevel: AccessLevel;
  currentFlow: CurrentFlow;
  currentStep: number;
  hasLeadMagnet: boolean;
  hasSubscription: boolean;
  telegramId: string | null;
  email: string | null;
  hasRequiredContacts: boolean;
  hasTelegramLinked: boolean;
  telegramEnabled: boolean;
}

export type ModuleAccessLevel = 'TRIAL' | 'PAID' | 'NONE';
export type ModuleLockReason = 'TRIAL_EXPIRED' | 'NO_SUBSCRIPTION' | null;

export interface UserSystemState {
  accessControl: AccessControlState;
  zoomAccess: {
    state: 'NO_ACCESS' | 'FOCUS_ACTIVE' | 'PREMIUM';
    isActive: boolean;
    hasFocus: boolean;
    expiresAt: Date | null;
  };
  products: {
    owned: Array<{ id: string; name: string; type?: string | null; status?: string | null }>;
    subscribed: Array<{
      id: string;
      name: string;
      status: 'trial' | 'paid' | 'locked';
      expiresAt: Date | null;
    }>;
    templates: Array<{
      id: string;
      name: string;
      result: string;
      modules: string[];
      finalStateExample: string;
      cta: 'TRY_7_DAYS' | 'CREATE';
    }>;
  };
  aiModules: Array<{
    moduleId: string;
    accessLevel: ModuleAccessLevel;
    isLocked: boolean;
    lockReason: ModuleLockReason;
  }>;
  permissions: {
    role: 'USER' | 'EXPERT' | 'ADMIN' | 'SUPERADMIN';
    canCreateProducts: boolean;
    canBypassTrial: boolean;
    canSeeAdminTools: boolean;
  };
  trial: {
    isActive: boolean;
    daysLeft: number;
    endsAt: Date | null;
  };
  subscription: {
    isActive: boolean;
    status: string | null;
    expiresAt: Date | null;
    currentPeriodStart: Date | null;
  };
  mentorship: {
    isActive: boolean
  };
  ui: {
    showMyProductsSection: boolean;
    showCreateProductCta: boolean;
    showTemplatesSection: boolean;
    showAdminPanel: boolean;
  };
  meta: {
    version: number;
    updatedAt: string;
  };
}
