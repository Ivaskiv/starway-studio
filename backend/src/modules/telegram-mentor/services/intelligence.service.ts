import type { AIMessageRole, Prisma } from '@starway/db/prisma-client'

import { prisma } from '../../../db/client.js'
import {
  quickDetectIntent as detectStrictIntent,
  resolveNextStep as resolveStrictNextStep,
  resolveStrictIntelligenceReply,
  type StrictTelegramIntent,
  type StrictTelegramNextStep,
  type StrictTelegramResult,
} from './STRICT-SYSTEM-code.js'

export type TelegramIntelligenceIntent = StrictTelegramIntent
export type TelegramIntelligenceStep = StrictTelegramNextStep

export type TelegramIntelligenceReplyMarkup = {
  inline_keyboard: Array<Array<
    | { text: string; callback_data: string }
    | { text: string; url: string }
  >>
}

export type TelegramIntelligenceResult = StrictTelegramResult & {
  replyMarkup?: TelegramIntelligenceReplyMarkup
}

const CONTACT_NADYA_URL = resolveTelegramSupportUrl()

function resolveTelegramSupportUrl(): string {
  const candidates = [
    process.env.NADYA_TELEGRAM_URL,
    process.env.NADYA_TELEGRAM,
    process.env.NADYA_TELEGRAM_HANDLE
      ? `https://t.me/${process.env.NADYA_TELEGRAM_HANDLE.replace(/^@/, '')}`
      : '',
    'https://t.me/nadya_couch',
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

  return 'https://t.me/nadya_couch'
}

function buildReplyMarkup(
  nextStep: TelegramIntelligenceStep,
): TelegramIntelligenceReplyMarkup | undefined {
  switch (nextStep) {
    case 'show_focus':
      return {
        inline_keyboard: [[
          { text: 'Дізнатись про ФОКУС', callback_data: 'open_focus_info' },
          { text: 'Написати Наді', url: CONTACT_NADYA_URL },
        ]],
      }
    case 'show_absystem':
      return {
        inline_keyboard: [[
          { text: 'Відкрити ABSystem', callback_data: 'continue_ai_mentor' },
          { text: 'Написати Наді', url: CONTACT_NADYA_URL },
        ]],
      }
    case 'contact_nadya':
      return {
        inline_keyboard: [[
          { text: 'Написати Наді', url: CONTACT_NADYA_URL },
        ]],
      }
    default:
      return undefined
  }
}

async function getOrCreateConversation(userId: string) {
  const existing = await prisma.aiConversation.findFirst({
    where: { userId, title: 'telegram-intelligence' },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  })

  if (existing) {
    return existing.id
  }

  const created = await prisma.aiConversation.create({
    data: {
      userId,
      title: 'telegram-intelligence',
      context: {
        source: 'telegram-intelligence',
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
        source: 'telegram-intelligence',
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

export function quickDetectIntent(message: string) {
  return detectStrictIntent(message)
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
  },
): Promise<TelegramIntelligenceResult> {
  const strictResult = resolveStrictIntelligenceReply(params.message)
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
