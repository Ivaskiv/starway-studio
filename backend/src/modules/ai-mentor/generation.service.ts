import { openai } from '@starway/ai/providers'
import { prisma } from '../../db/client.js'
import { checkQuota, decrementQuota } from '../quota/service.js'
import { buildSystemPrompt, buildContextPrompt, buildTaskPrompt, MentorConfigPayload } from './prompt.js'
import { GenerationIntent, GenerationRequest, GenerationResponse } from './types.js'
import { GenerationType } from '@starway/db/prisma-client'
import { runGuardedAiTask, stableHash } from '../../services/aiGuard.service.js'

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
const COST_MAP: Record<GenerationIntent, number> = {
  morning: 0.00045,
  evening: 0.00045,
  wheel: 0.0062,
  weekly: 0.0006,
  chat: 0.0005,
  pdf: 0.0075,
}

const TYPE_MAP: Record<GenerationIntent, GenerationType> = {
  morning: 'MORNING_SESSION',
  evening: 'EVENING_SESSION',
  wheel: 'WHEEL_ANALYSIS',
  weekly: 'WEEKLY_ANALYSIS',
  chat: 'CHAT',
  pdf: 'PDF_REPORT',
}

async function resolveMentorConfig(userId: string, mentorConfigId?: string): Promise<MentorConfigPayload> {
  if (mentorConfigId) {
    const product = await prisma.product.findUnique({
      where: { id: mentorConfigId },
      select: { mentorConfig: true },
    })
    if (product?.mentorConfig) return product.mentorConfig as MentorConfigPayload
  }
  const config = await prisma.mentorConfig.findUnique({ where: { userId } })
  return (config?.config as MentorConfigPayload) ?? {}
}

function safeParseJson(text: string) {
  try {
    return JSON.parse(text)
  } catch (error) {
    return { text, error: 'invalid_json' }
  }
}

async function callOpenAi(system: string, context: string, task: string, userId: string) {
  const message = await runGuardedAiTask(
    {
      userId,
      source: 'mentor-generation',
      label: 'mentor-generation',
      payloadHash: stableHash({ system, context, task }),
      throttleMs: 10_000,
      duplicateWindowMs: 10 * 60_000,
    },
    async () => {
      const completion = await openai.chat.completions.create({
        model: MODEL,
        temperature: 0.35,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: context },
          { role: 'user', content: task },
        ],
        max_tokens: 800,
      })

      return {
        text: completion.choices[0]?.message?.content ?? '',
        usage: completion.usage,
      }
    },
    () => ({ text: '', usage: undefined }),
  )

  const parsed = safeParseJson(message.text.trim())

  return {
    text: message.text,
    parsed,
    usage: message.usage,
  }
}

export async function generatePayload(request: GenerationRequest): Promise<GenerationResponse> {
  const hasQuota = await checkQuota(request.userId)
  if (!hasQuota) {
    const error: Error & { code?: string } = new Error('quota_exceeded')
    error.code = 'QUOTA_EXCEEDED'
    throw error
  }
  const config = await resolveMentorConfig(request.userId, request.productId)
  const systemPrompt = buildSystemPrompt(config)
  const contextPrompt = await buildContextPrompt(request.userId)
  const taskPrompt = buildTaskPrompt(request.type, request.params)
  const response = await callOpenAi(systemPrompt, contextPrompt, taskPrompt, request.userId)

  await decrementQuota({
    userId: request.userId,
    type: TYPE_MAP[request.type],
    costUsd: COST_MAP[request.type],
    taskPrompt,
    tokensInput: response.usage?.prompt_tokens ?? 0,
    tokensOutput: response.usage?.completion_tokens ?? 0,
    productId: request.productId ?? null,
  })

  return {
    intent: request.type,
    payload: response.parsed,
    raw: response.text,
  }
}
