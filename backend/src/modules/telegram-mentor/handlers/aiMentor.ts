import type { Context } from 'telegraf'

import { prisma } from '../../../db/client.js'
import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import { getSession } from '../session.js'
import { sendEntryOffer, sendStateMenu } from './start.js'
import { renderDecisionUnlessAllowed } from '../services/decisionTransport.service.js'
import { isLmOnlyModeEnabled } from '../runtime.js'
import { resolveUserLifecycle } from '../../flow-control/service.js'
import { resolveCentralLifecycleSnapshot } from '../../lifecycle/service.js'
import { planMessage } from '../conversation/delivery/planDelivery.js'

export type AIMentorEntryScenario = 'FIRST_ENTRY' | 'RETURN_WITH_CONTEXT' | 'STUCK_AT_POINT'

type AIMentorEntrySource = {
  conversationCount?: number
  lastTopic?: string | null
  repeatedTopic?: boolean
  lastGoal?: string | null
  conversations?: Array<{ title: string | null }>
}

type AIMentorEntryContext = {
  conversationCount: number
  topic: string | null
  lastGoal: string | null
  repeatedTopic: boolean
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function extractPrimaryGoal(goals: unknown): string | null {
  if (!Array.isArray(goals)) {
    return null
  }

  const goal = goals.find((item) => {
    if (!item || typeof item !== 'object') {
      return false
    }

    const record = item as Record<string, unknown>
    return record.isPrimary === true || record.primary === true
  }) ?? goals[0]

  if (!goal || typeof goal !== 'object') {
    return null
  }

  const record = goal as Record<string, unknown>
  return asString(record.text)
    ?? asString(record.title)
    ?? asString(record.goal)
    ?? null
}

function resolveRepeatedTopic(titles: Array<string | null>): boolean {
  const normalizedTitles = titles
    .map((title) => asString(title))
    .filter((title): title is string => Boolean(title))
    .map((title) => normalizeText(title))

  if (normalizedTitles.length < 2) {
    return false
  }

  const [latest, ...rest] = normalizedTitles
  return rest.includes(latest) || new Set(normalizedTitles).size < normalizedTitles.length
}

function resolveAIMentorEntryFromSource(source: AIMentorEntrySource): {
  scenario: AIMentorEntryScenario
  context: AIMentorEntryContext
} {
  const lastTopic = asString(source.lastTopic)
    ?? asString(source.conversations?.[0]?.title)
    ?? asString(source.lastGoal)

  const conversationCount = Number(source.conversationCount ?? source.conversations?.length ?? 0)
  const repeatedTopic = Boolean(source.repeatedTopic) || resolveRepeatedTopic(source.conversations?.map((conversation) => conversation.title ?? null) ?? [])

  if (conversationCount <= 0 && !lastTopic) {
    return {
      scenario: 'FIRST_ENTRY',
      context: {
        conversationCount: 0,
        topic: null,
        lastGoal: asString(source.lastGoal),
        repeatedTopic: false,
      },
    }
  }

  if (repeatedTopic) {
    return {
      scenario: 'STUCK_AT_POINT',
      context: {
        conversationCount,
        topic: lastTopic,
        lastGoal: asString(source.lastGoal),
        repeatedTopic: true,
      },
    }
  }

  if (conversationCount > 0 && lastTopic) {
    return {
      scenario: 'RETURN_WITH_CONTEXT',
      context: {
        conversationCount,
        topic: lastTopic,
        lastGoal: asString(source.lastGoal),
        repeatedTopic: false,
      },
    }
  }

  return {
    scenario: 'FIRST_ENTRY',
    context: {
      conversationCount,
      topic: lastTopic,
      lastGoal: asString(source.lastGoal),
      repeatedTopic: false,
    },
  }
}

export async function resolveAIMentorEntry(
  input: string | AIMentorEntrySource,
): Promise<{
  scenario: AIMentorEntryScenario
  context: AIMentorEntryContext
}> {
  if (typeof input !== 'string') {
    return resolveAIMentorEntryFromSource(input)
  }

  const user = await prisma.user.findUnique({
    where: { id: input },
    select: {
      aiConversations: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { title: true },
      },
      goalsSets: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { goals: true },
      },
    },
  }).catch(() => null)

  if (!user) {
    return resolveAIMentorEntryFromSource({})
  }

  const goalTopic = extractPrimaryGoal(user.goalsSets[0]?.goals ?? null)
  const conversationTitles = user.aiConversations.map((conversation) => conversation.title ?? null)

  return resolveAIMentorEntryFromSource({
    conversationCount: user.aiConversations.length,
    lastTopic: conversationTitles[0] ?? goalTopic,
    repeatedTopic: resolveRepeatedTopic(conversationTitles),
    lastGoal: goalTopic,
    conversations: user.aiConversations,
  })
}

function resolveAIMentorCopy(scenario: AIMentorEntryScenario, context: AIMentorEntryContext) {
  const copy = absystemContent.AI_MENTOR[scenario]
  const topic = context.topic ?? context.lastGoal ?? ''
  const text = typeof copy.text === 'function'
    ? copy.text(topic)
    : copy.text

  return {
    text,
    cta: copy.cta,
  }
}

export async function handleAIMentor(ctx: Context) {
  if (isLmOnlyModeEnabled()) {
    return
  }

  if (await renderDecisionUnlessAllowed(ctx, 'ai_mentor_requested', ['show_product', 'resume_session'])) {
    return
  }

  const chatId = ctx.chat?.id ? String(ctx.chat.id) : null
  if (!chatId) return

  const session = await getSession(chatId)
  if (!session) {
    await sendEntryOffer(ctx)
    return
  }

  const lifecycle = await resolveUserLifecycle(session.userId)
  const lifecycleSnapshot = resolveCentralLifecycleSnapshot({ userLifecycle: lifecycle })
  if (!lifecycleSnapshot.mentorState.eligible) {
    await sendStateMenu(ctx, session.userId)
    return
  }

  const entry = await resolveAIMentorEntry(session.userId)
  const copy = resolveAIMentorCopy(entry.scenario, entry.context)

  await planMessage(ctx, 'ctx.reply', 'ai_mentor_entry', copy.text, {
    inline_keyboard: [
      [{ text: copy.cta, callback_data: 'continue_ai_mentor' }],
    ],
  })
}
