// backend/src/modules/wheel/wheel.types.ts

export interface WheelConfigItem {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

export interface WheelScore {
  categoryId: string;
  score: number;
  comment?: string | null;
}

export interface WheelUserContext {
  name: string | null;
  email: string | null;
  phone: string | null;
  gender: string | null;
  age: number | null;
}

export interface WheelPDFData {
  userName: string;
  scores: WheelScore[];
  weakestSphere: string;
  focusSphere: string;
  analysis: string;
  createdAt: string;
}

export interface WheelAnalytics {
  totalAssessments: number;
  averageScores: Record<string, number>;
  mostCommonWeakest: string;
  mostCommonFocus: string;
  trend: 'improving' | 'declining' | 'stable';
}

export const SPHERE_LABELS: Record<string, string> = {
  money: 'Гроші',
  realization: 'Реалізація',
  relationships: 'Відносини',
  energy: 'Енергія/Тіло',
  freedom: 'Свобода/Час',
  innerSupport: 'Внутрішня опора',
  health: "Здоров'я",
  growth: 'Розвиток',
};

export const WHEEL_CONFIG: WheelConfigItem[] = [
  { id: 'money', label: 'Гроші', emoji: '💰', description: 'Фінансова стабільність' },
  { id: 'realization', label: 'Реалізація', emoji: '🎯', description: 'Кар\'єра та досягнення' },
  { id: 'relationships', label: 'Відносини', emoji: '❤️', description: 'Сім\'я та друзі' },
  { id: 'energy', label: 'Енергія', emoji: '⚡', description: 'Фізична форма' },
  { id: 'freedom', label: 'Свобода', emoji: '🕊️', description: 'Час для себе' },
  { id: 'innerSupport', label: 'Внутрішня опора', emoji: '🧘', description: 'Спокій та впевненість' },
  { id: 'health', label: 'Здоров\'я', emoji: '🏥', description: 'Фізичне здоров\'я' },
  { id: 'growth', label: 'Розвиток', emoji: '📚', description: 'Навчання та зростання' },
];