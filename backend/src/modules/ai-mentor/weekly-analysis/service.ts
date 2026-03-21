// backend/src/modules/ai-mentor/service.ts
import type {
  WeeklyRawData,
  UserWeeklyReport,
  MentorWeeklyProfile,
  WeeklyAnalysisResult,
} from './types.js'
import { prisma } from '../../../db/client.js'
import { openai } from '../../../lib/openai.js'
import { suggestNextProduct } from '../../assistant/service.js'
import { logger } from '../../../utils/logger.js'
import { SubscriptionStatus } from '@starway/db/prisma-client'

const extractAnswers = (value: unknown): string[] => {
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  if (!('answers' in record)) return []
  const answers = record.answers
  if (!Array.isArray(answers)) return []
  return answers.filter((answer): answer is string => typeof answer === 'string')
}

// ── 1. Збір даних з БД ────────────────────────────────────────
export async function collectWeeklyData(
  userId: string,
  weekStart: Date,
  weekEnd:   Date,
): Promise<WeeklyRawData> {

  const [
    dailyEntries,
    wheelEntries,
    prevWheelEntries,
    microTasks,
    messages,
    streak,
    subscription,
  ] = await Promise.all([

    prisma.dailyEntry.findMany({
      where: { userId, date: { gte: weekStart, lte: weekEnd } },
      orderBy: { date: 'asc' },
    }),

    prisma.wheelAssessment.findFirst({
      where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.wheelAssessment.findFirst({
      where: { userId, createdAt: { lt: weekStart } },
      orderBy: { createdAt: 'desc' },
    }),

    prisma.microTask.findMany({
      where: { userId, createdAt: { gte: weekStart, lte: weekEnd } },
    }),

    prisma.aIMentorMessage.findMany({
      where: {
        session: {
          userMentor: { userId },
        },
        createdAt: { gte: weekStart, lte: weekEnd },
      },
      orderBy: { createdAt: 'asc' },
      take: 40,   // обмежуємо щоб не перевантажити контекст
    }),

    prisma.streak.findFirst({ where: { userId } }),

    prisma.subscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  // Формуємо wheelScores з delta
  const currentSpheres = (wheelEntries?.scores as Record<string, number>) ?? {}
  const prevSpheres    = (prevWheelEntries?.scores as Record<string, number>) ?? {}

  const wheelScores = Object.entries(currentSpheres).map(([sphere, score]) => ({
    sphere,
    score,
    prev: prevSpheres[sphere],
  }))

  return {
    userId,
    weekStart,
    weekEnd,

    dailyCycles: dailyEntries.map(entry => ({
      date:    entry.date,
      state:   entry.state as string,
      choices: extractAnswers(entry.content),
      drains:  entry.drain ? [entry.drain] : [],
      facts:   entry.dayFact ?? '',
    })),

    wheelScores,

    microTasks: microTasks.map(t => {
      const isOverdue = t.dueAt ? t.dueAt.getTime() < weekEnd.getTime() : false
      return {
        title:     t.title,
        completed: t.isCompleted,
        skipped:   !t.isCompleted && isOverdue,
      }
    }),

    mentorMessages: messages.map(m => ({
      role:    m.role.toLowerCase() === 'user' ? 'user' : 'assistant',
      content: m.content,
      date:    m.createdAt,
    })),

    streakDays:       streak?.current ?? 0,
    subscriptionPlan: subscription?.planCode ?? 'trial',
  }
}

// ── 2. Генерація звіту для користувача ───────────────────────
async function generateUserReport(
  data: WeeklyRawData,
): Promise<UserWeeklyReport> {

  const completedTasks = data.microTasks.filter(t => t.completed).length
  const totalTasks     = data.microTasks.length
  const completionRate = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0

  const wheelDelta = data.wheelScores
    .filter(s => s.prev !== undefined)
    .map(s => ({ sphere: s.sphere, delta: s.score - (s.prev ?? s.score) }))

  const prompt = `Ти — персональний AI-ментор. Проаналізуй тиждень користувача і створи теплий, підтримуючий звіт.

ДАНІ ТИЖНЯ:
Стрік: ${data.streakDays} днів
Виконано задач: ${completedTasks}/${totalTasks} (${completionRate}%)

Щоденні стани:
${data.dailyCycles.map(d =>
  `${d.date.toLocaleDateString('uk')}: стан="${d.state}", дренажі=[${d.drains.join(', ')}], факт="${d.facts}"`
).join('\n')}

Колесо балансу (зміни):
${data.wheelScores.map(s =>
  `${s.sphere}: ${s.score}/10 ${s.prev !== undefined ? `(було ${s.prev}, зміна: ${s.score - s.prev > 0 ? '+' : ''}${s.score - s.prev})` : ''}`
).join('\n')}

Теми розмов з ментором (останні):
${data.mentorMessages.filter(m => m.role === 'user').slice(-5).map(m => m.content).join('\n')}

ЗАВДАННЯ: Дай відповідь у форматі JSON (без markdown):
{
  "overallScore": число 1-10,
  "topInsights": ["інсайт 1", "інсайт 2", "інсайт 3"],
  "growthAreas": ["сфера або якість де виросла"],
  "struggleAreas": ["де було важко"],
  "summaryText": "2-3 абзаци теплого аналізу тижня українською",
  "motivationText": "1 персональне мотивуюче повідомлення (3-4 речення)",
  "nextWeekFocus": "один головний фокус наступного тижня",
  "nextWeekTasks": ["задача 1", "задача 2", "задача 3"]
}

Тон: тепло, підтримуюче, без осуду, конкретно. Звертайся на "ти".`

  const completion = await openai.chat.completions.create({
    model:       'gpt-4o',
    temperature: 0.7,
    max_tokens:  1200,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  })

  const raw = JSON.parse(completion.choices[0].message.content ?? '{}')

  return {
    userId:         data.userId,
    weekStart:      data.weekStart,
    weekEnd:        data.weekEnd,
    overallScore:   raw.overallScore   ?? 5,
    topInsights:    raw.topInsights    ?? [],
    growthAreas:    raw.growthAreas    ?? [],
    struggleAreas:  raw.struggleAreas  ?? [],
    completionRate,
    streakDays:     data.streakDays,
    wheelDelta,
    summaryText:    raw.summaryText    ?? '',
    motivationText: raw.motivationText ?? '',
    nextWeekFocus:  raw.nextWeekFocus  ?? '',
    nextWeekTasks:  raw.nextWeekTasks  ?? [],
  }
}

// ── 3. Генерація прихованого профілю для ментора ─────────────
async function generateMentorProfile(
  data: WeeklyRawData,
  userReport: UserWeeklyReport,
): Promise<MentorWeeklyProfile> {

  const prompt = `Ти — аналітична система для онлайн-школи. Проаналізуй поведінку користувача за тиждень.
Твоя мета: допомогти ментору утримати користувача і запропонувати потрібний продукт у правильний момент.

ПОВЕДІНКОВІ ДАНІ:
Стрік: ${data.streakDays} днів
Тарифний план: ${data.subscriptionPlan}
Загальний прогрес тижня: ${userReport.overallScore}/10
Виконано задач: ${userReport.completionRate}%
Емоційний тон розмов: ${data.mentorMessages.filter(m=>m.role==='user').slice(-3).map(m=>m.content).join(' | ')}

Патерни активності:
${data.dailyCycles.map(d =>
  `${new Date(d.date).toLocaleDateString('uk', { weekday: 'short' })}: стан="${d.state}", дренажі=[${d.drains.join(',')}]`
).join('\n')}

Найбільші проблемні зони (з колеса): ${userReport.struggleAreas.join(', ')}
Зони росту: ${userReport.growthAreas.join(', ')}

ЗАВДАННЯ: Дай відповідь у форматі JSON (без markdown):
{
  "behaviorPattern": "короткий опис поведінкового патерну",
  "engagementRhythm": "регулярна | хаотична | спадає | зростає",
  "mainPainThisWeek": "головний біль або виклик тижня",
  "emotionalTone": "тривожна | мотивована | виснажена | стабільна | піднесена",

  "retentionRisk": число 1-10,
  "retentionFactors": ["що тримає користувача"],
  "churnSignals": ["тривожні сигнали якщо є, інакше []"],

  "upsellReady": true або false,
  "upsellProduct": "назва продукту або ''",
  "upsellTiming": "коли показати оффер",
  "upsellReasoning": "чому саме зараз або чому не зараз",

  "nextMessageTone": "підтримуючий | спонукальний | святкуючий | спокійний",
  "triggerForContact": "що має статись щоб написати позачергово",
  "recommendedOffer": "конкретна пропозиція або ''",
  "systemNotes": "нотатки для AI-ментора на наступний тиждень (2-3 речення)"
}

Будь аналітичним, конкретним, без загальних фраз.`

  const completion = await openai.chat.completions.create({
    model:       'gpt-4o',
    temperature: 0.3,   // нижча температура — більш аналітично
    max_tokens:  800,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
  })

  const raw = JSON.parse(completion.choices[0].message.content ?? '{}')

  return {
    userId:            data.userId,
    weekStart:         data.weekStart,
    createdAt:         new Date(),
    behaviorPattern:   raw.behaviorPattern   ?? '',
    engagementRhythm:  raw.engagementRhythm  ?? '',
    mainPainThisWeek:  raw.mainPainThisWeek  ?? '',
    emotionalTone:     raw.emotionalTone     ?? '',
    retentionRisk:     raw.retentionRisk     ?? 5,
    retentionFactors:  raw.retentionFactors  ?? [],
    churnSignals:      raw.churnSignals      ?? [],
    upsellReady:       raw.upsellReady       ?? false,
    upsellProduct:     raw.upsellProduct     ?? '',
    upsellTiming:      raw.upsellTiming      ?? '',
    upsellReasoning:   raw.upsellReasoning   ?? '',
    nextMessageTone:   raw.nextMessageTone   ?? 'підтримуючий',
    triggerForContact: raw.triggerForContact ?? '',
    recommendedOffer:  raw.recommendedOffer  ?? '',
    systemNotes:       raw.systemNotes       ?? '',
  }
}

// ── 4. Зберегти результати в БД ───────────────────────────────
async function saveResults(result: WeeklyAnalysisResult): Promise<void> {
  const profileData = {
    userId:            result.mentorProfile.userId,
    weekStart:         result.mentorProfile.weekStart,
    behaviorPattern:   result.mentorProfile.behaviorPattern,
    engagementRhythm:  result.mentorProfile.engagementRhythm,
    mainPainThisWeek:  result.mentorProfile.mainPainThisWeek,
    emotionalTone:     result.mentorProfile.emotionalTone,
    retentionRisk:     result.mentorProfile.retentionRisk,
    retentionFactors:  result.mentorProfile.retentionFactors,
    churnSignals:      result.mentorProfile.churnSignals,
    upsellReady:       result.mentorProfile.upsellReady,
    upsellProduct:     result.mentorProfile.upsellProduct,
    upsellTiming:      result.mentorProfile.upsellTiming,
    upsellReasoning:   result.mentorProfile.upsellReasoning,
    offerShownAt:      result.mentorProfile.offerShownAt ?? null,
    nextMessageTone:   result.mentorProfile.nextMessageTone,
    triggerForContact: result.mentorProfile.triggerForContact,
    recommendedOffer:  result.mentorProfile.recommendedOffer,
    systemNotes:       result.mentorProfile.systemNotes,
  }

  const existing = await prisma.mentorWeeklyProfile.findFirst({
    where: {
      userId:    profileData.userId,
      weekStart: profileData.weekStart,
    },
    select: { id: true },
  })

  if (existing) {
    await prisma.mentorWeeklyProfile.update({
      where: { id: existing.id },
      data:  profileData,
    })
  } else {
    await prisma.mentorWeeklyProfile.create({ data: profileData })
  }
}

// ── 5. Головна функція (викликається з scheduler) ────────────
export async function runWeeklyAnalysis(
  userId: string,
): Promise<WeeklyAnalysisResult | null> {

  const weekEnd   = new Date()
  const weekStart = new Date(weekEnd)
  weekStart.setDate(weekStart.getDate() - 7)

  try {
    logger.info(`[WeeklyAnalysis] start userId=${userId}`)

    const rawData      = await collectWeeklyData(userId, weekStart, weekEnd)

    // Якщо юзер майже не активний — пропускаємо генерацію
    if (rawData.dailyCycles.length < 2 && rawData.mentorMessages.length < 2) {
      logger.info(`[WeeklyAnalysis] skip userId=${userId} — недостатньо даних`)
      return null
    }

    const [userReport, mentorProfile] = await Promise.all([
      generateUserReport(rawData),
      // mentorProfile залежить від userReport — генеруємо після
      null,
    ])

    const profile = await generateMentorProfile(rawData, userReport!)
    const suggestion = await suggestNextProduct(userId)

    const offerMap: Record<string, string> = {
      '5points': '🧭 Знайти свої точки опори',
      'trial': '✨ Спробувати 7 днів',
      'subscription': '🚀 Отримати повний доступ',
      'mentorship': '💬 Записатись на наставництво',
    }

    const upsellMap: Record<string, string> = {
      '5points': '5points',
      'trial': 'trial',
      'subscription': 'subscription',
      'mentorship': 'mentorship',
    }

    if (suggestion) {
      profile.recommendedOffer = offerMap[suggestion] ?? profile.recommendedOffer
      profile.upsellProduct = upsellMap[suggestion] ?? profile.upsellProduct
      profile.upsellReady = true
    }

    const result: WeeklyAnalysisResult = {
      userReport:    userReport!,
      mentorProfile: profile,
    }

    await saveResults(result)

    logger.info(`[WeeklyAnalysis] done userId=${userId} retention=${profile.retentionRisk}`)
    return result

  } catch (err) {
    logger.error(`[WeeklyAnalysis] error userId=${userId}`, err)
    return null
  }
}

// ── 6. Запуск для всіх активних юзерів (з scheduler) ─────────
export async function runWeeklyAnalysisForAll(): Promise<void> {
  const activeUsers = await prisma.user.findMany({
    where: {
      subscriptions: {
        some: { status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] } },
      },
    },
    select: { id: true },
  })

  logger.info(`[WeeklyAnalysis] processing ${activeUsers.length} users`)

  // По черзі щоб не спалити rate limit OpenAI
  for (const user of activeUsers) {
    await runWeeklyAnalysis(user.id)
    await new Promise(r => setTimeout(r, 1500))  // 1.5s між запитами
  }

  logger.info('[WeeklyAnalysis] all done')
}
