// frontend/src/config/navigation.ts
import { AccessKey } from '@/features/auth/types/auth.types';
import { ROUTES } from '@/config/routes';
import { User, Home, Target, MessageCircle, Package, Settings } from 'lucide-react';

export interface NavItem {
  path: string;
  icon: any;
  label: string;
  key: AccessKey;
  isPremium?: boolean;
}

// ✅ MAIN NAVIGATION
export const NAV_ITEMS: NavItem[] = [
  { path: ROUTES.DASHBOARD, icon: Home, label: 'Кабінет', key: 'dashboard.view' },
  // { path: '/dashboard/wheel', icon: Target, label: 'Колесо балансу', key: 'wheel.view' },
  { path: ROUTES.PRODUCTS, icon: Package, label: 'Продукти', key: 'products.manage', isPremium: true },
  { path: ROUTES.AI_MENTOR, icon: MessageCircle, label: 'ABsystem', key: 'mentor.core', isPremium: true },
  { path: ROUTES.PROFILE, icon: User, label: 'Профіль', key: 'profile.view' },
  { path: ROUTES.SETTINGS, icon: Settings, label: 'Налаштування', key: 'settings.manage' },
];

// ✅ FOOTER LINKS
export const FOOTER_LINKS = {
  learning: [
    { label: 'Курси', path: ROUTES.COURSES },
    { label: 'Журнал', path: ROUTES.JOURNAL },
  ],
  tools: [
    { label: 'Колесо балансу', path: ROUTES.WHEEL },
    { label: 'ABsystem', path: ROUTES.AI_MENTOR },
  ],
};
