// frontend/src/shared/types/profile.types.ts

import { UserSettings } from './user.types'

// ==========================
// PROFILE TYPES
// ==========================

export interface FormData {
  firstName: string
  lastName: string
  settings: UserSettings
}

export interface UserProfile {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'user' | 'admin' | 'super_admin'
  settings: UserSettings
}

// ==========================

// ==========================
// ADMIN TYPES
// ==========================

export interface AdminProductTemplate {
  id: string
  title: string
  description: string
  createdAt: string
  updatedAt?: string
  fields: Record<string, any> 
}

export interface AdminSettings {
  manageUsers: boolean
  manageProducts: boolean
  // canSendNotifications: boolean
}

export interface SidebarItem {
  label: string;
  path: string;
  icon?: string; // пізніше можна lucide іконки
  badge?: 'new' | 'pro';
}
