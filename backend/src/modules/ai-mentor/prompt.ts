import { prisma } from '../../db/client.js'
import type { Prisma } from '../../db/generated/prisma/client.js'
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
  const config = mergeConfig(DEFAULT_CONFIG, mentorConfig)
  const style = STYLE_DESCRIPTIONS[config.style ?? 'supportive']
  const focus = (config.focusAreas ?? []).join(', ') || 'всі сфери'
  const banned = ['медичні поради', 'гарантії результату', ...(config.forbiddenTopics ?? [])].join('; ')
  const products = config.products?.length
    ? '\nUPSELL (природно):\n' + config.products.map(p => `• ${p.name}: ${p.whenToMention ?? 'природно згадати'}`).join('\n')
    : ''

  return `Ти — ${config.name ?? DEFAULT_CONFIG.name}, персональний AI-ментор платформи Starway.\n\nХАРАКТЕР: ${style}\nМОВА: завжди спілкуйся ${toLanguageLabel(config.language)}. Звертайся на «ти», по імені.\nПІДПИС: Кожне повідомлення завершуй: "${config.signaturePhrase ?? DEFAULT_CONFIG.signaturePhrase}"\n\nФОКУС: ${focus}\n\nПРАВИЛА:\n- Відсутність >3 днів: ${config.onStreakBreak ?? 'Лагідно нагадай про повернення.'}\n- Стан НАПРУГА/СТРАХ: ${config.onLowState ?? 'Почни з підтримки, потім — дія.'}\n- Streak 7+ днів: ${config.onAchievement ?? 'Відсвяткуй досягнення, запропонуй новий фокус.'}\n${products}\n\nФОРМАТ: Завжди повертай валідний JSON. Без тексту поза JSON.\nЗАБОРОНЕНО: ${banned}.`.trim()
}

export async function buildContextPrompt(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      firstName: true,
      lastName: true,
      trialStartsAt: true,
      trialEndsAt: true,
    },
  })

  const entries = await prisma.dailyEntry.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 3,
  })

  const wheel = await prisma.wheelAssessment.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  const microSupport = await prisma.microSupportItem.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 3,
  })

  const fallbackName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()
  const userName = user?.name ?? (fallbackName || 'користувач')
  const streak = await prisma.dailyEntry.count({ where: { userId } })

  const entryLines = entries.map(e => `- [${e.state}] ${e.dayFact ?? 'без опису'} (${e.choice})`).join('\n')
  const wheelLine = wheel
    ? `Колесо: ${wheel.focusSphere ?? 'невідомо'} слабка сфера: ${wheel.weakestSphere ?? 'немає'}`
    : 'Колесо ще не оцінене.'
  const microLines = microSupport.length
    ? microSupport
        .map(m => {
          const metadata = (m.metadata as Prisma.JsonObject) ?? {}
          const duration = typeof metadata.durationDays === 'number' ? metadata.durationDays : 0
          return `• ${m.action} (${duration} днів)`
        })
        .join('\n')
    : 'Немає активних мікрозавдань.'

  const trialInfo = user?.trialStartsAt && user.trialEndsAt
    ? `Trial: ${user.trialStartsAt.toISOString().split('T')[0]} → ${user.trialEndsAt.toISOString().split('T')[0]}`
    : 'Trial info відсутній.'

  return `Ім'я: ${userName}\nStreak: ${streak} днів\n${trialInfo}\n${wheelLine}\nОстанні 3 дії:\n${entryLines || 'немає відповідей'}\nМікрозавдання:\n${microLines}`
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
