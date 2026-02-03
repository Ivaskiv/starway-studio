export type Ability =
  | 'dashboard.view'
  | 'progress.view'
  | 'wheel.view'
  | 'ai.use'
  | 'products.manage'
  | 'funnels.manage'
  | 'profile.view'
  | 'settings.manage';

export const ABILITIES: Record<string, Ability> = {
  DASHBOARD_VIEW: 'dashboard.view',
  PROGRESS_VIEW: 'progress.view',
  WHEEL_VIEW: 'wheel.view',
  AI_USE: 'ai.use',
  PRODUCTS_MANAGE: 'products.manage',
  FUNNELS_MANAGE: 'funnels.manage',
  PROFILE_VIEW: 'profile.view',
  SETTINGS_MANAGE: 'settings.manage',
  
};
