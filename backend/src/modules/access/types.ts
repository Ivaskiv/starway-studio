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
  | 'settings.manage';

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

export type ModuleAccessLevel = 'TRIAL' | 'PAID' | 'NONE';
export type ModuleLockReason = 'TRIAL_EXPIRED' | 'NO_SUBSCRIPTION' | null;

export interface UserSystemState {
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
    role: 'USER' | 'SUPERADMIN';
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
