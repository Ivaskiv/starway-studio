import type { ContentPlanMode, ContentPlanScope } from '../../modules/coach-content/contentPlanner.service.js'

const COACH_CONTENT_ACCESS_DENIED = 'Цей модуль доступний тільки для коуча.'
const COACH_CONTENT_NOTE_PROMPT = 'Надішли наступним повідомленням текст нотатки.'
const COACH_CONTENT_NOTE_SAVED = '✅ Нотатку збережено.'
const COACH_CONTENT_NOTE_EMPTY = 'Нотатка порожня. Спробуй ще раз.'

export const coachContent = {
  accessDenied: COACH_CONTENT_ACCESS_DENIED,
  planner: {
    title: 'Планер контенту',
    intro: 'Я зберу останні Zoom-транскрипції та нотатки, а потім згенерую чернетку.',
    collecting: 'Можеш одразу написати фокус теми або натиснути "Продовжити".',
    collectingHint: 'Наприклад: "фокус на продажах" або "тема: вигорання".',
    periodPrefix: 'Період:',
    monthlyPeriodPrefix: 'Місяць:',
    generating: 'Готую чернетку на основі контексту...',
    confirming: 'Ось чернетка. Перевір і підтверди, або перепиши.',
    focusPrefix: 'Фокус:',
    focusNoTopic: 'Фокус: без уточнення',
    zoomContextTitle: 'Zoom-контекст:',
    notesTitle: 'Нотатки:',
    saved: '✅ План збережено.',
    noData: 'Поки немає достатньо контексту, але я все одно можу зібрати чернетку.',
    noteSaved: `${COACH_CONTENT_NOTE_SAVED} для наступного планера.`,
    noteWaiting: COACH_CONTENT_NOTE_PROMPT,
    noteEmpty: COACH_CONTENT_NOTE_EMPTY,
    zoomListTitle: '📅 Zoom на цей тиждень',
    zoomListEmpty: 'На цей тиждень ще немає запланованих Zoom-сесій.',
    zoomListCaption: 'Ось поточний розклад.',
    cancelled: 'Ок, сесію планування скасовано.',
    errorFallback: 'Не вдалося згенерувати чернетку. Спробуй ще раз пізніше.',
    aiNotConfigured: 'Claude ще не підключено. Перевір ANTHROPIC_API_KEY.',
    monthlyPrompt: 'Аналізую місяць...',
    monthlyTitle: 'Контент-план на місяць',
    monthlySaved: 'Місячний план збережено.',
  },
  buttons: {
    confirm: 'Підтвердити',
    rewrite: 'Переписати',
    changeTopic: 'Змінити тему',
    monthlyPlan: 'Місячний план',
    continue: 'Продовжити',
    sales: 'Фокус на продажах',
    burnout: 'Тема: вигорання',
    clear: 'Без уточнення',
    cancel: 'Скасувати',
  },
  note: {
    title: 'Нотатка',
    prompt: COACH_CONTENT_NOTE_PROMPT,
    saved: COACH_CONTENT_NOTE_SAVED,
  },
  mode: {
    WEEKLY_PLAN: 'Планер тижня',
    MONTHLY_PLAN: 'Планер місяця',
    REELS_IDEAS: 'Ідеї для Reels',
    FULL_CONTENT: 'Повний контент-пакет',
  } satisfies Record<ContentPlanMode, string>,
  topics: {
    sales: 'фокус на продажах',
    burnout: 'тема: вигорання',
  },
  prompts: {
    system: [
      'Ти стратег контенту для Надії.',
      'Працюй лише українською.',
      'Опирайся на Zoom-транскрипції та нотатки.',
      'Не вигадуй факти, яких немає в контексті.',
      'Будь конкретним і практичним.',
      'Не перевищуй 2000 токенів відповіді.',
      'Якщо контексту мало, чесно скажи, чого бракує.',
    ].join(' '),
    weeklyPlan: 'Згенеруй планер тижня: 1) ключовий фокус тижня, 2) бізнес-сигнали з контексту, 3) контент-зони, 4) 3-5 тем для постів, 5) 3-5 тем для Reels, 6) що поставити в Zoom/живі сесії.',
    monthlyPlan: 'Згенеруй планер на місяць: 1) короткий місячний огляд тем із Zoom-транскриптів, 2) 4 тижні контент-плану по одній головній темі на тиждень, 3) рекомендації по Reels на місяць, 4) ключові акценти для постів та Zoom-акцентів, 5) короткий висновок по динаміці місяця.',
    reelsIdeas: 'Згенеруй список тем для Reels на тиждень: 10 ідей з коротким хуком, основною думкою та CTA.',
    fullContent: 'Згенеруй повний контент-пакет на тиждень: контент-план, ідеї для Reels, теми для Stories, теми для постів, пропозицію для Zoom-акцентів.',
    clarification: 'Якщо є уточнення по темі, врахуй його як головний фокус.',
  },
} as const

export function buildPlannerUserPrompt(input: {
  mode: ContentPlanMode
  scope: ContentPlanScope
  periodRange: string
  topic?: string | null
  zoomDigest: string
  noteDigest: string
}): string {
  const topicLine = String(input.topic ?? '').trim() || 'без додаткового уточнення'
  const modePrompt = input.mode === 'WEEKLY_PLAN'
    ? coachContent.prompts.weeklyPlan
    : input.mode === 'MONTHLY_PLAN'
      ? coachContent.prompts.monthlyPlan
    : input.mode === 'REELS_IDEAS'
      ? coachContent.prompts.reelsIdeas
      : coachContent.prompts.fullContent
  const scopeLabel = input.scope === 'MONTHLY'
    ? coachContent.planner.monthlyPeriodPrefix
    : coachContent.planner.periodPrefix

  return [
    `Режим: ${coachContent.mode[input.mode]}`,
    `${scopeLabel} ${input.periodRange}`,
    `Фокус: ${topicLine}`,
    '',
    modePrompt,
    '',
    coachContent.prompts.clarification,
    '',
    'Контекст Zoom:',
    input.zoomDigest || 'Немає Zoom-транскрипцій за вибраний період.',
    '',
    'Нотатки:',
    input.noteDigest || 'Нотаток за вибраний період немає.',
  ].join('\n')
}

export function buildPlannerResultTitle(mode: ContentPlanMode, weekRange: string): string {
  return `${coachContent.mode[mode]} — ${weekRange}`
}

export function buildPlannerReplyCaption(mode: ContentPlanMode, weekRange: string): string {
  return `${buildPlannerResultTitle(mode, weekRange)}\n\n${coachContent.planner.confirming}`
}

export function buildZoomListHeader(weekRange: string): string {
  return `${coachContent.planner.zoomListTitle} — ${weekRange}`
}

export function buildZoomListMessage(weekRange: string, sessions: Array<{
  scheduledAt: Date
  topic: string
  type: string
  status: string
}>): string {
  if (sessions.length === 0) {
    return [
      `${coachContent.planner.zoomListTitle} — ${weekRange}`,
      '',
      coachContent.planner.zoomListEmpty,
    ].join('\n')
  }

  const lines = sessions.map((session) => {
    const time = session.scheduledAt.toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Kyiv',
    })
    return `• ${time} — ${session.topic} (${session.type}, ${session.status})`
  })

  return [
    `${coachContent.planner.zoomListTitle} — ${weekRange}`,
    '',
    ...lines,
  ].join('\n')
}
