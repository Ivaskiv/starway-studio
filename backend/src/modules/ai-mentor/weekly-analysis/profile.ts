import { openai } from '../../../lib/openai.js'
import { MODEL_FOR_TASK } from '../../../lib/openaiModels.js'
import {
  runGuardedAiTask,
  stableHash,
} from '../../../services/aiGuard.service.js'
import type {
  WeeklyRawData,
  UserWeeklyReport,
  MentorWeeklyProfile,
} from './types.js'
import { extractTaggedLines } from './helpers.js'

export function buildFallbackMentorProfile(data: WeeklyRawData, userReport: UserWeeklyReport): MentorWeeklyProfile {
  return {
    userId: data.userId,
    weekStart: data.weekStart,
    createdAt: new Date(),
    behaviorPattern: data.sessionCount > 0 ? 'повертається, коли бачить конкретний наступний крок' : 'зупиняється без явного зовнішнього тригера',
    engagementRhythm: data.sessionCount > 0 || data.reflectionCount > 0 ? 'спадає' : 'хаотична',
    mainPainThisWeek: userReport.struggleAreas[0] ?? (userReport.slowProgressTaskCount ? 'мікрозавдання не доводяться до завершення' : 'нестабільний ритм'),
    emotionalTone: 'стабільна',
    retentionRisk: data.sessionCount > 0 || data.reflectionCount > 0 ? 6 : 4,
    retentionFactors: data.streakDays > 0 ? ['є попередній ритм', 'користувач уже проходив цикл'] : ['є історія та звіти'],
    churnSignals: [
      ...(data.sessionCount === 0 && data.reflectionCount === 0 ? ['тиждень без активної взаємодії'] : []),
      ...(userReport.slowProgressTaskCount && userReport.slowProgressTaskCount > 0 ? ['мікрозавдання застрягають нижче 80%'] : []),
    ],
    upsellReady: true,
    upsellProduct: 'subscription',
    upsellTiming: 'після перегляду тижневого звіту',
    upsellReasoning: 'Користувачу потрібен зрозумілий шлях повернення в систему через підписку та відновлення доступу.',
    nextMessageTone: 'підтримуючий',
    triggerForContact: 'коли користувач відкриває звіти або сторінку підписки',
    recommendedOffer: '🚀 Відновити доступ до ABsystem',
    systemNotes: userReport.slowProgressTaskCount && userReport.slowProgressTaskCount > 0
      ? 'Показувати історію і звіти, але підкреслювати незавершені задачі як продовження, а не новий старт.'
      : 'Показувати історію і звіти, але не тиснути mentor-нагадуваннями без активного доступу.',
  }
}

export async function generateMentorProfile(
  data: WeeklyRawData,
  userReport: UserWeeklyReport,
): Promise<MentorWeeklyProfile> {

  const allHighlights = extractTaggedLines(data.zoomTranscripts, 'HIGHLIGHT:')
  const allQuotes = extractTaggedLines(data.zoomTranscripts, 'QUOTE:')
  const allSummaries = extractTaggedLines(data.zoomTranscripts, 'Summary:')

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

Zoom transcript highlights:
${allHighlights.slice(0, 5).map((item, index) =>
  `${index + 1}. ${item}`
).join('\n')}

Zoom transcript quotes:
${allQuotes.slice(0, 5).map((item, index) =>
  `${index + 1}. ${item}`
).join('\n')}

Zoom transcript summaries:
${allSummaries.slice(0, 5).map((item, index) =>
  `${index + 1}. ${item}`
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

  const raw = await runGuardedAiTask(
    {
      userId: data.userId,
      source: 'weekly-mentor-profile',
      label: 'weekly-mentor-profile',
      payloadHash: stableHash({
        userId: data.userId,
        weekStart: data.weekStart.toISOString(),
        prompt,
      }),
      throttleMs: 10_000,
      duplicateWindowMs: 10 * 60_000,
    },
    async () => {
      const completion = await openai.chat.completions.create({
        model:       MODEL_FOR_TASK.weekly_report,
        temperature: 0.3,   // нижча температура — більш аналітично
        max_tokens:  800,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      })

      return JSON.parse(completion.choices[0].message.content ?? '{}')
    },
    () => ({
      behaviorPattern: '',
      engagementRhythm: 'регулярна',
      mainPainThisWeek: '',
      emotionalTone: 'стабільна',
      retentionRisk: 5,
      retentionFactors: [],
      churnSignals: [],
      upsellReady: false,
      upsellProduct: '',
      upsellTiming: '',
      upsellReasoning: '',
      nextMessageTone: 'спокійний',
      triggerForContact: '',
      recommendedOffer: '',
      systemNotes: '',
    }),
  )

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
