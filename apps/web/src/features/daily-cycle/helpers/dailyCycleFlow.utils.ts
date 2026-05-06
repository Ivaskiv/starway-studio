import type { DayAnalysis } from '@/features/daily-cycle/types/daily.types'

import type { DailyDraftState } from './dailyCycleFlow.types'

export function toDateKey(value: string | Date) {
  const date = typeof value === 'string' ? new Date(value) : value
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDraftKey(userId: string, session: 'morning' | 'evening', dateKey: string) {
  return `starway_daily_cycle_draft:${userId || 'guest'}:${session}:${dateKey}`
}

export function loadDraft(
  userId: string,
  session: 'morning' | 'evening',
  dateKey: string,
): DailyDraftState | null {
  try {
    const raw = window.localStorage.getItem(getDraftKey(userId, session, dateKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<DailyDraftState>
    return {
      answers: parsed.answers && typeof parsed.answers === 'object'
        ? parsed.answers as Record<string, string>
        : {},
      step: typeof parsed.step === 'number' ? parsed.step : 0,
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.filter(question =>
          question
          && typeof question === 'object'
          && typeof question.id === 'string'
          && typeof question.label === 'string'
          && typeof question.placeholder === 'string'
          && (question.type === 'text' || question.type === 'textarea'),
        )
        : undefined,
    }
  } catch {
    return null
  }
}

export function saveDraft(
  userId: string,
  session: 'morning' | 'evening',
  dateKey: string,
  draft: DailyDraftState,
) {
  try {
    window.localStorage.setItem(getDraftKey(userId, session, dateKey), JSON.stringify(draft))
  } catch {
    // ignore persistence errors
  }
}

export function clearDraft(userId: string, session: 'morning' | 'evening', dateKey: string) {
  try {
    window.localStorage.removeItem(getDraftKey(userId, session, dateKey))
  } catch {
    // ignore persistence errors
  }
}

export function getDateKey(daysOffset = 0) {
  const date = new Date()
  date.setDate(date.getDate() + daysOffset)
  return [
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function getSessionAnswersFromContent(content: unknown, session: 'morning' | 'evening') {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return null
  const sessionContent = (content as Record<string, unknown>)[session]
  if (!sessionContent || typeof sessionContent !== 'object' || Array.isArray(sessionContent)) return null
  return sessionContent as Record<string, string>
}

export function getSessionMeta(content: unknown, session: 'morning' | 'evening') {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return null
  const metaKey = session === 'morning' ? 'morningMeta' : 'eveningMeta'
  const meta = (content as Record<string, unknown>)[metaKey]
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  return meta as Record<string, unknown>
}

export function getSessionResumeIndex(content: unknown, session: 'morning' | 'evening') {
  const meta = getSessionMeta(content, session)
  if (!meta) return 0
  const rawIndex = typeof meta.lastQuestionIndex === 'number' ? meta.lastQuestionIndex : 0
  return Math.max(0, rawIndex)
}

export function getSessionCompletedAt(content: unknown, session: 'morning' | 'evening') {
  const meta = getSessionMeta(content, session)
  return typeof meta?.completedAt === 'string' ? meta.completedAt : null
}

export function formatCompactDateKey(dayKey: string) {
  const [year, month, day] = dayKey.split('-').map(Number)
  if (!year || !month || !day) return dayKey
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`
}

export function parseDateKey(dayKey: string) {
  const [year, month, day] = dayKey.split('-').map(Number)
  if (!year || !month || !day) return null
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return null
  date.setHours(0, 0, 0, 0)
  return date
}

const ANALYSIS_FALLBACK_TEXT = 'AI-аналіз тимчасово недоступний. Відповіді збережено без втрати даних.'

function normalizeLevel(value: unknown): DayAnalysis['energy_level'] {
  return value === 'high' || value === 'medium' || value === 'low' ? value : 'medium'
}

function trimText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function trimList(value: unknown, maxItems: number) {
  if (!Array.isArray(value)) return []
  return value
    .map(item => trimText(item))
    .filter(Boolean)
    .slice(0, maxItems)
}

export function buildEveningFallbackSummary(answers: Record<string, string> | null | undefined) {
  if (!answers) return null

  const win = answers.win?.trim()
  const energyIn = answers.energy_in?.trim()
  const energyOut = answers.energy_out?.trim()
  const program = answers.program?.trim()
  const powerSource = answers.power_source?.trim()

  const parts = [
    win ? `Твоя головна перемога сьогодні: ${win}.` : null,
    energyIn ? `Силу сьогодні давало: ${energyIn}.` : null,
    energyOut ? `Енергію забирало: ${energyOut}.` : null,
    program ? `Варто помітити програму або патерн: ${program}.` : null,
    powerSource ? `На завтра тримай фокус на дії з точки: ${powerSource}.` : null,
  ].filter((value): value is string => Boolean(value))

  return parts.length > 0
    ? parts.join(' ')
    : 'День зафіксовано. Головне зараз — забрати з нього один висновок і перенести фокус на завтра.'
}

function buildFallbackDayAnalysis(
  fallbackAnswers: Record<string, string> | null | undefined,
): DayAnalysis {
  const win = trimText(fallbackAnswers?.win)
  const energyIn = trimText(fallbackAnswers?.energy_in)
  const energyOut = trimText(fallbackAnswers?.energy_out)
  const program = trimText(fallbackAnswers?.program)
  const powerSource = trimText(fallbackAnswers?.power_source)

  return {
    energy_level: energyIn ? 'medium' : 'low',
    focus_level: powerSource || win ? 'medium' : 'low',
    drain_level: energyOut ? 'medium' : 'low',
    main_insight: buildEveningFallbackSummary(fallbackAnswers)
      ?? 'День збережено. Вже видно, що саме дало опору, що забирало енергію і куди варто тримати фокус завтра.',
    what_worked: [win, energyIn, powerSource].filter(Boolean).slice(0, 3),
    active_pattern: {
      title: program || 'Патерн дня ще формується',
      description: program
        ? `Сьогодні найпомітніше проявлявся патерн «${program}». На завтра важливо помітити його раніше і повернути себе в дію.`
        : 'По відповідях вже видно напрям, але назву патерну краще уточнити після ще одного завершеного дня.',
    },
    energy_drain_summary: energyOut
      ? `Найбільше енергію забирало: ${energyOut}.`
      : 'Сильного зливу не зафіксовано, але варто ще поспостерігати, де саме сиплеться увага.',
    drain_chips: energyOut ? [energyOut].slice(0, 2) : [],
    tomorrow: [
      powerSource || 'Одна конкретна дія до 12:00.',
      win ? `Повтори те, що вже спрацювало: ${win}.` : 'Повтори одну дію, яка сьогодні дала відчуття руху.',
      energyOut ? `Злови момент, коли знову з’явиться: ${energyOut}.` : 'Познач увечері, що найбільше забрало енергію.',
    ].filter(Boolean).slice(0, 3),
  }
}

export function normalizeDailyAnalysis(
  rawAnalysis: unknown,
  fallbackAnswers: Record<string, string> | null | undefined,
) : DayAnalysis {
  let parsed: unknown = rawAnalysis

  if (typeof rawAnalysis === 'string') {
    const trimmed = rawAnalysis.trim()
    if (!trimmed || trimmed === ANALYSIS_FALLBACK_TEXT) {
      return buildFallbackDayAnalysis(fallbackAnswers)
    }

    try {
      parsed = JSON.parse(trimmed)
    } catch {
      return {
        ...buildFallbackDayAnalysis(fallbackAnswers),
        main_insight: trimmed,
      }
    }
  }

  const record =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null

  if (!record) {
    return buildFallbackDayAnalysis(fallbackAnswers)
  }

  const activePattern =
    record.active_pattern && typeof record.active_pattern === 'object' && !Array.isArray(record.active_pattern)
      ? record.active_pattern as Record<string, unknown>
      : {}

  const fallback = buildFallbackDayAnalysis(fallbackAnswers)

  return {
    energy_level: normalizeLevel(record.energy_level),
    focus_level: normalizeLevel(record.focus_level),
    drain_level: normalizeLevel(record.drain_level),
    main_insight: trimText(record.main_insight) || fallback.main_insight,
    what_worked: trimList(record.what_worked, 3),
    active_pattern: {
      title: trimText(activePattern.title) || fallback.active_pattern.title,
      description: trimText(activePattern.description) || fallback.active_pattern.description,
    },
    energy_drain_summary: trimText(record.energy_drain_summary) || fallback.energy_drain_summary,
    drain_chips: trimList(record.drain_chips, 2),
    tomorrow: trimList(record.tomorrow, 3).length > 0 ? trimList(record.tomorrow, 3) : fallback.tomorrow,
  }
}

function startOfDay(value: Date) {
  const next = new Date(value)
  next.setHours(0, 0, 0, 0)
  return next
}

function getDaysDiff(from: Date, to: Date) {
  const diff = startOfDay(to).getTime() - startOfDay(from).getTime()
  return Math.floor(diff / (24 * 60 * 60 * 1000))
}

export function getCycleDayForDate(input: {
  dateKey: string
  fallbackDay: number
  trialStartedAt?: string | null
  paidStartedAt?: string | null
  isPaidCycle: boolean
}) {
  const targetDate = parseDateKey(input.dateKey)
  if (!targetDate) return Math.max(1, input.fallbackDay || 1)

  const anchorRaw = input.isPaidCycle ? input.paidStartedAt : input.trialStartedAt
  if (!anchorRaw) return Math.max(1, input.fallbackDay || 1)

  const anchorDate = new Date(anchorRaw)
  if (Number.isNaN(anchorDate.getTime())) return Math.max(1, input.fallbackDay || 1)

  return Math.max(1, getDaysDiff(anchorDate, targetDate) + 1)
}
