import { openai } from '../../lib/openai.js'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions/completions.js'
import type {
  WheelScore,
  WheelSphereId,
  PersonalityProfile,
  TrajectoryPrediction,
  ActionPlanItem,
  AdaptiveMission,
} from './types.js'

const MODEL = process.env.OPENAI_WHEEL_MODEL ?? 'gpt-4o-mini'

const baseMessages = (summary: string): ChatCompletionMessageParam[] => [
  {
    role: 'system',
    content: 'You are the Starway AI Mentor assistant. Analyze life balance data and return concise, actionable insights in Ukrainian.',
  },
  { role: 'user', content: summary },
]

async function callCompletion(messages: ChatCompletionMessageParam[]): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages,
    })
    return response.choices[0]?.message?.content?.trim() ?? ''
  } catch (error) {
    console.warn('[wheel.ai] AI completion failed, returning safe fallback', error)
    return ''
  }
}

function safeParseJson<T>(input: string, fallback: T): T {
  const trimmed = input.trim()
  if (!trimmed) return fallback
  try {
    const firstJson = trimmed.match(/\{(?:.|\s)*\}|\[(?:.|\s)*\]/)
    if (firstJson) {
      return JSON.parse(firstJson[0])
    }
    return JSON.parse(trimmed)
  } catch (error) {
    console.error('AI JSON parse failed', { input: trimmed, error })
    return fallback
  }
}

function formatScoreSummary(scores: WheelScore[]): string {
  return scores
    .map(s => `${s.categoryId}:${s.score}`)
    .join(', ')
}

export async function wheelAnalysis(
  scores: WheelScore[],
  weakest: WheelScore,
  focus: WheelScore
): Promise<string> {
  const prompt = `Оціночна сітка (${formatScoreSummary(scores)}). Слабка сфера: ${weakest.categoryId}, фокус-сфера: ${focus.categoryId}. Напиши два речення про поточний баланс життя та де варто зосередитися.`
  const message = baseMessages(prompt)
  return (await callCompletion(message)) || `Фокус: ${focus.categoryId}.` 
}

export async function lifeDiagnosis(weakest: WheelSphereId, scores: WheelScore[]): Promise<string> {
  const prompt = `Сфера ${weakest} найнижча (${scores.find(s => s.categoryId === weakest)?.score ?? '0'}). Який корінь дисбалансу? Напиши пояснення, як це впливає на інші сфери.`
  const message = baseMessages(prompt)
  return (await callCompletion(message)) || `Сфера ${weakest} потребує уваги.`
}

export async function personalityProfile(scores: WheelScore[]): Promise<PersonalityProfile> {
  const prompt = `На основі оцінок ${formatScoreSummary(scores)} визнач стиль прийняття рішень, мотивацію, реакцію на стрес та драйвер розвитку. Виведи JSON { decisionStyle, motivationType, stressPattern, growthDriver }.`
  const message = baseMessages(prompt)
  const result = await callCompletion(message)
  return safeParseJson<PersonalityProfile>(result, {
    decisionStyle: 'зважений',
    motivationType: 'мета',
    stressPattern: 'адаптивний',
    growthDriver: 'зростання',
  })
}

export async function trajectoryPrediction(scores: WheelScore[]): Promise<TrajectoryPrediction> {
  const prompt = `На основі оцінок ${formatScoreSummary(scores)} опиши зони ризику, потенціал росту та короткий прогноз, якщо нічого не змінювати. Виведи JSON з riskAreas[], growthPotential[], predictionSummary.`
  const message = baseMessages(prompt)
  const result = await callCompletion(message)
  return safeParseJson<TrajectoryPrediction>(result, {
    riskAreas: ['burnout risk'],
    growthPotential: ['learning'],
    predictionSummary: 'Тенденція нейтральна.',
  })
}

export async function actionPlan(weakest: WheelSphereId): Promise<ActionPlanItem[]> {
  const prompt = `Склади 7-денний план мікро-дій, що допоможе підсилити сферу ${weakest}. Виведи JSON-масив об'єктів { day, action }.`
  const message = baseMessages(prompt)
  const result = await callCompletion(message)
  const parsed = safeParseJson<ActionPlanItem[]>(result, [])
  return parsed.length ? parsed.slice(0, 7) : Array.from({ length: 7 }, (_, i) => ({ day: i + 1, action: `Робота над ${weakest}` }))
}

export async function adaptiveMissions(weakest: WheelSphereId): Promise<AdaptiveMission[]> {
  const prompt = `Пропиши 3 адаптивні місії на основі слабкої сфери ${weakest}. Кожна місія має rationale (чому важливо). Виведи JSON-масив { mission, rationale }.`
  const message = baseMessages(prompt)
  const result = await callCompletion(message)
  const parsed = safeParseJson<AdaptiveMission[]>(result, [])
  return parsed.length
    ? parsed
    : [
        { mission: `Сконцентруватися на ${weakest}`, rationale: 'Зміцнить баланс' },
        { mission: `Рефлексія про ${weakest}`, rationale: 'Зрозуміти мотивацію' },
        { mission: `Малі дії до ${weakest}`, rationale: 'Нормалізує енергетику' },
      ]
}

export async function generateAI(prompt: string): Promise<string> {
  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: 'You are the Starway AI assistant, helpful and concise in Ukrainian.' },
    { role: 'user', content: prompt },
  ]
  return callCompletion(messages)
}
