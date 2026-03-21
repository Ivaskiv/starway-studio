import { prisma } from '../../../db/client.js'
import { PRODUCER_SYSTEM, producerChat } from '../../producer/service.js'
import type { ProducerChatMessage } from '../../producer/types.js'
import type { RoleConfig, RoleResult } from './base.role.js'

export const producerRoleConfig: RoleConfig = {
  systemPrompt: PRODUCER_SYSTEM,
  temperature: 0.7,
  maxTokens: 1500,
}

export async function runProducerRole(userId: string, message: string): Promise<string> {
  const conversation = await prisma.aIConversation.findFirst({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      messages: {
        orderBy: { createdAt: 'asc' },
        take: 10,
        select: {
          role: true,
          content: true,
        },
      },
    },
  })

  const history: ProducerChatMessage[] = (conversation?.messages ?? [])
    .filter(
      (messageItem): messageItem is { role: 'user' | 'assistant'; content: string } =>
        messageItem.role === 'user' || messageItem.role === 'assistant',
    )
    .map(messageItem => ({
      role: messageItem.role,
      content: messageItem.content,
    }))

  return producerChat({
    messages: [...history, { role: 'user' as const, content: message }].slice(-12),
  })
}

export async function runProducerRoleResult(userId: string, message: string): Promise<RoleResult> {
  const reply = await runProducerRole(userId, message)
  return {
    reply,
    action: 'NONE',
  }
}
