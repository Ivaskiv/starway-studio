// shared/src/constants/roles.ts

import { UserRole } from '../types/auth.types';

// Ієрархія ролей (чим більше число - тим більше прав)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 4,
  [UserRole.ADMIN]: 3,
  [UserRole.USER]: 2,
  [UserRole.GUEST]: 1
};

// Перевірка чи роль має вищий рівень доступу
export const hasHigherRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

// Дозволені переходи між ролями
export const ALLOWED_ROLE_TRANSITIONS: Record<UserRole, UserRole[]> = {
  [UserRole.SUPER_ADMIN]: [UserRole.ADMIN, UserRole.USER, UserRole.GUEST],
  [UserRole.ADMIN]: [UserRole.USER, UserRole.GUEST],
  [UserRole.USER]: [UserRole.GUEST],
  [UserRole.GUEST]: []
};

// Можливість зміни ролі
export const canChangeRole = (fromRole: UserRole, toRole: UserRole): boolean => {
  return ALLOWED_ROLE_TRANSITIONS[fromRole]?.includes(toRole) ?? false;
};