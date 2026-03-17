// frontend/src/shared/types/profile.types.ts

import type { User, UserSettings } from '@/features/user/types/user.types';

// ==========================
// PROFILE TYPES
// ==========================

export interface FormData {
  firstName: string;
  lastName: string;
  settings: UserSettings;
}

export type UserProfile = Pick<
  User,
  'id' | 'email' | 'firstName' | 'lastName' | 'role' | 'settings'
>;

// ==========================

// ==========================
// ADMIN TYPES
// ==========================

export interface AdminProductTemplate {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt?: string;
  fields: Record<string, any>;
}

export interface AdminSettings {
  manageUsers: boolean;
  manageProducts: boolean;
  // canSendNotifications: boolean
}

export interface SidebarItem {
  label: string;
  path: string;
  icon?: string; // пізніше можна lucide іконки
  badge?: 'new' | 'pro';
}
