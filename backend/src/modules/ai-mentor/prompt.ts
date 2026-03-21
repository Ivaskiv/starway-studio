import { prisma } from '../../db/client.js'
import type { Prisma } from '@starway/db/prisma-client'
import { getPrimaryGoal } from '../goals/service.js'
import type { GenerationIntent } from './types.js'

export type MentorConfigPayload = {
  name?: string | null
  style?: 'strict' | 'supportive' | 'provocative' | 'soft'
  language?: 'UA' | 'EN'
  signaturePhrase?: string
  focusAreas?: string[]
  onStreakBreak?: string
  onLowState?: string
  onAchievement?: string
  forbiddenTopics?: string[]
  products?: { name: string; whenToMention?: string }[]
}

const STYLE_DESCRIPTIONS: Record<NonNullable<MentorConfigPayload['style']>, string> = {
  strict: 'Ти прямолінійний, вимогливий, без відмазок. Тільки конкретні дії.',
  supportive: 'Ти теплий та підтримуючий, завжди поруч із людиною.',
  provocative: 'Ти провокативний, ставиш незручні питання, виявляєш сліпі зони.',
  soft: "Ти м\'який, уважний, даєш простір для роздумів.",
}

const DEFAULT_CONFIG: MentorConfigPayload = {
  name: 'AI Mentor',
  style: 'supportive',
  language: 'UA',
  signaturePhrase: 'Хай буде дія!',
  focusAreas: ['здоров\'я', 'мрії', 'професійний ріст'],
}

function mergeConfig(base?: MentorConfigPayload, override?: MentorConfigPayload): MentorConfigPayload {
  return {
    ...base,
    ...override,
    focusAreas: override?.focusAreas ?? base?.focusAreas ?? DEFAULT_CONFIG.focusAreas,
    forbiddenTopics: override?.forbiddenTopics ?? base?.forbiddenTopics ?? [],
    products: override?.products ?? base?.products ?? [],
  }
}

function toLanguageLabel(lang?: string) {
  if (lang === 'EN') return 'англійською'
  return 'українською'
}

export function buildSystemPrompt(mentorConfig?: MentorConfigPayload) {
  void mentorConfig
  return [
    'Ти — AI ментор Starway. Керуючий модуль.',
    'Тон: жорстка ясність. Без підтримки. Без мотивації.',
    'Методологія: СТАН → ЦІЛЬ → ВИБІР → РІШЕННЯ → ДІЯ.',
    'При зливі: фіксуй зраду рішенню явно.',
    'Тільки українська.',
  ].join('\n')
}

export async function buildContextPrompt(userId: string) {
  const [user, userMentor, primaryGoal, entries] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentState: true,
        trialStartsAt: true,
        trialEndsAt: true,
      },
    }),
    prisma.userAIMentor.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        currentState: true,
        stage: true,
        clarityLevel: true,
        blocker: true,
        behaviorPattern: true,
      },
    }),
    getPrimaryGoal(userId),
    prisma.dailyEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        state: true,
        choice: true,
        dayFact: true,
      },
    }),
  ])

  const trialDay = user?.trialStartsAt && user.trialEndsAt
    ? Math.max(1, Math.floor((Date.now() - user.trialStartsAt.getTime()) / 86400000) + 1)
    : null

  return JSON.stringify({
    currentState: userMentor?.currentState ?? user?.currentState ?? null,
    stage: userMentor?.stage ?? null,
    clarityLevel: userMentor?.clarityLevel ?? null,
    blocker: userMentor?.blocker ?? null,
    behaviorPattern: userMentor?.behaviorPattern ?? null,
    primaryGoal: primaryGoal?.text ?? null,
    trialDay,
    last3Entries: entries.map(entry => ({
      state: entry.state,
      choice: entry.choice,
      dayFact: entry.dayFact,
    })),
  })
}

export function buildTaskPrompt(type: GenerationIntent, params?: Record<string, unknown>) {
  switch (type) {
    case 'morning':
      return `Створи ранкову сесію. Поверни JSON: { greeting, task, affirmation }. Завжди нагадайте про фокус на день, використай дані контексту.`
    case 'evening':
      return `Роздрукуй вечірню рефлексію. JSON: { reflection, support, tomorrowFocus }. Запропонуй коротку підтримку.`
    case 'wheel':
      return `Аналізуй колесо балансу. Очікується JSON: { analysis, priorities[], weakArea }. Використай params.scores, якщо вони є.`
    case 'weekly':
      return `Склади тижневий огляд. JSON: { summary, focusTasks[], affirmations[] }. Поясни тренди та подаруй 3 афірмації.`
    case 'chat':
      return `Відповідай на повідомлення: ${params?.message ?? 'без повідомлення'}. JSON: { reply, actionables[] }.`
    case 'pdf':
      return `Згенеруй короткий PDF-звіт. JSON: { headline, insights[], nextSteps[] }.`
    default:
      return 'Виконай запит, поверни JSON із ключами result та note.'
  }
}
