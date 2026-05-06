import type { WheelSphereId } from '@/features/wheel/types/wheel.types'
import { WHEEL_CATEGORIES } from '@/features/wheel/types/wheel.types'
import type { WheelAssessment } from '@/features/wheel/types/wheel.types'

export type WheelUserState = 'first_time' | 'in_progress' | 'completed'

export const WHEEL_ONBOARDING_COPY = {
  badge: 'Крок 1 з 3 · Діагностика',
  h1: 'Де ти зараз насправді?',
  sub: 'Колесо балансу — це не тест. Це чесний знімок твого стану прямо зараз. Без правильних і неправильних відповідей.',
  cta: 'Почати діагностику — 5 хвилин →',
  hint: 'Ти оцінюєш 8 сфер від 1 до 10. Жодних правильних відповідей.',
  why: [
    {
      title: 'Побачиш реальну картину',
      sub: 'Де є ресурс, а де — діра, яку ти ігноруєш',
    },
    {
      title: 'Зрозумієш пріоритет',
      sub: 'Система покаже, з якої сфери краще почати зміни',
    },
    {
      title: 'Отримаєш карту цілей',
      sub: 'Після діагностики зберемо WEB-Карту цілей без зайвого шуму',
    },
  ],
} as const

export const WHEEL_SPHERE_QUESTIONS: Record<WheelSphereId, string> = {
  finance: 'Наскільки ти задоволена своїм фінансовим станом і стабільністю?',
  career: 'Як ти відчуваєш себе у своїй справі — чи є реалізація і рух вперед?',
  relationships: 'Наскільки ти задоволена своїми відносинами — з партнером, близькими, друзями?',
  energy: 'Яке відчуття від свого тіла і рівня енергії прямо зараз?',
  freedom: "Чи є у тебе час і простір для себе — без обов'язків і очікувань?",
  mind: 'Наскільки ти відчуваєш внутрішню стабільність і опору в собі?',
  health: "Як ти оцінюєш своє фізичне і ментальне здоров'я зараз?",
  selfDevelopment: 'Чи відчуваєш ти, що ростеш і розвиваєшся в тому, що важливо?',
}

export const WHEEL_GUIDE_PHRASES: Record<WheelSphereId, string[]> = {
  finance: ['дохід', 'бюджет', 'баланс', 'заощадження'],
  career: ["кар'єра", 'справа', 'навички', 'результат'],
  relationships: ['любов', 'близькість', 'друзі', 'підтримка'],
  energy: ['сон', 'тіло', 'рух', 'відновлення'],
  freedom: ['час для себе', 'простір', 'межі', 'вибір'],
  mind: ['спокій', 'опора', 'усвідомленість', 'самоцінність'],
  health: ['харчування', 'гігієна', 'ментал', 'стан'],
  selfDevelopment: ['навчання', 'творчість', 'розвиток', 'новизна'],
}

export const WHEEL_STATUS_TABS = [
  'Новий користувач',
  'В процесі',
  'Завершено',
  'WEB-Карта цілей',
] as const

export const getWheelScoreTone = (score: number) => {
  if (score <= 3) return 'critical'
  if (score <= 6) return 'warning'
  return 'good'
}

export const getWheelCategoryById = (categoryId: WheelSphereId) =>
  WHEEL_CATEGORIES.find(category => category.id === categoryId)

export const resolveWheelState = (
  snapshots: WheelAssessment[],
  activeSession: { completedAt?: string | null } | { step: number } | null,
): WheelUserState => {
  if (activeSession && ('step' in activeSession || !activeSession.completedAt)) return 'in_progress'
  if (!snapshots.length) return 'first_time'
  return 'completed'
}
