// frontend/src/features/daily-cycle/types/daily.types.ts
// ── Фронтенд-типи для Daily Cycle ──────────────────────────────────────────
// Бекенд зберігає англійські enum-значення (TENSION, DOUBT, ...)
// UI показує і приймає українські рядки
// Обидва варіанти валідні — union підтримує обидва

/* ── State ── */
export type DailyState =
  | 'TENSION'       | 'напруга'
  | 'FEAR'          | 'страх'
  | 'STABILITY'     | 'стабільність'
  | 'INNER_SUPPORT' | 'внутрішня опора'

/* ── Drain ── */
export type DailyDrain =
  | 'DOUBT'             | 'сумнів'
  | 'PROCRASTINATION'   | 'прокрастинація'
  | 'EMOTIONAL_DRAIN'   | 'емоційний злив'
  | 'EXTERNAL_PRESSURE' | 'зовнішній тиск'

/* ── Choice ── */
export type DailyChoice =
  | 'CONFIRMED_OLD' | 'підтверджувала старе'
  | 'CHOSE_NEW'     | 'обрала нове'

/* ── Маппінг UI → DB ── */
export const STATE_TO_DB: Record<string, string> = {
  'напруга':         'TENSION',
  'страх':           'FEAR',
  'стабільність':    'STABILITY',
  'внутрішня опора': 'INNER_SUPPORT',
}

export const DRAIN_TO_DB: Record<string, string> = {
  'сумнів':           'DOUBT',
  'прокрастинація':   'PROCRASTINATION',
  'емоційний злив':   'EMOTIONAL_DRAIN',
  'зовнішній тиск':   'EXTERNAL_PRESSURE',
}

export const CHOICE_TO_DB: Record<string, string> = {
  'підтверджувала старе': 'CONFIRMED_OLD',
  'обрала нове':          'CHOSE_NEW',
}

/* ── Дефолтні значення ── */
export const DEFAULT_DAILY_STATE: DailyState  = 'стабільність'
export const DEFAULT_DAILY_CHOICE: DailyChoice = 'обрала нове'

/* ── Entry (з БД) ── */
export interface DailyCycleEntry {
  id: string
  userId: string
  date: string
  state: DailyState
  drain?: DailyDrain
  choice: DailyChoice
  dayFact: string
  microSupport?: string
  content?: Record<string, unknown> | null
  createdAt: string
  updatedAt?: string
}

/* ── Input (у БД) ── */
export interface DailyCycleInput {
  state: DailyState
  drain?: DailyDrain
  choice: DailyChoice
  dayFact: string
  microSupport?: string
}

/* ── DTO з бекенду (legacy, тільки для daily.service) ── */
export type DailyEntryDTO = {
  state: 'stability' | 'innerSupport' | 'drain' | 'stressed' | 'neutral'
  drain?: string
  goal?: string
  goalCompleted?: boolean
  choice: {
    type: 'conscious' | 'automatic' | 'guided'
    description: string
  }
  decision?: string
  decisionReason?: string
  action?: string
  dayFact?: string
  microSupport?: string
}

export type DailyStats = {
  totalDays: number
  stabilityRate: number
  topDrain: string | null
}
