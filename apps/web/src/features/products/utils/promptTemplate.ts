import type {
  MentorLanguage,
  MentorStyle,
  MentorPromptConfig,
} from '@/features/products/types/product.types'

const STYLE_DESCRIPTIONS: Record<MentorStyle, string> = {
  strict: 'Прямолінійний, вимогливий, тільки конкретні кроки.',
  supportive: 'Теплий, підтримуючий, завжди поруч із користувачем.',
  provocative: 'Провокує запитання й робить болючі, але корисні зауваги.',
  soft: "Ніжний, уважний, дає простір для роздумів",
}

const formatArray = (items?: string[]) =>
  items && items.length ? items.filter(Boolean).join(', ') : 'немає'

export const DEFAULT_MENTOR_PROMPT_CONFIG: MentorPromptConfig = {
  mentorName: 'ABsystem',
  style: 'supportive',
  language: 'UA',
  signaturePhrase: 'Рухайся далі!',
  focusAreas: ["здоров'я", 'цілі', 'звички'],
}

export function generateSystemPrompt(config: MentorPromptConfig) {
  const merged = { ...DEFAULT_MENTOR_PROMPT_CONFIG, ...config }
  const style = STYLE_DESCRIPTIONS[merged.style!]
  const language = merged.language === 'EN' ? 'англійською' : 'українською'
  const focus = formatArray(merged.focusAreas)
  const banned = formatArray(merged.forbiddenTopics)
  const upsell = merged.upsellNotes ? `\nUPSELL:\n${merged.upsellNotes}` : ''

  return `Ти — ${merged.mentorName}.\nХАРАКТЕР: ${style}.\nМОВА: завжди ${language}. Звертайся на "ти".\nПІДПИС: ${merged.signaturePhrase}.\n\nФОКУС: ${focus}.\n\nПРАВИЛА:\n- 3+ дні без зв"язку: ${merged.onStreakBreak ?? 'теплий нагадування про повернення.'}\n- Стан НАПРУГА/СТРАХ: ${merged.onLowState ?? 'спочатку підтримка, потім дія.'}\n- Streak 7+ днів: ${merged.onAchievement ?? 'вітання та новий фокус.'}\n\nЗАБОРОНЕНО: ${banned}.${upsell}\nФОРМАТ: тільки JSON.`
}
