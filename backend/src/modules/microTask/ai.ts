import { openai } from '../../lib/openai.js'
import { cacheGet, cacheSet } from '../../lib/cache/index.js'
import { MODEL_FOR_TASK } from '../../lib/openaiModels.js'
import { stableHash } from '../../services/aiGuard.service.js'
import {
  STATIC_MORNING_QUESTION_KEYS,
  humanizeMorningQuestionKey,
  safeJsonParse,
  stripMarkdownFences,
  type GeneratedTask,
} from './helpers.js'

const MODEL = MODEL_FOR_TASK.morning_tasks

export function buildFallbackTasks(
  staticAnswers: Record<string, string>,
  slotsAvailable: number,
  carryOverTasks: Array<{
    title: string
    progressPercent: number | null
    daysToComplete: number
  }> = [],
): GeneratedTask[] {
  const energyRaw = [
    staticAnswers.state,
    staticAnswers.focus,
    staticAnswers.worthy,
    staticAnswers.identity,
  ]
    .filter(Boolean)
    .map(value => String(value).trim())
    .join(' · ')
  const energyNum = parseInt(energyRaw.match(/\d+/)?.[0] ?? '5', 10)
  const lowEnergy = energyNum <= 4
    || /втом|виснаж|важк|не можу|завис/i.test(energyRaw)
  const highEnergy = energyNum >= 7
    || /готов|можу|сила|заряд/i.test(energyRaw)
  const focus = staticAnswers.focus?.trim() || ''
  const goals = staticAnswers.goals?.split('\n').map(item => item.trim()).filter(Boolean) ?? []
  const state = [staticAnswers.state, staticAnswers.identity, staticAnswers.worthy]
    .filter(Boolean)
    .map(value => String(value).trim())
    .join(' · ')

  const targetCount = Math.min(slotsAvailable, highEnergy && carryOverTasks.length === 0 ? 2 : 1)
  const tasks: GeneratedTask[] = []

  const normalizeTitle = (title: string) => title.trim().replace(/\s+/g, ' ').slice(0, 72)

  const addTask = (task: GeneratedTask | null) => {
    if (!task || tasks.length >= targetCount) return
    tasks.push({
      ...task,
      title: normalizeTitle(task.title),
      steps: Array.isArray(task.steps) ? task.steps.slice(0, 2) : [],
      daysToComplete: 1,
      deadline: 'До 23:59',
    })
  }

  const carryOverTask = carryOverTasks
    .filter(task => task.progressPercent !== null && task.progressPercent < 80)
    .sort((left, right) => (left.progressPercent ?? 100) - (right.progressPercent ?? 100))[0]

  addTask(carryOverTask
    ? {
        title: `Продовжити: ${carryOverTask.title}`,
        insight: `Попередня задача вже на ${carryOverTask.progressPercent ?? 0}%. Краще дотиснути її сьогодні, ніж починати спочатку.`,
        steps: lowEnergy
          ? []
          : [
              'Відкрити саме цю задачу',
              'Зробити один конкретний крок саме сьогодні',
            ],
        sphere: 'growth',
        daysToComplete: 1,
        xpReward: 18,
        priority: 'high',
      }
    : null)

  addTask(focus
    ? {
        title: focus,
        insight: 'Ти вже назвав це фокусом дня. Сьогодні потрібен один реальний рух, не ще один список.',
        steps: lowEnergy ? [] : ['Зробити перший конкретний крок без доведення до ідеалу'],
        sphere: 'growth',
        daysToComplete: 1,
        xpReward: 20,
        priority: 'high',
      }
    : null)

  addTask(tasks.length < targetCount && goals[0]
    ? {
        title: `Просунути ціль: ${goals[0]}`,
        insight: 'Річна ціль має перейти в дію вже сьогодні, без розпорошення.',
        steps: lowEnergy
          ? []
          : [
              'Обрати один вимірюваний крок',
              'Зробити тільки перший крок сьогодні',
            ],
        sphere: 'vision',
        daysToComplete: 1,
        xpReward: 15,
        priority: 'medium',
      }
    : null)

  addTask(tasks.length < targetCount
    ? {
        title: `Закріпити стан дня${staticAnswers.identity ? `: ${staticAnswers.identity}` : ''}`,
        insight: 'Стан без дії швидко розсіюється. Малий крок допомагає перевести рефлексію в реальність.',
        steps: ['Записати одним реченням, як саме ти дієш із цього стану'],
        sphere: 'inner',
        daysToComplete: 1,
        xpReward: 10,
        priority: 'medium',
      }
    : null)

  return tasks.slice(0, targetCount)
}

function buildPromptContext(input: {
  userName: string
  level?: number | null
  xp?: number | null
  streak?: number | null
  userGoal: string
  userState: string
  userPain: string
  weakSpheres: string[]
  existingTasks: Array<{
    title: string
    status: string
    durationDays: number
    createdAt: string
    dueAt: string | null
    completedAt: string | null
    progressPercent: number | null
  }>
  slotsAvailable: number
  answers: Record<string, string>
  carryOverTasks: Array<{
    title: string
    progressPercent: number | null
    daysToComplete: number
  }>
}) {
  const staticMorningAnswersText = STATIC_MORNING_QUESTION_KEYS.reduce<Record<string, string>>((acc, key) => {
    const value = input.answers[key]
    if (typeof value === 'string' && value.trim().length > 0) {
      acc[humanizeMorningQuestionKey(key)] = value.trim()
    }
    return acc
  }, {})

  return JSON.stringify({
    user_name: input.userName,
    user_goal: input.userGoal,
    user_state: input.userState,
    user_pain: input.userPain,
    level: input.level ?? null,
    xp: input.xp ?? 0,
    streak: input.streak ?? 0,
    weak_spheres: input.weakSpheres,
    slots_available: input.slotsAvailable,
    existing_tasks: input.existingTasks,
    carry_over_tasks: input.carryOverTasks,
    static_morning_answers: staticMorningAnswersText,
  }, null, 2)
}

export async function generateTasksWithAi(input: {
  userName: string
  level?: number | null
  xp?: number | null
  streak?: number | null
  userGoal: string
  userState: string
  userPain: string
  weakSpheres: string[]
  existingTasks: Array<{
    title: string
    status: string
    durationDays: number
    createdAt: string
    dueAt: string | null
    completedAt: string | null
    progressPercent: number | null
  }>
  slotsAvailable: number
  answers: Record<string, string>
  carryOverTasks: Array<{
    title: string
    progressPercent: number | null
    daysToComplete: number
  }>
}) {
  const cacheKey = `morning-output:${stableHash(input)}`
  const cached = await cacheGet<{ raw: string; tasks: GeneratedTask[] | null } | null>(cacheKey)
  if (cached) {
    return cached
  }

  const system = [
    'Ти — AI-ментор у Starway Studio. Генеруєш мікрозавдання після ранкової рефлексії.',
    '',
    'Вхідні дані містять static_morning_answers — 6 базових відповідей ранкової рефлексії.',
    'Це фундамент особистості і довгострокових намірів.',
    '',
    'Правила генерації:',
    '1. Кількість завдань: найчастіше 1, інколи 2. Не давай 3 завдання у звичайному денному циклі.',
    '   Якщо видно втому або перевантаження → дай 1 завдання.',
    '   Якщо стан чіткий, є енергія і це справді доречно → максимум 2.',
    '   Якщо даних мало → 1.',
    '2. Якщо є carry_over_tasks з progressPercent < 80 → пріоритетно продовж їх.',
    '   Не починай день з нуля якщо є незавершені.',
    '3. Кожне завдання: title (до 12 слів), insight (до 15 слів, конкретно),',
    '   steps: [] або 1–2 кроки (ніколи не 3), durationDays: завжди 1.',
    '   Якщо задача велика — не розтягуй її на кілька днів, а дай лише один конкретний крок на сьогодні.',
    '   deadline: "До 23:59".',
    '4. Tone: прямо, по-дорослому, без мотиваційної води. Без знаків оклику.',
    '5. Мова: тільки українська.',
    '6. Відповідай тільки валідним JSON:',
    '   { "tasks": [{ "title": string, "insight": string, "steps": string[],',
    '     "sphere": string, "durationDays": number, "deadline": string | null,',
    '     "xpReward": number, "priority": "high" | "medium" | "low" }] }',
  ].join('\n')

  const userMessage = buildPromptContext(input)

  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    max_tokens: 900,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: `${userMessage}\n\nЗгенеруй не більше ${Math.min(input.slotsAvailable, 2)} задач.` },
    ],
  })

  const raw = completion.choices[0]?.message?.content ?? ''
  const parsed = safeJsonParse<{ tasks?: GeneratedTask[] }>(stripMarkdownFences(raw))

  const result = {
    raw,
    tasks: Array.isArray(parsed?.tasks) ? parsed.tasks : null,
  }
  await cacheSet(cacheKey, result, 3600)
  return result
}
