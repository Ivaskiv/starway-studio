// frontend/src/features/wheel/services/wheel.types.ts
import { ABILITIES, Ability } from '@/features/auth/permissions/abilities';
import { withNormalizer } from '@/shared/utils/apiNormalizer';
import {
  LayoutDashboard,
  Package,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  User,
} from 'lucide-react';

export type WheelArea =
  | 'money'
  | 'realization'
  | 'relationships'
  | 'energy_body'
  | 'freedom_time'
  | 'inner_support'
  | 'environment'
  | 'meaning_direction';

export interface WheelCategory {
  id: string;
  name: string;
  nameUk: string;
  emoji: string;
  color: string;
  label?: string;
  description?: string;
}
export interface WheelScore {
  categoryId: string;
  score: number;
  // notes?: string
  comment?: string;
  emoji?: string;
}

export interface WheelAssessment {
  id: string;
  userId: string;
  scores: WheelScore[];
  totalScore: number;
  averageScore: number;
  strengths?: string[];
  gaps?: string[];
  createdAt: string;
  completedAt?: string;
  notes?: string;
}

export interface WheelAnalysis {
  strengths: WheelCategory[];
  gaps: WheelCategory[];
  recommendations: string[];
  focusArea: WheelCategory;
  balanceScore: number;
}

export interface SaveWheelRequest {
  scores: WheelScore[];
}

export interface SaveWheelResponse {
  id: string;
  userId: string;
  createdAt: string;
}

export const normalizeWheelCategory = withNormalizer<any, WheelCategory>(api => ({
  id: String(api.id),
  name: api.name,
  nameUk: api.nameUk,
  emoji: api.emoji,
  color: api.color,
  label: api.label,
  description: api.description,
}));

// ==============================
// WHEEL CATEGORIES CONSTANT
// ==============================
export const WHEEL_CATEGORIES: WheelCategory[] = [
  {
    id: 'money',
    name: 'Money',
    nameUk: 'Гроші',
    emoji: '💰',
    color: '#F59E0B',
    description: 'Доходи, фінансова стабільність',
  },
  {
    id: 'realization',
    name: 'Realization',
    nameUk: 'Реалізація',
    emoji: '💼',
    color: '#3B82F6',
    description: 'Справи, результат, самореалізація',
  },
  {
    id: 'relationships',
    name: 'Relationships',
    nameUk: 'Стосунки',
    emoji: '❤️',
    color: '#EF4444',
    description: 'Сім’я, друзі, робота',
  },
  {
    id: 'energy_body',
    name: 'Energy / Body',
    nameUk: 'Енергія / тіло',
    emoji: '⚡',
    color: '#8B5CF6',
    description: 'Ресурс, сон, фізичний стан',
  },
  {
    id: 'freedom_time',
    name: 'Freedom / Time',
    nameUk: 'Свобода / час',
    emoji: '🕒',
    color: '#EC4899',
    description: 'Контроль часу, простір для рішень',
  },
  {
    id: 'environment',
    name: 'Environment',
    nameUk: 'Середовище',
    emoji: '🏠',
    color: '#06B6D4',
    description: 'Люди та умови навколо',
  },
  {
    id: 'inner_support',
    name: 'Inner Support',
    nameUk: 'Внутрішня опора',
    emoji: '🧭',
    color: '#A855F7',
    description: 'Стійкість, внутрішній стан',
  },
  {
    id: 'meaning_direction',
    name: 'Meaning / Direction',
    nameUk: 'Сенс / напрям',
    emoji: '🎯',
    color: '#14B8A6',
    description: 'Вектор та сенс руху',
  },
];

export const normalizeWheelScore = withNormalizer<any, WheelScore>(api => ({
  categoryId: String(api.categoryId),
  score: Number(api.score),
  notes: api.notes ?? undefined,
  id: String(api.id),
  value: Number(api.value),
}));

export const normalizeWheelAssessment = withNormalizer<any, WheelAssessment>(api => ({
  id: String(api.id),
  userId: String(api.userId),
  // scores: normalizeWheelScore(api.scores ?? []) as WheelScore[],
  scores: normalizeWheelScore(api.scores ?? []) as WheelScore[],
  totalScore: Number(api.totalScore),
  averageScore: Number(api.averageScore),
  strengths: api.strengths ?? [],
  gaps: api.gaps ?? [],
  createdAt: api.createdAt,
  completedAt: api.completedAt ?? undefined,
  notes: api.notes ?? undefined,
}));

export const normalizeWheelAnalysis = withNormalizer<any, WheelAnalysis>(api => ({
  strengths: normalizeWheelCategory(api.strengths ?? []) as WheelCategory[],
  gaps: normalizeWheelCategory(api.gaps ?? []) as WheelCategory[],
  recommendations: api.recommendations ?? [],
  focusArea: normalizeWheelCategory(api.focusArea) as WheelCategory,
  balanceScore: Number(api.balanceScore),
}));

export interface WheelDelta {
  area: WheelArea;
  delta: number;
  source: 'microTask';
  relatedTaskId: string;
  createdAt: string;
}
export const SPHERE_LABELS = {
  health: 'Здоровʼя',
  energy: 'Енергія',
  emotions: 'Емоційний стан',
  mind: 'Мислення',
  productivity: 'Продуктивність',
  finance: 'Фінанси',
  career: 'Карʼєра',
  business: 'Бізнес',
  relationships: 'Стосунки',
  family: 'Сімʼя',
  friends: 'Друзі',
  love: 'Любов',
  spirituality: 'Духовність',
  selfDevelopment: 'Саморозвиток',
  rest: 'Відпочинок',
  hobbies: 'Хобі',
} as const;
export type WheelSphere = keyof typeof SPHERE_LABELS;

export interface WheelPDFData {
  id: string;
  userId: string;
  userName: string;
  isEmail?: boolean;
  scores: Array<{
    sphere: string;
    score: number;
    comment: string;
  }>;
  weakestSphere: WheelSphere;
  focusSphere: WheelSphere;
  analysis: string;
  createdAt: string;
}

export interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  ability?: Ability;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    to: '/dashboard/wheel',
    icon: Target,
    label: 'Колесо балансу',
    ability: ABILITIES.WHEEL_VIEW,
  },
  {
    to: '/dashboard/ai-mentor',
    icon: Sparkles,
    label: 'AI Ментор',
    ability: ABILITIES.AI_USE,
  },
  {
    to: '/dashboard/progress',
    icon: TrendingUp,
    label: 'Прогрес',
    ability: ABILITIES.PROGRESS_VIEW,
  },
  {
    to: '/dashboard/products',
    icon: Package,
    label: 'Продукти',
    ability: ABILITIES.PRODUCTS_MANAGE,
    adminOnly: true,
  },
  {
    to: '/dashboard/profile',
    icon: User,
    label: 'Профіль',
    ability: ABILITIES.PROFILE_VIEW,
  },
  {
    to: '/dashboard/settings',
    icon: Settings,
    label: 'Налаштування',
    ability: ABILITIES.SETTINGS_MANAGE,
  },
];
export interface CreateWheelAssessmentInput {
  userId: string;
  scores: WheelScore[];
}

export type WheelCooldownKey =
  | 'create' // раз на X днів (trial / paid)
  | 'download_pdf' // антиабʼюз
  | 'recalculate' // щоб не клікали 20 разів
  | 'view_result'; // UX-контроль

// приклад
// const cooldown: WheelCooldown = {
//   create: 1738459200000,
//   view_result: 0,
//   download_pdf: 1738400000000,
//   recalculate: 0,
// }

// Це anti-abuse, бо:
// AI коштує гроші
// PDF — ресурси
// логіка trial не має ламатись

