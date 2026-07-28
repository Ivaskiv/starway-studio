import type { AIMessageRole, Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../../db/client.js'
import { readTelegramBotConfig } from '../runtime/botConfig.js'
import {
  quickDetectIntent as detectStrictIntent,
  resolveNextStep as resolveStrictNextStep,
  resolveStrictIntelligenceReply,
  type StrictTelegramIntent,
  type StrictTelegramNextStep,
  type StrictTelegramResult,
} from './STRICT-SYSTEM-code.js'
import { telegramContentRegistry } from '../content/contentRegistry.js'

export type TelegramIntelligenceIntent = StrictTelegramIntent
export type TelegramIntelligenceStep = StrictTelegramNextStep
export type TelegramIntelligenceMessageType =
  | 'MEMORY_REQUEST'
  | 'QUESTION'
  | 'FOLLOWUP'
  | 'PERSONAL_SITUATION'
  | 'FOCUS_RELATED'
  | 'SMALL_TALK'
  | 'UNKNOWN'

export type TelegramIntelligenceReplyMarkup = {
  inline_keyboard: Array<Array<
    | { text: string; callback_data: string }
    | { text: string; url: string }
  >>
}

export type TelegramIntelligenceResult = StrictTelegramResult & {
  replyMarkup?: TelegramIntelligenceReplyMarkup
}

export type TelegramConversationHistoryMessage = {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

const FALLBACK_TELEGRAM_SUPPORT_URL =
  readTelegramBotConfig().botLink || 'https://t.me/Test_ABsystem_bot'
const CONTACT_NADYA_URL = resolveTelegramSupportUrl()

export function resolveTelegramSupportUrl(): string {
  const candidates = [
    process.env.NADYA_TELEGRAM_URL,
    process.env.NADYA_TELEGRAM,
    process.env.NADYA_TELEGRAM_HANDLE
      ? `https://t.me/${process.env.NADYA_TELEGRAM_HANDLE.replace(/^@/, '')}`
      : '',
    FALLBACK_TELEGRAM_SUPPORT_URL,
  ]

  for (const candidate of candidates) {
    const value = String(candidate ?? '').trim()
    if (!value) continue
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value
    }
    if (value.startsWith('@')) {
      return `https://t.me/${value.slice(1)}`
    }
    return `https://t.me/${value}`
  }

  return FALLBACK_TELEGRAM_SUPPORT_URL
}

function buildReplyMarkup(
  nextStep: TelegramIntelligenceStep,
): TelegramIntelligenceReplyMarkup | undefined {
  switch (nextStep) {
    case 'show_focus':
      return {
        inline_keyboard: [[
          { text: telegramContentRegistry.buttons.openFocus, callback_data: 'ab_test:focus_info' },
          { text: telegramContentRegistry.buttons.contactNadya, url: CONTACT_NADYA_URL },
        ]],
      }
    case 'show_absystem':
      return {
        inline_keyboard: [[
          { text: telegramContentRegistry.buttons.openAbsystem, callback_data: 'continue_ai_mentor' },
          { text: telegramContentRegistry.buttons.contactNadya, url: CONTACT_NADYA_URL },
        ]],
      }
    case 'contact_nadya':
      return {
        inline_keyboard: [[
          { text: telegramContentRegistry.buttons.contactNadya, url: CONTACT_NADYA_URL },
        ]],
      }
    default:
      return undefined
  }
}

async function getOrCreateConversation(userId: string) {
  const existing = await prisma.aiConversation.findFirst({
    where: { userId, title: telegramContentRegistry.system.telegramIntelligenceConversationTitle },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  })

  if (existing) {
    return existing.id
  }

  const created = await prisma.aiConversation.create({
    data: {
      userId,
      title: telegramContentRegistry.system.telegramIntelligenceConversationTitle,
      context: {
        source: telegramContentRegistry.system.telegramIntelligenceSource,
        strictMode: true,
      } as Prisma.InputJsonValue,
    },
    select: { id: true },
  })

  return created.id
}

async function appendConversationMessages(
  userId: string,
  userMessage: string,
  assistantMessage: string,
  meta: {
    intent: TelegramIntelligenceIntent
    confidence: number
    isFallback: boolean
    nextStep: TelegramIntelligenceStep
  },
): Promise<void> {
  const conversationId = await getOrCreateConversation(userId)
  const payload = [
    { conversationId, role: 'USER' as AIMessageRole, content: userMessage },
    { conversationId, role: 'ASSISTANT' as AIMessageRole, content: assistantMessage },
  ]

  await prisma.aiMessage.createMany({ data: payload })

  await prisma.aiConversation.update({
    where: { id: conversationId },
    data: {
      context: {
        source: telegramContentRegistry.system.telegramIntelligenceSource,
        strictMode: true,
        lastIntent: meta.intent,
        lastConfidence: meta.confidence,
        lastFallback: meta.isFallback,
        lastStep: meta.nextStep,
        updatedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  })
}

export function mapTelegramConversationHistory(
  messages: Array<{
    role: AIMessageRole
    content: string
    createdAt: Date
  }>,
): TelegramConversationHistoryMessage[] {
  return messages
    .map((message) => ({
      role: message.role === 'USER' ? 'user' as const : 'assistant' as const,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    }))
    .reverse()
}

export async function getTelegramConversationHistory(
  userId: string,
  limit = 6,
): Promise<TelegramConversationHistoryMessage[]> {
  const conversation = await prisma.aiConversation.findFirst({
    where: { userId, title: telegramContentRegistry.system.telegramIntelligenceConversationTitle },
    orderBy: { updatedAt: 'desc' },
    select: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
  })

  return mapTelegramConversationHistory(conversation?.messages ?? [])
}

export async function appendTelegramConversationTurn(
  userId: string,
  userMessage: string,
  assistantMessage: string,
  meta?: {
    intent?: TelegramIntelligenceIntent | string
    confidence?: number | null
    isFallback?: boolean
    nextStep?: TelegramIntelligenceStep | string | null
    messageType?: string | null
  },
): Promise<void> {
  const conversationId = await getOrCreateConversation(userId)

  await prisma.aiMessage.createMany({
    data: [
      { conversationId, role: 'USER', content: userMessage },
      { conversationId, role: 'ASSISTANT', content: assistantMessage },
    ],
  })

  await prisma.aiConversation.update({
    where: { id: conversationId },
    data: {
      context: {
        source: telegramContentRegistry.system.telegramIntelligenceSource,
        strictMode: false,
        lastIntent: meta?.intent ?? null,
        lastConfidence: meta?.confidence ?? null,
        lastFallback: meta?.isFallback ?? false,
        lastStep: meta?.nextStep ?? null,
        lastMessageType: meta?.messageType ?? null,
        updatedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  })
}

export function quickDetectIntent(message: string) {
  return detectStrictIntent(message)
}

export function detectTelegramIntelligenceMessageType(text: string): TelegramIntelligenceMessageType {
  const lower = text.toLowerCase().trim()
  const compact = lower.replace(/\s+/g, ' ')

  if (telegramContentRegistry.intelligenceDetection.memoryRequestTriggers.some((key) => lower.includes(key))) {
    return 'MEMORY_REQUEST'
  }

  if (telegramContentRegistry.intelligenceDetection.followupTriggers.some((key) => lower.startsWith(key))) {
    return 'FOLLOWUP'
  }

  if (telegramContentRegistry.intelligenceDetection.personalSituationTriggers.some((key) => lower.includes(key))) {
    return 'PERSONAL_SITUATION'
  }

  if (telegramContentRegistry.intelligenceDetection.focusRelatedTriggers.some((key) => lower.includes(key))) {
    return 'FOCUS_RELATED'
  }

  if (telegramContentRegistry.intelligenceDetection.questionTriggers.some((key) => lower.startsWith(`${key} `) || lower === key)) {
    return 'QUESTION'
  }

  if (telegramContentRegistry.intelligenceDetection.smallTalkTriggers.some((value) => value === compact)) {
    return 'SMALL_TALK'
  }

  return 'UNKNOWN'
}

export function resolveNextStep(
  intent: TelegramIntelligenceIntent,
  isFallback: boolean,
): TelegramIntelligenceStep {
  return resolveStrictNextStep(intent, isFallback)
}

export async function resolveTelegramIntelligence(
  params: {
    chatId: string
    userId: string | null
    message: string
    preferredIntent?: StrictTelegramIntent
  },
): Promise<TelegramIntelligenceResult> {
  const strictResult = resolveStrictIntelligenceReply(params.message, params.preferredIntent)
  const result: TelegramIntelligenceResult = {
    ...strictResult,
    replyMarkup: buildReplyMarkup(strictResult.nextStep),
  }

  if (params.userId) {
    await appendConversationMessages(
      params.userId,
      params.message,
      result.message,
      {
        intent: result.intent,
        confidence: result.confidence,
        isFallback: result.isFallback,
        nextStep: result.nextStep,
      },
    ).catch((error) => {
      console.warn('[telegram-intelligence] failed to persist conversation', {
        userId: params.userId,
        chatId: params.chatId,
        error: error instanceof Error ? error.message : String(error),
      })
    })
  }

  return result
}
