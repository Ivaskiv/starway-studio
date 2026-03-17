// packages/frontend/src/features/auth/utils/can.ts
import { RootState } from '@/app/store';
import { ABILITIES, Ability } from '@/features/auth/permissions/abilities';
import { useSelector } from 'react-redux';

/**
 * Хук для React, щоб перевіряти ability
 */
export function useAbility(ability: Ability): boolean {
  const userAbilities = useSelector((state: RootState) => state.auth.user?.abilities || []);
  return userAbilities.includes(ability);
}

/**
 * Повертає всі abilities як масив рядків
 */
export function getAllAbilities(): Ability[] {
  return Object.values(ABILITIES);
}
