import { prisma } from '../../db/client.js'
import { openai } from '../../lib/openai.js'
import { updateUserState } from '../../core/orchestrator/userState.js'
import { VisionAnswers, type VisionStatement } from './types.js'
import {
  buildFallbackVisionSystem,
  normalizeVisionSystem,
  parseVisionAiPayload,
  parseVisionSystemContent,
  parseWheelScores,
  serializeVisionSystemContent,
  type VisionQuestionnairePayload,
  type VisionSystem,
} from './system.js'

type QuestionnairePayload = VisionQuestionnairePayload

function buildQuestionnaire(answers: VisionAnswers): QuestionnairePayload {
  return {
    idealLife: answers.idealLife,
    noLongerNormal: answers.noLongerNormal,
    pointB: answers.pointB,
  }
}

function buildVisionResponse(
  vision: Awaited<ReturnType<typeof prisma.visionStatement.findFirst>>,
  system: VisionSystem | null,
) {
  if (!vision) return null
  const questionnaire = (vision.questionnaire ?? {}) as QuestionnairePayload

  return {
    id: vision.id,
    userId: vision.userId,
    statement: vision.statement,
    idealLife: questionnaire.idealLife || '',
    noLongerNormal: questionnaire.noLongerNormal || '',
    pointB: questionnaire.pointB || '',
    createdAt: vision.createdAt,
    system,
  }
}

async function getLatestWheelScores(userId: string) {
  const latest = await prisma.userBalanceEntry.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { scores: true },
  })

  return parseWheelScores(latest?.scores ?? null)
}

async function aiGenerateVisionSystem(
  answers: VisionAnswers,
  wheelScores: Array<{ categoryId: string; score: number }>,
) {
  const prompt = `
Ти — системний AI-архітектор для життєвої WEB-карти.
Поверни ТІЛЬКИ JSON без markdown.

Вхідні дані:
${JSON.stringify({ answers, wheelScores }, null, 2)}

Побудуй систему, а не просто текст. Поверни JSON формату:
{
  "statement": "2-3 речення",
  "identityStatement": "Я ...",
  "mainGoalSphere": "health | career | relationships | energy | freedom | mind | selfDevelopment | finance",
  "dailyPrompt": "Яка одна дія сьогодні ...",
  "goals": [
    {
      "sphere": "health",
      "title": "коротка назва",
      "description": "що саме змінюється",
      "actions": ["3 короткі дії"],
      "factors": ["2-3 фактори"],
      "resources": ["2-3 ресурси"],
      "constraints": ["2-3 обмеження"],
      "solutions": ["2-3 рішення"],
      "scoreFrom": 4,
      "scoreTo": 7,
      "timeframeMonths": 3
    }
  ]
}

Правила:
- Українською
- 3-5 goals
- goals мають бути системними і конкретними
- хоча б одна goal має бути пов'язана зі слабкою сферою з wheelScores
- якщо health релевантна, включи seed-приклад переходу 4→7 за 3 місяці
`.trim()

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1800,
  })

  return response.choices[0]?.message?.content?.trim() ?? ''
}

function enrichOrchestrator(system: VisionSystem, userId: string): VisionSystem {
  const userState = updateUserState({
    userId,
    completedGoals: 0,
    goalsTotal: system.goals.length,
    churnSignals: system.goals.flatMap((goal) => goal.constraints),
    behaviorTags: [
      'vision_system_ready',
      system.mainGoalSphere ? `focus:${system.mainGoalSphere}` : null,
    ].filter((tag): tag is string => Boolean(tag)),
  })

  return {
    ...system,
    orchestrator: {
      ...system.orchestrator,
      behaviorTags: userState.behaviorTags,
      stage: userState.stage,
    },
  }
}

async function upsertVisionWebMap(userId: string, system: VisionSystem) {
  const year = new Date().getFullYear()

  return prisma.annualStrategyMap.upsert({
    where: { userId },
    create: {
      userId,
      year,
      vision: system.statement,
      goals: {
        create: system.goals.map((goal, index) => ({
          sphere: goal.sphere,
          title: goal.title,
          description: JSON.stringify({
            summary: goal.description,
            factors: goal.factors,
            resources: goal.resources,
            constraints: goal.constraints,
            solutions: goal.solutions,
            scoreFrom: goal.scoreFrom,
            scoreTo: goal.scoreTo,
            timeframeMonths: goal.timeframeMonths,
          }),
          monthlyActions: goal.actions,
          priority: index,
        })),
      },
    },
    update: {
      year,
      vision: system.statement,
      monthlyReviews: { deleteMany: {} },
      goals: {
        deleteMany: {},
        create: system.goals.map((goal, index) => ({
          sphere: goal.sphere,
          title: goal.title,
          description: JSON.stringify({
            summary: goal.description,
            factors: goal.factors,
            resources: goal.resources,
            constraints: goal.constraints,
            solutions: goal.solutions,
            scoreFrom: goal.scoreFrom,
            scoreTo: goal.scoreTo,
            timeframeMonths: goal.timeframeMonths,
          }),
          monthlyActions: goal.actions,
          priority: index,
        })),
      },
    },
    include: {
      goals: { orderBy: { priority: 'asc' } },
      monthlyReviews: true,
    },
  })
}

async function generateVisionSystem(userId: string, answers: VisionAnswers) {
  const wheelScores = await getLatestWheelScores(userId)
  const raw = await aiGenerateVisionSystem(answers, wheelScores).catch(() => '')
  const parsed = parseVisionAiPayload(raw)
  const normalized = normalizeVisionSystem(answers, wheelScores, parsed)
  return enrichOrchestrator(normalized, userId)
}

export async function createVisionStatement(
  userId: string,
  answers: VisionAnswers,
): Promise<VisionStatement> {
  const questionnaireData = buildQuestionnaire(answers)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (!user) throw new Error('user_not_found')

  const system = await generateVisionSystem(userId, answers)
  await upsertVisionWebMap(userId, system)

  const vision = await prisma.visionStatement.create({
    data: {
      userId,
      statement: system.statement,
      title: 'vision-system',
      content: serializeVisionSystemContent(system),
      questionnaire: questionnaireData,
    },
  })

  return buildVisionResponse(vision, system) as VisionStatement
}

export async function getLatestVision(userId: string): Promise<VisionStatement | null> {
  const vision = await prisma.visionStatement.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })

  const system = parseVisionSystemContent(vision?.content ?? null)
  return buildVisionResponse(vision, system) as VisionStatement | null
}

export async function updateVisionStatement(
  id: string,
  answers: VisionAnswers,
): Promise<VisionStatement> {
  const current = await prisma.visionStatement.findUnique({
    where: { id },
    select: { id: true, userId: true },
  })
  if (!current) throw new Error('vision_not_found')

  const questionnaireData = buildQuestionnaire(answers)
  const system = await generateVisionSystem(current.userId, answers)
  await upsertVisionWebMap(current.userId, system)

  const vision = await prisma.visionStatement.update({
    where: { id },
    data: {
      statement: system.statement,
      title: 'vision-system',
      content: serializeVisionSystemContent(system),
      questionnaire: questionnaireData,
    },
  })

  return buildVisionResponse(vision, system) as VisionStatement
}

export function buildVisionSystemFallback(answers: VisionAnswers) {
  return buildFallbackVisionSystem(answers, [])
}
