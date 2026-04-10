// frontend/src/config/navigation.ts
import { AccessKey } from '@/features/auth/types/auth.types';
import { User, Home, Target, TrendingUp, MessageCircle, Package, Settings } from 'lucide-react';

export interface NavItem {
  path: string;
  icon: any;
  label: string;
  key: AccessKey;
  isPremium?: boolean;
}

// ✅ MAIN NAVIGATION
export const NAV_ITEMS: NavItem[] = [
  { path: '/dashboard', icon: Home, label: 'Кабінет', key: 'dashboard.view' },
  // { path: '/dashboard/wheel', icon: Target, label: 'Колесо балансу', key: 'wheel.view' },
  { path: '/dashboard/products', icon: Package, label: 'Продукти', key: 'products.manage', isPremium: true },
  { path: '/dashboard/mentor', icon: MessageCircle, label: 'ABsystem', key: 'mentor.core', isPremium: true },
  { path: '/dashboard/profile', icon: User, label: 'Профіль', key: 'profile.view' },
  { path: '/dashboard/progress', icon: TrendingUp, label: 'Прогрес', key: 'progress.view' },
  { path: '/dashboard/settings', icon: Settings, label: 'Налаштування', key: 'settings.manage' },
];

// ✅ FOOTER LINKS
export const FOOTER_LINKS = {
  learning: [
    { label: 'Курси', path: '/dashboard/courses' },
    { label: 'Прогрес', path: '/dashboard/progress' },
  ],
  tools: [
    { label: 'Колесо балансу', path: '/dashboard/wheel' },
    { label: 'ABsystem', path: '/dashboard/ai-mentor' },
  ],
};
