// backend/src/modules/telegram-mentor/types.ts
// ══════════════════════════════════════════════════════════════
//  Питання керуються з адмін-панелі через БД (MentorQuestionSet).
//  Типи НЕ залежать від кількості чи змісту питань — все динамічно.
// ══════════════════════════════════════════════════════════════

// ── Session states ─────────────────────────────────────────────
// morning_q1, morning_q2 ... evening_q1 ... — будь-яка кількість
type QuestionIndex = `${'morning' | 'evening'}_q${number}`
type WheelSphere   = `wheel_${string}`

export type SessionState =
  | 'idle'
  | 'chat'
  | 'onboarding'
  | 'wheel'
  | QuestionIndex
  | WheelSphere

// ── Дані сесії (зберігаються в БД як JSON) ────────────────────
export interface SessionData {
  // Відповіді на питання: 'morning_q1' → 'відповідь юзера'
  answers?:     Record<string, string>

  // Який день треба зберегти в journal, навіть якщо сесія завершиться пізніше
  journalDate?: string

  // Ранковий/вечірній чекіни
  morning?:     Record<string, string>
  evening?:     Record<string, string>

  // Колесо балансу: 'гроші' → 7
  wheel?:       Record<string, number>

  // Вільний AI-чат
  chatHistory?: ChatMessage[]

  // Онбординг
  name?:  string
  phone?: string
  email?: string

  [key: string]: unknown
}

export interface ChatMessage {
  role:    'user' | 'assistant' | 'system'
  content: string
}

// ── Конфіг одного питання ─────────────────────────────────────
// Зберігається в БД, редагується в адмін-панелі
export interface Question {
  id:           string    // 'morning_q1', 'morning_q2' — генерується автоматично
  text:         string    // Текст питання (редагується в адмін-панелі)
  hint?:        string    // Підказка під питанням
  placeholder?: string    // Текст-плейсхолдер для відповіді
}

// ── Набір питань (один запис в БД) ────────────────────────────
// Адмін може мати кілька наборів і перемикатися між ними
export interface QuestionSet {
  id:        string
  name:      string       // Назва набору, напр. "Листопад 2026"
  isActive:  boolean      // Тільки один активний одночасно
  morning:   Question[]   // Ранкові питання (будь-яка кількість)
  evening:   Question[]   // Вечірні питання (будь-яка кількість)
  createdAt: Date
  updatedAt: Date
}

// ── Розклад відправки ──────────────────────────────────────────
export interface ScheduleConfig {
  morningHour:       number   // 8
  eveningHour:       number   // 20
  timezoneOffset:    number   // +2 Київ
  weeklyReportDay:   number   // 0 = неділя
  weeklyReportHour:  number   // 19
  monthlyReportDay:  number   // 1
  monthlyReportHour: number   // 12
}

export const DEFAULT_SCHEDULE: ScheduleConfig = {
  morningHour:       8,
  eveningHour:       20,
  timezoneOffset:    2,
  weeklyReportDay:   0,
  weeklyReportHour:  19,
  monthlyReportDay:  1,
  monthlyReportHour: 12,
}

// ── Дефолтний набір питань (fallback якщо БД порожня) ─────────
// Адмін замінює через панель — цей код більше не змінюється
export const DEFAULT_QUESTION_SET: Omit<QuestionSet, 'id' | 'createdAt' | 'updatedAt'> = {
  name:     'Дефолт',
  isActive: true,
  morning: [
    { id: 'morning_q1', text: 'Хто я сьогодні?',                        hint: 'Опиши себе як нову версію — з позиції сили (1 речення)' },
    { id: 'morning_q2', text: 'Яка я?',                                  hint: 'Наприклад: сильна, смілива, рішуча...' },
    { id: 'morning_q3', text: 'Мої 10 цілей на рік',                     hint: 'Пропиши щодня наново — ніби вони вже реальність' },
    { id: 'morning_q4', text: 'На яку одну ціль я фокусуюсь сьогодні?',  hint: 'Те, що хочеш просунути прямо зараз' },
    { id: 'morning_q5', text: 'Який мій стан сьогодні?',                 hint: 'Опиши свій стан прямо зараз' },
    { id: 'morning_q6', text: 'Чому я гідна мати все це прямо зараз?',   hint: 'Одна сильна відповідь із позиції самоцінності' },
  ],
  evening: [
    { id: 'evening_q1', text: 'Що мене сьогодні наповнило енергією?',                 hint: 'Люди, дії, ситуації, стани' },
    { id: 'evening_q2', text: 'Де я сьогодні злила енергію чи втратила стан?',        hint: 'Тригер, сумнів, ситуація, реакція' },
    { id: 'evening_q3', text: 'Яка програма або переконання активувалась сьогодні?',  hint: 'Наприклад: страх, "мені не вийде"...' },
    { id: 'evening_q4', text: 'З якої точки я діяла сьогодні: сили чи страху?',       hint: 'Чесна відповідь. Що керувало тобою?' },
    { id: 'evening_q5', text: 'Яка моя головна перемога сьогодні?',                   hint: 'Дія, стан, рішення — будь-який успіх' },
  ],
}

// Динамічні питання — вибираються на основі відповідей юзера
// TODO: тексти питань взяти з ТЗ
export const DYNAMIC_QUESTIONS = [
  { id: 'dynamic_q1', text: 'TODO: dynamic_q1 з ТЗ' },
  { id: 'dynamic_q2', text: 'TODO: dynamic_q2 з ТЗ' },
  { id: 'dynamic_q3', text: 'TODO: dynamic_q3 з ТЗ' },
  { id: 'dynamic_q4', text: 'TODO: dynamic_q4 з ТЗ' },
] as const

// Логіка вибору: скільки динамічних питань показати
export function getDynamicQuestionsCount(lifecycleState: string): number {
  // Новий юзер: 2 питання
  // Активний (ZOOM_MEMBER+): 4 питання
  const activeStates = ['ZOOM_MEMBER', 'POST_ZOOM_1', 'UPSELL']
  return activeStates.includes(lifecycleState) ? 4 : 2
}

// ── Сфери колеса балансу (редагуються в адмін-панелі) ─────────
export const DEFAULT_WHEEL_SPHERES: string[] = [
  'гроші',
  'реалізація',
  'відносини',
  'енергія / тіло',
  'свобода / час',
  'внутрішня опора',
]

// ── Допоміжні типи ────────────────────────────────────────────
export interface LinkedUser {
  userId:   string
  chatId:   string
  userName: string | null
}

// Відповідь на одне питання зі збереженим текстом (для звітів)
export interface QuestionAnswer {
  questionId:   string   // 'morning_q1'
  questionText: string   // текст питання на момент відповіді (snapshot)
  answer:       string
  answeredAt:   Date
}

export type ReportType = 'weekly' | 'monthly'

export interface ReportContext {
  userId:   string
  type:     ReportType
  answers:  QuestionAnswer[]
  dateFrom: Date
  dateTo:   Date
}
