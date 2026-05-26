import { prisma } from '@/db/client.js'
import type { AgentType, SharedContext } from '@/modules/sales-assistant/agents/agents.registry.js'

export class SelfLearningService {
  async saveSuccessfulGeneration(
    agent: AgentType,
    context: SharedContext,
    output: string,
    modelUsed: string,
    protocol = 'SYSTEM'
  ): Promise<void> {
    await prisma.aiGenerationHistory.create({
      data: {
        agent,
        audiencePain: context.audiencePain,
        targetAction: context.targetAction,
        product: context.product,
        output,
        userFeedback: 'positive',
        modelUsed,
        protocol,
      },
    })
  }

  async generateFromHistory(agent: AgentType, context: SharedContext): Promise<string> {
    const row = await prisma.aiGenerationHistory.findFirst({
      where: { agent },
      orderBy: { timestamp: 'desc' },
      select: { output: true },
    })

    if (row?.output) {
      return row.output
    }

    return [
      `AGENT: ${agent}`,
      `Біль аудиторії: ${context.audiencePain}`,
      `Цільова дія: ${context.targetAction}`,
      `Продукт: ${context.product ?? ''}`,
      'Fallback template: сформуй 3 тези, 2 заперечення, 1 CTA без маркетингової вати.',
    ].join('\n')
  }
}

export const selfLearningService = new SelfLearningService()
