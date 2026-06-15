import { prisma as db } from '../db/client.js'
import {
  quickDetectIntent,
  resolveStrictIntelligenceReply,
  type StrictTelegramIntent,
} from '../modules/telegram-mentor/services/STRICT-SYSTEM-code.js'

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AIResponse {
  message: string
  intent: string
  confidence: number
  isFallback: boolean
  nextStep?: 'demo_focus' | 'book_session' | 'contact_nadya'
}

interface IntentDetectionResult {
  intent: string
  confidence: number
  isInScope: boolean
}

function mapNextStep(
  nextStep: ReturnType<typeof resolveStrictIntelligenceReply>['nextStep'],
): AIResponse['nextStep'] {
  if (nextStep === 'contact_nadya') return 'contact_nadya'
  if (nextStep === 'show_focus') return 'demo_focus'
  if (nextStep === 'show_absystem') return 'book_session'
  return undefined
}

export class ClaudeIntelligenceService {
  async detectIntent(userMessage: string): Promise<IntentDetectionResult> {
    const quick = quickDetectIntent(userMessage)
    if (!quick) {
      return { intent: 'unknown', confidence: 0, isInScope: false }
    }

    return {
      intent: quick.intent,
      confidence: quick.confidence,
      isInScope: !['out_of_scope', 'unknown'].includes(quick.intent),
    }
  }

  async generateResponse(
    userMessage: string,
    intent: string,
    _conversationHistory: ConversationMessage[],
    _userContext?: {
      firstName?: string
      trialStatus?: 'completed' | 'in_progress' | 'not_started'
      subscriptionStatus?: 'active' | 'expired' | 'none'
    },
  ): Promise<AIResponse> {
    const result = resolveStrictIntelligenceReply(
      userMessage,
      intent as StrictTelegramIntent,
    )

    return {
      message: result.message,
      intent: result.intent,
      confidence: result.confidence,
      isFallback: result.isFallback,
      nextStep: mapNextStep(result.nextStep),
    }
  }

  async getConversationHistory(
    userId: string,
    limit: number = 10,
  ): Promise<ConversationMessage[]> {
    try {
      const messages = await db.messageLog.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: limit,
      })

      return messages.reverse().map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      }))
    } catch (error) {
      console.error('[ClaudeIntelligence] History fetch error:', error)
      return []
    }
  }

  async saveMessage(
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    intent?: string,
  ): Promise<void> {
    try {
      await db.messageLog.create({
        data: {
          userId,
          role,
          content,
          intent,
          timestamp: new Date(),
        },
      })
    } catch (error) {
      console.error('[ClaudeIntelligence] Save message error:', error)
    }
  }
}

export const claudeIntelligenceService = new ClaudeIntelligenceService()
