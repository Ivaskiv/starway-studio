// backend/src/modules/streak/types.ts
// backend/src/modules/streak/types.ts
// Типи для streak-модуля + фронт / бек повна синхронізація

import type { Streak as PrismaStreak } from '@prisma/client';

// Базовий streak з prisma
export type Streak = PrismaStreak;

// Rule keys — строго
export type StreakRuleKey = 'daily_checkin' | 'wheel_activity';

// DTO для API
export interface RegisterStreakInput {
  userId: string;
  expertId: string;
  ruleKey: StreakRuleKey;
  at?: string; // ISO
}

// Відповідь для frontend / telegram
export interface StreakInfo {
  ruleKey: StreakRuleKey;
  current: number;
  longest: number;
  totalDays: number;
  lastAt: string;
  isActive: boolean;
}
// backend/src/modules/streak/rules.ts
// Описує правила streak, версіоновано


export interface StreakRule {
  key: string;
  version: number;
  maxGapDays: number;
}

export const STREAK_RULES: Record<string, StreakRule> = {
  daily_checkin: {
    key: 'daily_checkin',
    version: 1,
    maxGapDays: 1,
  },
  wheel_activity: {
    key: 'wheel_activity',
    version: 1,
    maxGapDays: 30,
  },
};