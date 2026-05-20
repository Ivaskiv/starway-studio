// frontend/src/features/dashboard/config/sidebar.config.ts
//! sidebar не фільтрує
//! sidebar декларує вимогу
//! рішення приймає useAbility()

import { Ability } from "@/features/auth/permissions/abilities";
import { ROUTES } from '@/config/routes';



/**
 * ЄДИНЕ джерело правди для dashboard-навігації
 *
 * - sidebar
 * - routes
 * - кнопки
 * - доступи
 *
 * ❌ без UserRole
 * ❌ без if admin
 * ✅ тільки abilities
// sidebar не знає, хто ти
// sidebar не знає, адмін ти чи ні
// sidebar питає одне: can(ability)?
// бекенд керує всім через /me/permissions
// додаєш фічу → додаєш 1 ability → UI готовий
 */

export interface SidebarItem {
  label: string;
  path: string;
  ability: Ability;
  badge?: 'new' | 'pro';
  icon?: any;
  // icon?: string;
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    label: 'Dashboard',
    path: ROUTES.DASHBOARD,
    ability: 'dashboard.view',
  },
  {
    label: 'ABsystem',
    path: ROUTES.AI_MENTOR,
    ability: 'ai.use',
    badge: 'pro',
  },
  {
    label: 'Wheel of Balance',
    path: ROUTES.WHEEL,
    ability: 'wheel.view',
  },
  {
    label: 'Profile',
    path: ROUTES.PROFILE,
    ability: 'profile.view',
  },

  // admin+
  {
    label: 'Products',
    path: ROUTES.PRODUCTS,
    ability: 'products.manage',
  },
  // {
  //   label: 'Users',
  //   path: '/dashboard/users',
  //   ability: 'users.manage',
  // },
  // {
  //   label: 'Funnels',
  //   path: '/dashboard/funnels',
  //   ability: 'funnels.manage',
  // },
  // {
  //   label: 'Analytics',
  //   path: '/dashboard/analytics',
  //   ability: 'analytics.view',
  // },
  {
    label: 'Settings',
    path: ROUTES.SETTINGS,
    ability: 'settings.manage',
  },

  // // super admin
  // {
  //   label: 'AI Control',
  //   path: '/dashboard/ai-control',
  //   ability: 'ai.control',
  // },
];
