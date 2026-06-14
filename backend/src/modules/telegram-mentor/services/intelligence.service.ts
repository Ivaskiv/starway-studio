import Anthropic from '@anthropic-ai/sdk'
import type { AIMessageRole, Prisma } from '@starway/db/prisma-client'
import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import { aiSellerContent } from '@/products/ab-system/config/aiSeller.content.js'

import { prisma } from '../../../db/client.js'
import { runRegisteredAiTask } from '../../../services/aiTaskRunner.service.js'
import { stableHash } from '../../../services/aiGuard.service.js'
import { resolveAiModel } from '../../../platform/ai.registry.js'

export type TelegramIntelligenceIntent =
  | 'about_focus'
  | 'about_absystem'
  | 'about_course'
  | 'pricing'
  | 'not_ready_to_buy'
  | 'technical_issue'
  | 'general_inquiry'
  | 'out_of_scope'
  | 'unknown'

export type TelegramIntelligenceStep =
  | 'show_focus'
  | 'show_absystem'
  | 'contact_nadya'
  | 'continue_chat'

export type TelegramIntelligenceReplyMarkup = {
  inline_keyboard: Array<Array<
    | { text: string; callback_data: string }
    | { text: string; url: string }
  >>
}

export type TelegramIntelligenceResult = {
  message: string
  intent: TelegramIntelligenceIntent
  confidence: number
  isFallback: boolean
  nextStep: TelegramIntelligenceStep
  replyMarkup?: TelegramIntelligenceReplyMarkup
}

type ConversationMessage = {
  role: 'user' | 'assistant'
  content: string
}

type ConversationContext = {
  userId: string | null
  chatId: string
  userState: string | null
  firstName: string | null
  telegramUserName: string | null
  lastIntent: TelegramIntelligenceIntent | null
  messageCount: number
}

type ClaudeClassification = {
  message?: string
  intent: TelegramIntelligenceIntent
  confidence: number
  isFallback?: boolean
  nextStep?: TelegramIntelligenceStep
}

const MAX_HISTORY_MESSAGES = 6
const MAX_RESPONSE_LENGTH = 900
const anthropicClient = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const INTENT_PATTERNS: Array<{
  intent: Exclude<TelegramIntelligenceIntent, 'general_inquiry' | 'out_of_scope' | 'unknown'>
  pattern: RegExp
}> = [
  { intent: 'about_focus', pattern: /фокус|zoom.*практик|практик.*zoom|що таке фокус|як це працює/i },
  { intent: 'about_absystem', pattern: /absystem|абсистема|система\s+ab|5\s*елемент|стан.*ціль.*вибір|рішення.*дія/i },
  { intent: 'technical_issue', pattern: /не працю|помилк|доступ|логін|увійти|оплат.*не|payment|access/i },
  { intent: 'about_course', pattern: /курс|сертифікат|сертифікац|навчання|матеріал|урок/i },
  { intent: 'pricing', pattern: /ціна|вартість|скільки|оплат|тариф|коштує|платіж/i },
  { intent: 'not_ready_to_buy', pattern: /не готов|ще не готов|потрібно більше інформац|подумати|без покупки/i },
]

const CONTACT_NADYA_URL = resolveTelegramSupportUrl()

function resolveTelegramSupportUrl(): string {
  const candidates = [
    process.env.NADYA_TELEGRAM_URL,
    process.env.NADYA_TELEGRAM,
    process.env.NADYA_TELEGRAM_HANDLE ? `https://t.me/${process.env.NADYA_TELEGRAM_HANDLE.replace(/^@/, '')}` : '',
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

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function clampText(value: string, maxLength = MAX_RESPONSE_LENGTH): string {
  const normalized = normalizeText(value)
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`
}

export function quickDetectIntent(message: string): ClaudeClassification | null {
  for (const entry of INTENT_PATTERNS) {
    if (entry.pattern.test(message)) {
      return { intent: entry.intent, confidence: 0.9 }
    }
  }

  if (/\b(дякую|ок|окей|понятно|ясно)\b/i.test(message)) {
    return { intent: 'general_inquiry', confidence: 0.6 }
  }

  return null
}

function getFallbackCopy(intent: TelegramIntelligenceIntent): string {
  switch (intent) {
    case 'about_focus':
      return aiSellerContent.LEAD.objections.what_is_it
    case 'about_absystem':
      return aiSellerContent.FOCUS.platform_details
    case 'about_course':
      return absystemContent.START_FLOWS.FOCUS_PARTICIPANT.text
    case 'pricing':
      return [
        `ФОКУС: ${aiSellerContent.LEAD.price_1m} / ${aiSellerContent.LEAD.price_3m}`,
        `Платформа для учасниць ФОКУСУ: ${aiSellerContent.FOCUS.price_upgrade}`,
      ].join('\n')
    case 'not_ready_to_buy':
      return 'Якщо зараз не час купувати, можемо просто розібрати формат без тиску. Коли буде потреба, повернемось до наступного кроку.'
    case 'technical_issue':
      return 'Тут краще не гадати. Напиши Наді, і вона перевірить проблему персонально.'
    default:
      return 'Напиши Наді. Тут краще дати точну відповідь, ніж здогадуватись.'
  }
}

function buildKnowledgeBase(): string {
  return [
    'Факт-чек для Telegram intelligence layer.',
    `FOCUS опис: ${aiSellerContent.LEAD.objections.what_is_it}`,
    `FOCUS формат: ${aiSellerContent.LEAD.msg3}`,
    `FOCUS ціна: ${aiSellerContent.LEAD.price_1m} / ${aiSellerContent.LEAD.price_3m}`,
    `ABSystem опис: ${aiSellerContent.FOCUS.platform_details}`,
    `ABSystem upgrade: ${aiSellerContent.FOCUS.price_upgrade}`,
    `ABSystem activation: ${absystemContent.START_FLOWS.FOCUS_PARTICIPANT.text}`,
    `Human handoff: ${getFallbackCopy('technical_issue')}`,
    'Do not invent facts that are not in this knowledge block.',
  ].join('\n\n')
}

function buildSystemPrompt(context: ConversationContext, intent: TelegramIntelligenceIntent): string {
  return [
    'You are the Telegram intelligence layer for Starway.',
    'Answer only in Ukrainian.',
    'Use premium, calm, precise language.',
    'Do not use emojis, hype, marketing clichés, or gender-marked past tense forms.',
    'Do not mention internal pipeline labels, lifecycle stages, or telemetry terms.',
    'Stay within the Starway / FOCUS / ABSystem scope.',
    'If the user is out of scope, return a short handoff to Nadya.',
    'Keep the answer short enough for Telegram.',
    'Always provide exactly one next step.',
    'Return strict JSON with keys:',
    '{"message":"string","intent":"string","confidence":0-1,"isFallback":boolean,"nextStep":"show_focus|show_absystem|contact_nadya|continue_chat"}',
    '',
    `Detected intent: ${intent}`,
    `User state: ${context.userState ?? 'unknown'}`,
    `User name: ${context.firstName ?? 'unknown'}`,
    `Telegram username: ${context.telegramUserName ?? 'unknown'}`,
    '',
    'Knowledge base:',
    buildKnowledgeBase(),
  ].join('\n')
}

async function getConversationContext(userId: string | null, chatId: string): Promise<ConversationContext> {
  if (!userId) {
    return {
      userId: null,
      chatId,
      userState: null,
      firstName: null,
      telegramUserName: null,
      lastIntent: null,
      messageCount: 0,
    }
  }

  const [user, conversation] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        telegramUserName: true,
        currentState: true,
        lifecycleState: true,
      },
    }),
    prisma.aiConversation.findFirst({
      where: { userId, title: 'telegram-intelligence' },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        context: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: MAX_HISTORY_MESSAGES,
          select: {
            role: true,
            content: true,
          },
        },
      },
    }),
  ])

  const context = conversation?.context && typeof conversation.context === 'object' && !Array.isArray(conversation.context)
    ? (conversation.context as Record<string, unknown>)
    : {}

  return {
    userId,
    chatId,
    userState: user?.lifecycleState ?? user?.currentState ?? null,
    firstName: user?.firstName ?? null,
    telegramUserName: user?.telegramUserName ?? null,
    lastIntent: typeof context.lastIntent === 'string' ? (context.lastIntent as TelegramIntelligenceIntent) : null,
    messageCount: conversation?.messages.length ?? 0,
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
        lastIntent: meta.intent,
        lastConfidence: meta.confidence,
        lastFallback: meta.isFallback,
        lastStep: meta.nextStep,
        updatedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  })
}

function parseClaudeJson(text: string): ClaudeClassification | null {
  try {
    const parsed = JSON.parse(text) as Partial<ClaudeClassification>
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    const intent = typeof parsed.intent === 'string'
      ? (parsed.intent as TelegramIntelligenceIntent)
      : 'unknown'
    const confidence = typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.5
    const message = typeof parsed.message === 'string' ? parsed.message : undefined
    const isFallback = typeof parsed.isFallback === 'boolean' ? parsed.isFallback : undefined
    const nextStep = typeof parsed.nextStep === 'string'
      ? (parsed.nextStep as TelegramIntelligenceStep)
      : undefined

    return {
      message,
      intent,
      confidence,
      isFallback,
      nextStep,
    }
  } catch {
    return null
  }
}

async function classifyWithClaude(message: string): Promise<ClaudeClassification> {
  const response = await anthropicClient.messages.create({
    model: resolveAiModel('telegram_intelligence'),
    max_tokens: 120,
    temperature: 0,
    system: [
      'Classify the message into exactly one intent.',
      'Allowed intents: about_focus, about_absystem, about_course, pricing, not_ready_to_buy, technical_issue, general_inquiry, out_of_scope.',
      'Return strict JSON only.',
      'Example: {"intent":"about_focus","confidence":0.93}',
    ].join('\n'),
    messages: [
      {
        role: 'user',
        content: message,
      },
    ],
  })

  const text = response.content.find((block) => block.type === 'text')
  if (!text || text.type !== 'text') {
    return { intent: 'unknown', confidence: 0 }
  }

  return parseClaudeJson(text.text) ?? { intent: 'unknown', confidence: 0 }
}

function buildReplyMarkup(nextStep: TelegramIntelligenceStep): TelegramIntelligenceReplyMarkup | undefined {
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

export function resolveNextStep(intent: TelegramIntelligenceIntent, isFallback: boolean): TelegramIntelligenceStep {
  if (isFallback || intent === 'technical_issue' || intent === 'out_of_scope') {
    return 'contact_nadya'
  }

  if (intent === 'about_absystem') {
    return 'show_absystem'
  }

  if (intent === 'about_focus' || intent === 'about_course' || intent === 'pricing' || intent === 'not_ready_to_buy') {
    return 'show_focus'
  }

  return 'continue_chat'
}

function normalizeModelResponse(raw: unknown, fallbackIntent: TelegramIntelligenceIntent): TelegramIntelligenceResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    const nextStep = resolveNextStep(fallbackIntent, true)
    return {
      message: getFallbackCopy(fallbackIntent),
      intent: fallbackIntent,
      confidence: 0,
      isFallback: true,
      nextStep,
      replyMarkup: buildReplyMarkup(nextStep),
    }
  }

  const record = raw as Record<string, unknown>
  const intent = typeof record.intent === 'string'
    ? (record.intent as TelegramIntelligenceIntent)
    : fallbackIntent
  const confidence = typeof record.confidence === 'number' && Number.isFinite(record.confidence)
    ? Math.max(0, Math.min(1, record.confidence))
    : 0.5
  const isFallback = Boolean(record.isFallback) || intent === 'technical_issue' || intent === 'out_of_scope'
  const nextStep = typeof record.nextStep === 'string'
    ? (record.nextStep as TelegramIntelligenceStep)
    : resolveNextStep(intent, isFallback)
  const message = typeof record.message === 'string' && record.message.trim().length > 0
    ? clampText(record.message)
    : getFallbackCopy(intent)

  return {
    message,
    intent,
    confidence,
    isFallback,
    nextStep,
    replyMarkup: buildReplyMarkup(nextStep),
  }
}

function hasBannedTelemetryTerms(text: string): boolean {
  return /\b(stage|progression|onboarding|pipeline|lifecycle stage|trust level)\b/i.test(text)
}

function isSafeReply(text: string): boolean {
  return !/[🤖📚🚀✨🔥💥]/u.test(text) && !hasBannedTelemetryTerms(text)
}

export async function resolveTelegramIntelligence(
  params: {
    chatId: string
    userId: string | null
    message: string
  },
): Promise<TelegramIntelligenceResult> {
  const cleanMessage = normalizeText(params.message)
  const userId = params.userId
  const context = await getConversationContext(userId, params.chatId)
  const quickIntent = quickDetectIntent(cleanMessage)
  const classifiedIntent = quickIntent ?? await classifyWithClaude(cleanMessage).catch(() => ({
    intent: 'unknown' as const,
    confidence: 0,
  }))
  const promptIntent = classifiedIntent.intent === 'unknown'
    ? 'general_inquiry'
    : classifiedIntent.intent

  const basePayload = {
    chatId: params.chatId,
    userId,
    cleanMessage,
    userState: context.userState,
    lastIntent: context.lastIntent,
    messageCount: context.messageCount,
    detectedIntent: promptIntent,
  }
  const payloadHash = stableHash(basePayload)

  const response = await runRegisteredAiTask(
    'telegram_intelligence',
    {
      userId: userId ?? `chat:${params.chatId}`,
      source: 'telegram-intelligence',
      label: 'telegram-intelligence',
      payloadHash,
      payload: basePayload,
    },
    async () => {
      const systemPrompt = buildSystemPrompt(context, promptIntent)
      const result = await anthropicClient.messages.create({
        model: resolveAiModel('telegram_intelligence'),
        max_tokens: 360,
        temperature: 0.2,
        system: systemPrompt,
        messages: [
          ...(context.userId
            ? await loadRecentMessages(context.userId)
            : []),
          {
            role: 'user',
            content: cleanMessage,
          },
        ],
      })

      const text = result.content.find((block) => block.type === 'text')
      if (!text || text.type !== 'text') {
        return {
          message: getFallbackCopy(promptIntent),
          intent: promptIntent,
          confidence: classifiedIntent.confidence ?? 0.5,
          isFallback: true,
          nextStep: resolveNextStep(promptIntent, true),
        } satisfies TelegramIntelligenceResult
      }

      const parsed = parseClaudeJson(text.text)
      if (!parsed) {
        return {
          message: getFallbackCopy(promptIntent),
          intent: promptIntent,
          confidence: classifiedIntent.confidence ?? 0.5,
          isFallback: true,
          nextStep: resolveNextStep(promptIntent, true),
          replyMarkup: buildReplyMarkup(resolveNextStep(promptIntent, true)),
        } satisfies TelegramIntelligenceResult
      }

      return normalizeModelResponse(
        {
          message: parsed.message ?? '',
          intent: parsed.intent,
          confidence: parsed.confidence,
          isFallback: parsed.isFallback ?? false,
          nextStep: parsed.nextStep,
        },
        promptIntent,
      )
    },
    () => {
      const intent = promptIntent
      const nextStep = resolveNextStep(intent, true)
      return {
        message: getFallbackCopy(intent),
        intent,
        confidence: classifiedIntent.confidence ?? 0,
        isFallback: true,
        nextStep,
        replyMarkup: buildReplyMarkup(nextStep),
      } satisfies TelegramIntelligenceResult
    },
  )

  const normalized = normalizeModelResponse(
    {
      message: response.message,
      intent: response.intent,
      confidence: response.confidence,
      isFallback: response.isFallback,
      nextStep: response.nextStep,
    },
    promptIntent,
  )

  const safeMessage = response.message && isSafeReply(response.message)
    ? response.message
    : getFallbackCopy(normalized.intent)
  const finalResult: TelegramIntelligenceResult = {
    ...normalized,
    message: clampText(safeMessage),
    replyMarkup: normalized.replyMarkup,
  }

  if (userId) {
    await appendConversationMessages(
      userId,
      cleanMessage,
      finalResult.message,
      {
        intent: finalResult.intent,
        confidence: finalResult.confidence,
        isFallback: finalResult.isFallback,
        nextStep: finalResult.nextStep,
      },
    ).catch((error) => {
      console.warn('[telegram-intelligence] failed to persist conversation', {
        userId,
        chatId: params.chatId,
        error: error instanceof Error ? error.message : String(error),
      })
    })
  }

  return finalResult
}

async function loadRecentMessages(userId: string): Promise<ConversationMessage[]> {
  const conversation = await prisma.aiConversation.findFirst({
    where: { userId, title: 'telegram-intelligence' },
    orderBy: { updatedAt: 'desc' },
    select: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: MAX_HISTORY_MESSAGES,
        select: { role: true, content: true },
      },
    },
  })

  if (!conversation) {
    return []
  }

  return [...conversation.messages]
    .reverse()
    .map((message) => ({
      role: message.role === 'ASSISTANT' ? 'assistant' : 'user',
      content: message.content,
    }))
}
