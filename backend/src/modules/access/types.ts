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
