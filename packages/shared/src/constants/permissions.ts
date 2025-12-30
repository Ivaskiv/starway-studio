// shared/src/constants/permissions.ts

import { UserRole } from '../types/auth.types';

// Типи дозволів
export enum Permission {
  // User permissions
  USERS_READ = 'users:read',
  USERS_WRITE = 'users:write',
  USERS_DELETE = 'users:delete',
  USERS_MANAGE_ROLES = 'users:manage_roles',
  
  // Funnel permissions
  FUNNELS_READ = 'funnels:read',
  FUNNELS_WRITE = 'funnels:write',
  FUNNELS_DELETE = 'funnels:delete',
  FUNNELS_PUBLISH = 'funnels:publish',
  FUNNELS_ANALYTICS = 'funnels:analytics',
  
  // Product permissions
  PRODUCTS_READ = 'products:read',
  PRODUCTS_WRITE = 'products:write',
  PRODUCTS_DELETE = 'products:delete',
  
  // Analytics permissions
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_EXPORT = 'analytics:export',
  ANALYTICS_GLOBAL = 'analytics:global',
  
  // Settings permissions
  SETTINGS_READ = 'settings:read',
  SETTINGS_WRITE = 'settings:write',
  
  // Billing permissions
  BILLING_READ = 'billing:read',
  BILLING_WRITE = 'billing:write',
  
  // AI permissions
  AI_MENTOR = 'ai:mentor',
  AI_GENERATE = 'ai:generate',
  
  // Integrations permissions
  INTEGRATIONS_READ = 'integrations:read',
  INTEGRATIONS_WRITE = 'integrations:write',
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // Власник платформи - бачить ВСЕ
  [UserRole.SUPER_ADMIN]: [
    Permission.USERS_READ,
    Permission.USERS_WRITE,
    Permission.USERS_DELETE,
    Permission.USERS_MANAGE_ROLES,
    Permission.FUNNELS_READ,           // Всі воронки всіх funnel_admin
    Permission.FUNNELS_WRITE,
    Permission.FUNNELS_DELETE,
    Permission.FUNNELS_PUBLISH,
    Permission.FUNNELS_ANALYTICS,
    Permission.PRODUCTS_READ,
    Permission.PRODUCTS_WRITE,
    Permission.PRODUCTS_DELETE,
    Permission.ANALYTICS_READ,
    Permission.ANALYTICS_EXPORT,
    Permission.ANALYTICS_GLOBAL,
    Permission.SETTINGS_WRITE,
    Permission.BILLING_READ,
    Permission.BILLING_WRITE,
    Permission.AI_MENTOR,
    Permission.AI_GENERATE,
    Permission.INTEGRATIONS_READ,
    Permission.INTEGRATIONS_WRITE,
  ],
  
  // Власник воронок - керує СВОЇМИ воронками та підписниками
  [UserRole.FUNNEL_ADMIN]: [
    Permission.USERS_READ,             // Бачить СВОЇХ підписників
    Permission.FUNNELS_READ,           // Тільки СВОЇ воронки
    Permission.FUNNELS_WRITE,
    Permission.FUNNELS_DELETE,
    Permission.FUNNELS_PUBLISH,
    Permission.FUNNELS_ANALYTICS,
    Permission.PRODUCTS_READ,
    Permission.PRODUCTS_WRITE,
    Permission.ANALYTICS_READ,
    Permission.ANALYTICS_EXPORT,
    Permission.SETTINGS_READ,
    Permission.BILLING_READ,
    Permission.AI_MENTOR,
    Permission.AI_GENERATE,
    Permission.INTEGRATIONS_READ,
    Permission.INTEGRATIONS_WRITE,
  ],
  
  // Підписники - споживають контент
  [UserRole.USER]: [
    Permission.FUNNELS_READ,
    Permission.PRODUCTS_READ,
    Permission.AI_MENTOR,
    Permission.ANALYTICS_READ,         // Своя особиста статистика
  ],
  
  [UserRole.GUEST]: [
    Permission.FUNNELS_READ,
  ]
};

// Перевірка чи користувач має дозвіл
export const hasPermission = (userRole: UserRole, permission: Permission): boolean => {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) ?? false;
};

// Перевірка чи користувач має всі дозволи
export const hasAllPermissions = (userRole: UserRole, permissions: Permission[]): boolean => {
  const userPermissions = ROLE_PERMISSIONS[userRole] ?? [];
  return permissions.every(permission => userPermissions.includes(permission));
};

// Перевірка чи користувач має хоча б один дозвіл
export const hasAnyPermission = (userRole: UserRole, permissions: Permission[]): boolean => {
  const userPermissions = ROLE_PERMISSIONS[userRole] ?? [];
  return permissions.some(permission => userPermissions.includes(permission));
};

// Отримати всі дозволи ролі
export const getRolePermissions = (role: UserRole): Permission[] => {
  return ROLE_PERMISSIONS[role] ?? [];
};