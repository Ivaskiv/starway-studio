// frontend/src/features/dashboard/config/sidebar.config.ts
//! sidebar не фільтрує
//! sidebar декларує вимогу
//! рішення приймає useAbility()

import { Ability } from "@/features/auth/utils/abilities";



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
    path: '/dashboard',
    ability: 'dashboard.view',
  },
  {
    label: 'AI Mentor',
    path: '/dashboard/ai-mentor',
    ability: 'ai.use',
    badge: 'pro',
  },
  {
    label: 'Wheel of Balance',
    path: '/dashboard/wheel',
    ability: 'wheel.view',
  },
  {
    label: 'My Progress',
    path: '/dashboard/progress',
    ability: 'progress.view',
  },
  {
    label: 'Profile',
    path: '/dashboard/profile',
    ability: 'profile.view',
  },

  // admin+
  {
    label: 'Products',
    path: '/dashboard/products',
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
    path: '/dashboard/settings',
    ability: 'settings.manage',
  },

  // // super admin
  // {
  //   label: 'AI Control',
  //   path: '/dashboard/ai-control',
  //   ability: 'ai.control',
  // },
];
