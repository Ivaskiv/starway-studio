// backend/src/modules/wheel/wheel.types.ts
// Використовується в: service.ts, ai.ts, pdf.ts, telegram.ts, controller.ts
// Prisma: UserBalanceEntry.scores (Json)

/* ───────────────────────────
 * Сфери
 * ─────────────────────────── */

export const FIXED_SPHERES = [
  'money',
  'realization',
  'relationships',
  'energy_body',
  'freedom_time',
  'inner_support',
  'environment',
  'meaning_direction',
] as const;

export type WheelSphereId = typeof FIXED_SPHERES[number];

/* ───────────────────────────
 * Конфіг колеса
 * ─────────────────────────── */

export interface WheelConfigItem {
  id: WheelSphereId;
  label: string;
  emoji: string;
  description: string;
}

export const WHEEL_CONFIG: WheelConfigItem[] = [
  { id: 'money',             label: 'Гроші',            emoji: '💰', description: 'Фінансова стабільність' },
  { id: 'realization',       label: 'Реалізація',        emoji: '🎯', description: 'Карʼєра та досягнення' },
  { id: 'relationships',     label: 'Відносини',         emoji: '❤️', description: 'Сімʼя та близькі' },
  { id: 'energy_body',       label: 'Енергія / Тіло',    emoji: '⚡', description: 'Фізичний стан та ресурс' },
  { id: 'freedom_time',      label: 'Свобода / Час',     emoji: '🕊️', description: 'Час для себе' },
  { id: 'inner_support',     label: 'Внутрішня опора',   emoji: '🧘', description: 'Спокій та впевненість' },
  { id: 'environment',       label: 'Оточення',          emoji: '🌿', description: 'Люди та середовище' },
  { id: 'meaning_direction', label: 'Сенс / Напрямок',   emoji: '✨', description: 'Ціль і вектор життя' },
];

export const SPHERE_LABELS: Record<WheelSphereId, string> =
  Object.fromEntries(WHEEL_CONFIG.map(s => [s.id, s.label])) as Record<WheelSphereId, string>;

/* ───────────────────────────
 * Дані користувача
 * ─────────────────────────── */

export interface WheelUserContext {
  name: string;
  email: string | null;
  phone: string | null;
  gender?: 'male' | 'female' | null;
  age: number | null;
}

/* ───────────────────────────
 * Scores (зберігається в Prisma Json)
 * ─────────────────────────── */

export interface WheelScore {
  categoryId: WheelSphereId;
  score: number;            // 1–10
  comment?: string | null;
}

/**
 * Формат збереження в БД:
 * {
 *   money: 6,
 *   realization: 8,
 *   ...
 * }
 */
export type WheelScoresMap = Record<WheelSphereId, number>;

/* ───────────────────────────
 * Аналітика
 * ─────────────────────────── */

export interface WheelAnalytics {
  totalAssessments: number;
  averageScores: Record<WheelSphereId, number>;
  mostCommonWeakest: WheelSphereId | '';
  mostCommonFocus: WheelSphereId | '';
  trend: 'improving' | 'declining' | 'stable';
}

/* ───────────────────────────
 * PDF / Export
 * ─────────────────────────── */

export interface WheelPDFData {
  userName: string;
  scores: WheelScore[];
  weakestSphere: WheelSphereId;
  focusSphere: WheelSphereId;
  analysis: string;
  createdAt: string;
}