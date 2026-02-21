// packages/frontend/src/features/auth/utils/can.ts
import { RootState } from '@/app/store';
import { Ability, ABILITIES } from './abilities';
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
