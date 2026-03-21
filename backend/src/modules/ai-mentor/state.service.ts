import { prisma } from '../../db/client.js'
import {
  DailyChoice,
  DailyState,
  Prisma,
} from '@prisma/client'
import { openai } from '../../lib/openai.js'
import { ensureMentor, ensureUserExpertId } from './helpers.js'

type StateSource = 'morning' | 'evening' | 'wheel' | 'leadmagnet' | 'daily'

type StateContextRecord = Record<string, unknown>

type StateHistoryItem = {
  analyzedAt: string
  source: StateSource
  blocker: string | null
  clarityLevel: string | null
  currentState: string | null
  stage: string | null
  insight: string | null
  behaviorPattern: string | null
  realGoal: string | null
  recommendedFocus: string | null
}

export interface UserAIMentorState {
  userId: string
  source: StateSource
  lastAnalyzedAt: Date
  currentState: string | null
  behaviorPattern: string | null
  clarityLevel: string | null
  stage: string | null
  insight: string | null
  blocker: string | null
  realGoal: string | null
  recommendedFocus: string | null
  context: Prisma.JsonValue
}

export interface StateInput {
  userId: string
  source: StateSource
  answers: Record<string, string>
}

export interface RankedMicroAction {
  rank: 1 | 2 | 3
  action: string
  duration: string
  type: 'physical' | 'cognitive' | 'decision' | 'communication' | 'reflection'
  targetConflict: string
  successCriteria: string
  telegramButton: string
}

export interface MicroActionsResult {
  actions: RankedMicroAction[]
}

export interface RegressionResult {
  interventionNeeded: boolean
  suggestedMessage: string
}

export interface AssistantRoutingMeta {
  state: string
  intent: string
  category: string
  text: string
}

const PROMPT_1 = `
You are a behavioral state analyzer.
DO NOT motivate. ANALYZE ONLY.
Return STRICT JSON, no text outside.
{
  "state": "fear|stagnation|conflict|clarity|action|avoidance",
  "goal": "as user stated",
  "realGoal": "behavioral inference",
  "conflict": "gap between want and do",
  "blocker": "root cause",
  "behaviorPattern": "specific pattern",
  "clarityLevel": "LOW|MEDIUM|HIGH",
  "stage": "AWARENESS|CONFLICT|DECISION|ACTION",
  "insight": "one sharp observation",
  "criticalFailure": "most critical breakdown",
  "recommendedFocus": "one concrete area",
  "nextAction": "specific, today, measurable"
}
RULES:
- Trust behavior over words
- If want ≠ do → conflict non-empty
- nextAction: specific + time-bound
- Language: Ukrainian
`.trim()

const PROMPT_2 = `
You are a behavioral state tracker.
Receive previous state + today input. Return ONLY delta as JSON.
{
  "stateChanged": boolean,
  "currentState": "fear|stagnation|conflict|clarity|action|avoidance",
  "stageChanged": boolean,
  "currentStage": "AWARENESS|CONFLICT|DECISION|ACTION",
  "completedAction": boolean,
  "newConflict": "string or null",
  "resolvedConflict": "string or null",
  "patternReinforced": boolean,
  "clarityDelta": "IMPROVED|SAME|DEGRADED",
  "insight": "one sharp delta observation",
  "blocker": "current root cause",
  "behaviorPattern": "current pattern",
  "clarityLevel": "LOW|MEDIUM|HIGH",
  "realGoal": "behavioral inference",
  "recommendedFocus": "one concrete area",
  "nextAction": "specific, tomorrow, measurable"
}
RULES:
- nextAction must differ from previous
- If same blocker again → patternReinforced = true
- Language: Ukrainian
`.trim()

export const PROMPT_INITIAL = PROMPT_1
export const PROMPT_UPDATE = PROMPT_2

const PROMPT_3 = `
Ти детектор регресії поведінки.
Поверни тільки JSON:
{
  "interventionNeeded": true,
  "suggestedMessage": "string"
}
Правила:
- аналізуй останні 7 днів
- якщо є застій, уникання або повтор того самого блоку 3+ дні, interventionNeeded=true
- suggestedMessage: українською, 1-2 речення, без мотивації
`.trim()

const PROMPT_4 = `
Ти генератор мікродій.
Поверни тільки JSON:
{
  "actions": [
    {
      "rank": 1,
      "action": "string",
      "duration": "string",
      "type": "physical|cognitive|decision|communication|reflection",
      "targetConflict": "string",
      "successCriteria": "string",
      "telegramButton": "string"
    }
  ]
}
Правила:
- 3 дії
- ранжуй за impact/effort
- без мотивації
- кнопка максимум 28 символів
`.trim()

const STATE_VALUES = new Set(['fear', 'stagnation', 'conflict', 'clarity', 'action', 'avoidance'])
const CLARITY_VALUES = new Set(['LOW', 'MEDIUM', 'HIGH'])
const STAGE_VALUES = new Set(['AWARENESS', 'CONFLICT', 'DECISION', 'ACTION'])

function toJsonObject(value: Prisma.JsonValue | null | undefined): Prisma.JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  return value as Prisma.JsonObject
}

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function normalizeEnum(value: string | null, allowed: Set<string>): string | null {
  if (!value) {
    return null
  }

  return allowed.has(value) ? value : null
}

function mapBehaviorToDailyState(currentState: string | null): DailyState {
  switch (currentState) {
    case 'fear':
      return DailyState.FEAR
    case 'clarity':
    case 'action':
      return DailyState.STABILITY
    case 'avoidance':
    case 'conflict':
    case 'stagnation':
    default:
      return DailyState.TENSION
  }
}

function normalizeActionType(value: string | null): RankedMicroAction['type'] {
  switch (value) {
    case 'physical':
    case 'cognitive':
    case 'decision':
    case 'communication':
    case 'reflection':
      return value
    default:
      return 'decision'
  }
}

async function analyzeState(input: {
  previousState: StateContextRecord | null
  source: StateSource
  answers: Record<string, string>
}): Promise<Omit<UserAIMentorState, 'userId' | 'lastAnalyzedAt' | 'context' | 'source'>> {
  const systemPrompt = input.previousState ? PROMPT_2 : PROMPT_1
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: JSON.stringify({
          source: input.source,
          previousState: input.previousState,
          answers: input.answers,
        }),
      },
    ],
    max_tokens: 300,
  })

  const rawContent = completion.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(rawContent) as Record<string, unknown>

  return {
    currentState: normalizeEnum(getString(parsed.currentState) ?? getString(parsed.state), STATE_VALUES),
    behaviorPattern: getString(parsed.behaviorPattern),
    clarityLevel: normalizeEnum(getString(parsed.clarityLevel), CLARITY_VALUES),
    stage: normalizeEnum(getString(parsed.currentStage) ?? getString(parsed.stage), STAGE_VALUES),
    insight: getString(parsed.insight),
    blocker: getString(parsed.blocker),
    realGoal: getString(parsed.realGoal),
    recommendedFocus: getString(parsed.recommendedFocus) ?? getString(parsed.nextAction),
  }
}

async function logStateToDailyEntry(input: {
  userId: string
  source: StateSource
  answers: Record<string, string>
  analyzedAt: Date
  normalized: Omit<UserAIMentorState, 'userId' | 'lastAnalyzedAt' | 'context' | 'source'>
}): Promise<void> {
  const expertId = await ensureUserExpertId(input.userId)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const existing = await prisma.dailyEntry.findUnique({
    where: {
      userId_date: {
        userId: input.userId,
        date: today,
      },
    },
  })

  const existingContent = toJsonObject(existing?.content)
  const stateLog = {
    source: input.source,
    analyzedAt: input.analyzedAt.toISOString(),
    normalized: {
      currentState: input.normalized.currentState,
      behaviorPattern: input.normalized.behaviorPattern,
      clarityLevel: input.normalized.clarityLevel,
      stage: input.normalized.stage,
      insight: input.normalized.insight,
      blocker: input.normalized.blocker,
      realGoal: input.normalized.realGoal,
      recommendedFocus: input.normalized.recommendedFocus,
    },
    answers: toInputJsonValue(input.answers),
  }

  const nextContent: Prisma.InputJsonValue = {
    ...existingContent,
    stateLog,
  } as Prisma.InputJsonValue

  await prisma.dailyEntry.upsert({
    where: {
      userId_date: {
        userId: input.userId,
        date: today,
      },
    },
    create: {
      userId: input.userId,
      expertId,
      date: today,
      state: mapBehaviorToDailyState(input.normalized.currentState),
      choice: DailyChoice.PENDING,
      dayFact: `State sync from ${input.source}`,
      aiAnalysis: input.normalized.insight,
      content: nextContent,
      microSupport: Prisma.JsonNull,
    },
    update: {
      aiAnalysis: input.normalized.insight,
      content: nextContent,
    },
  })
}

export async function updateUserState(input: StateInput): Promise<UserAIMentorState> {
  const userMentor = await ensureMentor(input.userId)
  const previousContext = toJsonObject(userMentor.context)
  const previousNormalized = toJsonObject(
    previousContext.normalizedState as Prisma.JsonValue | undefined,
  ) as StateContextRecord

  const normalized = await analyzeState({
    previousState: Object.keys(previousNormalized).length > 0 ? previousNormalized : null,
    source: input.source,
    answers: input.answers,
  })

  const analyzedAt = new Date()
  const previousHistoryRaw = previousContext.stateHistory
  const previousHistory = Array.isArray(previousHistoryRaw)
    ? previousHistoryRaw.filter(
        (item): item is Prisma.JsonObject => Boolean(item) && typeof item === 'object' && !Array.isArray(item),
      )
    : []

  const historyItem: StateHistoryItem = {
    analyzedAt: analyzedAt.toISOString(),
    source: input.source,
    blocker: normalized.blocker,
    clarityLevel: normalized.clarityLevel,
    currentState: normalized.currentState,
    stage: normalized.stage,
    insight: normalized.insight,
    behaviorPattern: normalized.behaviorPattern,
    realGoal: normalized.realGoal,
    recommendedFocus: normalized.recommendedFocus,
  }

  const nextContext: Prisma.InputJsonValue = {
    ...previousContext,
    normalizedState: {
      ...normalized,
      source: input.source,
      lastAnalyzedAt: analyzedAt.toISOString(),
    },
    lastStateSource: input.source,
    lastStateInput: toInputJsonValue(input.answers),
    stateHistory: [...previousHistory, historyItem].slice(-30),
  } as Prisma.InputJsonValue

  const updateData: Prisma.UserAIMentorUpdateInput = {
    context: nextContext,
    lastAnalyzedAt: analyzedAt,
    currentState: normalized.currentState,
    behaviorPattern: normalized.behaviorPattern,
    clarityLevel: normalized.clarityLevel,
    stage: normalized.stage,
    insight: normalized.insight,
    blocker: normalized.blocker,
    realGoal: normalized.realGoal,
    recommendedFocus: normalized.recommendedFocus,
    lastInteractionAt: analyzedAt,
  }

  const updated = await prisma.userAIMentor.update({
    where: { id: userMentor.id },
    data: updateData,
    select: {
      context: true,
    },
  })

  await logStateToDailyEntry({
    userId: input.userId,
    source: input.source,
    answers: input.answers,
    analyzedAt,
    normalized,
  })

  return {
    userId: input.userId,
    source: input.source,
    lastAnalyzedAt: analyzedAt,
    currentState: normalized.currentState,
    behaviorPattern: normalized.behaviorPattern,
    clarityLevel: normalized.clarityLevel,
    stage: normalized.stage,
    insight: normalized.insight,
    blocker: normalized.blocker,
    realGoal: normalized.realGoal,
    recommendedFocus: normalized.recommendedFocus,
    context: updated.context,
  }
}

export async function generateMicroActions(userId: string): Promise<MicroActionsResult> {
  const userMentor = await ensureMentor(userId)
  const primaryGoal = await prisma.goalsSet.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: { goals: true },
  })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: PROMPT_4 },
      {
        role: 'user',
        content: JSON.stringify({
          currentState: userMentor.currentState,
          stage: userMentor.stage,
          clarityLevel: userMentor.clarityLevel,
          blocker: userMentor.blocker,
          behaviorPattern: userMentor.behaviorPattern,
          primaryGoal: primaryGoal?.goals ?? null,
        }),
      },
    ],
    max_tokens: 500,
  })

  const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as {
    actions?: Array<Record<string, unknown>>
  }

  const actions = (parsed.actions ?? []).slice(0, 3).map((item, index) => ({
    rank: ([1, 2, 3][index] ?? 3) as 1 | 2 | 3,
    action: getString(item.action) ?? '',
    duration: getString(item.duration) ?? '5 minutes',
    type: normalizeActionType(getString(item.type)),
    targetConflict: getString(item.targetConflict) ?? '',
    successCriteria: getString(item.successCriteria) ?? '',
    telegramButton: (getString(item.telegramButton) ?? 'Виконати дію').slice(0, 28),
  }))

  return { actions }
}

export async function detectRegression(userId: string): Promise<RegressionResult> {
  const entries = await prisma.dailyEntry.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 7,
    select: {
      date: true,
      state: true,
      choice: true,
      dayFact: true,
      aiAnalysis: true,
    },
  })

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: PROMPT_3 },
      {
        role: 'user',
        content: JSON.stringify({
          last7Entries: entries.map(entry => ({
            date: entry.date.toISOString(),
            state: entry.state,
            choice: entry.choice,
            dayFact: entry.dayFact,
            aiAnalysis: entry.aiAnalysis,
          })),
        }),
      },
    ],
    max_tokens: 250,
  })

  const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as Record<string, unknown>
  const interventionNeeded = parsed.interventionNeeded === true
  const suggestedMessage = getString(parsed.suggestedMessage) ?? ''

  if (interventionNeeded) {
    await prisma.funnelLead.create({
      data: {
        userId,
        source: 'USER_INACTIVE',
        notes: suggestedMessage || 'USER_INACTIVE',
      },
    })
  }

  return {
    interventionNeeded,
    suggestedMessage,
  }
}

export async function logAssistantRoutingMeta(
  userId: string,
  meta: AssistantRoutingMeta,
): Promise<void> {
  const userMentor = await ensureMentor(userId)
  const previousContext = toJsonObject(userMentor.context)

  const nextContext: Prisma.InputJsonValue = {
    ...previousContext,
    lastIntent: meta.intent,
    lastCategory: meta.category,
    lastMessageState: meta.state,
    lastUserMessageText: meta.text,
    lastRoutedAt: new Date().toISOString(),
  } as Prisma.InputJsonValue

  await prisma.userAIMentor.update({
    where: { id: userMentor.id },
    data: {
      context: nextContext,
      lastInteractionAt: new Date(),
    },
  })
}
