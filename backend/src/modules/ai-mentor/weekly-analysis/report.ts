import { openai } from '../../../lib/openai.js'
import {
  cacheGet,
  cacheSet,
} from '../../../lib/cache/index.js'
import { MODEL_FOR_TASK } from '../../../lib/openaiModels.js'
import {
  runGuardedAiTask,
  stableHash,
} from '../../../services/aiGuard.service.js'
import type {
  WeeklyRawData,
  UserWeeklyReport,
} from './types.js'
import {
  extractTaggedLines,
  getMicroTaskProgressStats,
} from './helpers.js'

export function buildFallbackUserReport(data: WeeklyRawData): UserWeeklyReport {
  const completedTasks = data.microTasks.filter(task => task.completed).length
  const totalTasks = data.microTasks.length
  const completionRate = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0
  const progressStats = getMicroTaskProgressStats(data.microTasks)

  const wheelDelta = data.wheelScores
    .filter(score => score.prev !== undefined)
    .map(score => ({ sphere: score.sphere, delta: score.score - (score.prev ?? score.score) }))

  const overallScore = Math.max(
    1,
    Math.min(
      10,
      Math.round(
        (
          completionRate / 20
          + Math.min(data.streakDays, 10) * 0.25
          + Math.min(data.sessionCount, 7) * 0.3
        ),
      ),
    ),
  )

  const activeSignalCount = data.reflectionCount + data.sessionCount + completedTasks + data.wheelCheckins
  const pausedSummary = activeSignalCount > 0
    ? `Trial вже завершився, але система зберегла твій реальний слід: ${data.reflectionCount} рефлексій, ${data.sessionCount} сесій, ${completedTasks} завершених задач і ${data.wheelCheckins} зріз${data.wheelCheckins === 1 ? '' : 'и'} колеса.`
    : 'Trial завершився раніше, ніж система встигла зібрати повний ритм, але старт і базові дані все одно збережені.'
  const pausedNextSteps = activeSignalCount > 0
    ? [
        'Відновити доступ і продовжити з уже зібраної точки',
        'Повернути одну щоденну сесію в ритм',
      ]
    : [
        'Повернути доступ до ABsystem',
        'Запустити ранкову сесію як перший крок',
      ]

  return {
    userId: data.userId,
    weekStart: data.weekStart,
    weekEnd: data.weekEnd,
    overallScore,
    topInsights: [
      data.accessState === 'paused'
        ? 'Ритм був на паузі, але історія збережена.'
        : completedTasks > 0
          ? 'Тиждень дав рух, але не все доводилось до кінця.'
          : 'Ритм ще формується, але база вже є.',
      progressStats.partialTaskCount > 0
        ? `Є ${progressStats.partialTaskCount} задачі в процесі${progressStats.slowProgressTaskCount > 0 ? `, ${progressStats.slowProgressTaskCount} нижче 80%` : ''}.`
        : completedTasks > 0
          ? 'Є на що спертися для наступного тижня.'
          : 'Потрібен простіший старт без перевантаження.',
      `Вибір на тиждень: ${data.streakDays > 0 ? 'зберігати одну головну дію щодня.' : 'тримати день простим і ясним.'}`,
    ],
    growthAreas: data.wheelScores.filter(score => score.prev !== undefined && score.score > (score.prev ?? score.score)).map(score => score.sphere),
    struggleAreas: data.wheelScores.filter(score => score.score <= 5).map(score => score.sphere).slice(0, 3),
    completionRate,
    streakDays: data.streakDays,
    wheelDelta,
    summaryText: data.accessState === 'paused'
      ? `${pausedSummary} Повернення в підписку не обнуляє шлях, а просто відкриває наступний крок із того місця, де ти зупинився.`
      : completedTasks > 0
        ? 'Тиждень показав рух, але не все доводилось до кінця.'
        : 'Тиждень був тихіший, але система зберегла контекст і напрям.',
    motivationText: '',
    nextWeekFocus: data.accessState === 'paused'
      ? 'Відновити доступ і продовжити з уже зібраної точки.'
      : progressStats.slowProgressTaskCount > 0
        ? 'Доводити незавершені задачі до 80–100% без нових стартів.'
        : 'Тримати один ясний крок на день.',
    nextWeekTasks: data.accessState === 'paused'
      ? pausedNextSteps
      : progressStats.slowProgressTaskCount > 0
        ? [
            'Довести одну задачу з прогресом нижче 80% до завершення',
            'Залишити лише одну головну дію на день',
          ]
        : [
            'Підтвердити одну головну дію на завтра',
            'Повернути ранкову або вечірню сесію в ритм',
          ],
  }
}

export function applyPausedReportFraming(data: WeeklyRawData, report: UserWeeklyReport): UserWeeklyReport {
  if (data.accessState !== 'paused') {
    return report
  }

  const activitySnapshot = [
    data.reflectionCount > 0 ? `${data.reflectionCount} рефлекс${data.reflectionCount === 1 ? 'ія' : data.reflectionCount < 5 ? 'ії' : 'ій'}` : null,
    data.sessionCount > 0 ? `${data.sessionCount} AI-сес${data.sessionCount === 1 ? 'ія' : data.sessionCount < 5 ? 'ії' : 'ій'}` : null,
    report.streakDays > 0 ? `стрік ${report.streakDays} дн.` : null,
    report.completionRate > 0 ? `${report.completionRate}% виконання` : null,
    report.partialTaskCount && report.partialTaskCount > 0 ? `${report.partialTaskCount} задач у процесі` : null,
  ].filter(Boolean).join(' · ')

  const summaryText = activitySnapshot
    ? `Trial вже завершився, але твоя база не зникла: ${activitySnapshot}. Зараз на паузі живий ABsystem, нові мікрозавдання, ранкові й вечірні сесії, тому без підписки система більше не буде вести тебе далі.\n\nПовернення в підписку не обнуляє шлях. Воно повертає тобі доступ до щоденного циклу, персональних задач, аналітики і звітів — з тієї точки, де ти зупинився.`
    : 'Trial завершився, і система майже не встигла розкритися. Зараз у тебе на паузі ABsystem, нові мікрозавдання, ранкові й вечірні сесії, але стартова база все одно збережена.\n\nПідписка потрібна, щоб не починати навмання: ти отримуєш готовий ритм дня, персональні задачі, аналітику і супровід без хаосу.'

  const motivationText = activitySnapshot
    ? 'Ти вже не на нулі. У тебе є зібраний слід, і підписка потрібна не для “ще однієї спроби”, а щоб повернути систему в дію й довести почате до результату.'
    : 'Навіть якщо trial був уривчастим, цього достатньо, щоб побачити напрям. Підписка дає не абстрактну мотивацію, а щоденну структуру, яка доводить до руху.'

  const topInsights = [
    ...report.topInsights,
    'Дані та історія збережені навіть після завершення trial.',
  ].slice(0, 3)

  return {
    ...report,
    topInsights,
    summaryText,
    motivationText,
    nextWeekFocus: 'Відновити доступ і повернути систему в щоденний ритм без втрати вже напрацьованого.',
    nextWeekTasks: report.completionRate > 0 || report.streakDays > 0
      ? [
          'Відкрити тижневий звіт і побачити, що вже реально зібрано',
          'Активувати підписку без втрати прогресу',
          'Повернути одну щоденну сесію як точку нового ритму',
        ]
      : [
          'Активувати підписку',
          'Запустити першу ранкову сесію',
          'Дати системі один повний тиждень без розриву',
        ],
  }
}

export async function generateUserReport(
  data: WeeklyRawData,
): Promise<UserWeeklyReport> {

  const completedTasks = data.microTasks.filter(t => t.completed).length
  const totalTasks     = data.microTasks.length
  const completionRate = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0
  const progressStats = getMicroTaskProgressStats(data.microTasks)
  const userGoal = data.userGoal?.trim() || 'не задано'
  const morningReflections = data.morningReflections.slice(-5)
  const eveningReflections = data.eveningReflections.slice(-5)
  const allHighlights = extractTaggedLines(data.zoomTranscripts, 'HIGHLIGHT:')
  const allQuotes = extractTaggedLines(data.zoomTranscripts, 'QUOTE:')
  const allSummaries = extractTaggedLines(data.zoomTranscripts, 'Summary:')
  const weakestWheel = data.wheelScores
    .slice()
    .sort((left, right) => left.score - right.score)[0]
  const strongestWheel = data.wheelScores
    .slice()
    .sort((left, right) => right.score - left.score)[0]

  const wheelDelta = data.wheelScores
    .filter(s => s.prev !== undefined)
    .map(s => ({ sphere: s.sphere, delta: s.score - (s.prev ?? s.score) }))
  const weekCacheKey = `weekly-report:${data.userId}:${data.weekStart.toISOString().split('T')[0]}:${stableHash({
    completionRate,
    totalTasks,
    streakDays: data.streakDays,
    sessionCount: data.sessionCount,
    weakestWheel: weakestWheel?.sphere ?? null,
    strongestWheel: strongestWheel?.sphere ?? null,
    morningReflections,
    eveningReflections,
  })}`
  const cached = await cacheGet<UserWeeklyReport | null>(weekCacheKey)
  if (cached) {
    return cached
  }

  const prompt = `You write the weekly coaching report for Starway Studio users.
Write in Ukrainian. Tone: direct, warm, peer-level coach.
Not motivational fluff. Not database readout. Like a smart friend who looked at your week and tells you what they actually see.

Input data provided:
- week_range: ${data.weekStart.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })} — ${data.weekEnd.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
- morning_sessions: ${data.dailyCycles.filter(d => d.state).length}
- evening_sessions: ${data.dailyCycles.filter(d => d.facts || d.drains.length > 0).length}
- tasks_done: ${completedTasks}
- tasks_skipped: ${data.microTasks.filter(task => task.skipped).length}
- tasks_total: ${totalTasks}
- streak: ${data.streakDays}
- score: ${Math.max(1, Math.min(10, Math.round((completionRate / 20) + Math.min(data.streakDays, 10) * 0.25 + Math.min(data.sessionCount, 7) * 0.3)))}
- morning_reflections: ${JSON.stringify(morningReflections)}
- evening_reflections: ${JSON.stringify(eveningReflections)}
- zoom_transcript_highlights: ${JSON.stringify(allHighlights)}
- zoom_transcript_quotes: ${JSON.stringify(allQuotes)}
- zoom_transcript_summaries: ${JSON.stringify(allSummaries)}
- user_goal: ${JSON.stringify(userGoal)}
- wheel_weak_area: ${JSON.stringify(weakestWheel?.sphere ?? '')}
- wheel_strong_area: ${JSON.stringify(strongestWheel?.sphere ?? '')}
- previous_week_focus: null

Rules for generation:
1. focus_next: ONE sentence. What ONE thing matters most next week, derived from what the user actually wrote in their reflections. Not generic. Must reference something real from their week. Max 15 words.
2. summary: TWO sentences max. What actually happened this week — honest, specific. No "СТАН:", "ЦІЛЬ:", "ВИБІР:", "ДІЯ:" prefixes.
3. insights: array of 1–3 strings. Real observations from the data. Each max 12 words. Plain sentence, no bullet prefix, no dash prefix.
4. next_steps: array of 1–2 strings. Specific to this user's week. Must be derived from actual reflections or missed sessions. If you can't generate a non-generic step, return [].
5. support_note: null. Remove this field entirely. Do not generate encouragement paragraphs.

Return JSON only:
{
  "focus_next": "string",
  "summary": "string",
  "insights": ["string"],
  "next_steps": ["string"]
}`

  const raw = await runGuardedAiTask(
    {
      userId: data.userId,
      source: 'weekly-report',
      label: 'weekly-report',
      payloadHash: stableHash({
        userId: data.userId,
        weekStart: data.weekStart.toISOString(),
        weekEnd: data.weekEnd.toISOString(),
        completionRate,
        totalTasks,
        weakestWheel: weakestWheel?.sphere ?? null,
        strongestWheel: strongestWheel?.sphere ?? null,
        streakDays: data.streakDays,
        sessionCount: data.sessionCount,
        progressStats,
      }),
      throttleMs: 10_000,
      duplicateWindowMs: 10 * 60_000,
    },
    async () => {
      const completion = await openai.chat.completions.create({
        model:       MODEL_FOR_TASK.weekly_report,
        temperature: 0.7,
        max_tokens:  1200,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      })

      return JSON.parse(completion.choices[0].message.content ?? '{}')
    },
    () => ({
      focus_next: '',
      summary: '',
      insights: [],
      next_steps: [],
    }),
  )
  const focusNext = String(raw.focus_next ?? raw.nextWeekFocus ?? '').trim()
  const summary = String(raw.summary ?? raw.summaryText ?? '').trim()
  const insights = Array.isArray(raw.insights) ? raw.insights : raw.topInsights ?? []
  const nextSteps = Array.isArray(raw.next_steps) ? raw.next_steps : raw.nextWeekTasks ?? []
  const overallScore = Math.max(
    1,
    Math.min(
      10,
      Math.round(
        (
          completionRate / 20
          + Math.min(data.streakDays, 10) * 0.25
          + Math.min(data.sessionCount, 7) * 0.3
        ),
      ),
    ),
  )

  const report = {
    userId:         data.userId,
    weekStart:      data.weekStart,
    weekEnd:        data.weekEnd,
    overallScore,
    topInsights:    insights,
    growthAreas:    raw.growthAreas    ?? [],
    struggleAreas:  raw.struggleAreas  ?? [],
    completionRate,
    partialTaskCount: progressStats.partialTaskCount,
    averageTaskProgress: progressStats.averageTaskProgress,
    slowProgressTaskCount: progressStats.slowProgressTaskCount,
    streakDays:     data.streakDays,
    wheelDelta,
    summaryText:    summary,
    motivationText: '',
    nextWeekFocus:  focusNext,
    nextWeekTasks:  nextSteps,
  }
  await cacheSet(weekCacheKey, report, 7 * 24 * 3600)
  return report
}
