import type { ContentPlanMode } from '../../modules/coach-content/contentPlanner.service.js'

export const coachContent = {
  accessDenied: 'Цей модуль доступний тільки для коуча.',
  planner: {
    title: 'Планер контенту',
    intro: 'Я зберу останні Zoom-транскрипції та нотатки, а потім згенерую чернетку.',
    collecting: 'Можеш одразу написати фокус теми або натиснути "Продовжити".',
    collectingHint: 'Наприклад: "фокус на продажах" або "тема: вигорання".',
    periodPrefix: 'Період:',
    generating: 'Готую чернетку на основі контексту...',
    confirming: 'Ось чернетка. Перевір і підтверди, або перепиши.',
    focusPrefix: 'Фокус:',
    focusNoTopic: 'Фокус: без уточнення',
    zoomContextTitle: 'Zoom-контекст:',
    notesTitle: 'Нотатки:',
    saved: '✅ План збережено.',
    noData: 'Поки немає достатньо контексту, але я все одно можу зібрати чернетку.',
    noteSaved: '✅ Нотатку збережено для наступного планера.',
    noteWaiting: 'Надішли наступним повідомленням текст нотатки.',
    noteEmpty: 'Нотатка порожня. Спробуй ще раз.',
    zoomListTitle: '📅 Zoom на цей тиждень',
    zoomListEmpty: 'На цей тиждень ще немає запланованих Zoom-сесій.',
    zoomListCaption: 'Ось поточний розклад.',
    cancelled: 'Ок, сесію планування скасовано.',
    errorFallback: 'Не вдалося згенерувати чернетку. Спробуй ще раз пізніше.',
    aiNotConfigured: 'Claude ще не підключено. Перевір ANTHROPIC_API_KEY.',
  },
  buttons: {
    confirm: 'Підтвердити',
    rewrite: 'Переписати',
    changeTopic: 'Змінити тему',
    continue: 'Продовжити',
    sales: 'Фокус на продажах',
    burnout: 'Тема: вигорання',
    clear: 'Без уточнення',
    cancel: 'Скасувати',
  },
  note: {
    title: 'Нотатка',
    prompt: 'Надішли наступним повідомленням текст нотатки.',
    saved: '✅ Нотатку збережено.',
  },
  mode: {
    WEEKLY_PLAN: 'Планер тижня',
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
    reelsIdeas: 'Згенеруй список тем для Reels на тиждень: 10 ідей з коротким хуком, основною думкою та CTA.',
    fullContent: 'Згенеруй повний контент-пакет на тиждень: контент-план, ідеї для Reels, теми для Stories, теми для постів, пропозицію для Zoom-акцентів.',
    clarification: 'Якщо є уточнення по темі, врахуй його як головний фокус.',
  },
} as const

export function buildPlannerUserPrompt(input: {
  mode: ContentPlanMode
  weekRange: string
  topic?: string | null
  zoomDigest: string
  noteDigest: string
}): string {
  const topicLine = String(input.topic ?? '').trim() || 'без додаткового уточнення'
  const modePrompt = input.mode === 'WEEKLY_PLAN'
    ? coachContent.prompts.weeklyPlan
    : input.mode === 'REELS_IDEAS'
      ? coachContent.prompts.reelsIdeas
      : coachContent.prompts.fullContent

  return [
    `Режим: ${coachContent.mode[input.mode]}`,
    `Період: ${input.weekRange}`,
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
