import { AgentType as DbAgentType } from '@starway/db/prisma-client'
import { prisma } from '@/db/client.js'
import type { AgentType } from '@/modules/sales-assistant/agents/agents.registry.js'

export class SaasAgentsService {
  async checkTokenMargin(userId: string, estimatedCost: number): Promise<boolean> {
    const startTime = Date.now()
    const hourlySpend = await prisma.aiGenerationHistory.count({
      where: {
        timestamp: { gte: new Date(Date.now() - 3_600_000) },
      },
    })
    const allowed = hourlySpend < 100
    await this.logAgentExecution(
      DbAgentType.TOKEN_MARGINAL,
      { userId, estimatedCost, hourlySpend },
      { allowed },
      Date.now() - startTime,
      allowed ? 'SUCCESS' : 'WARN'
    )
    return allowed
  }

  async routeToModel(
    contentType: string,
    availableProviders: Array<'claude' | 'gpt' | 'gemini'>
  ): Promise<'claude' | 'gpt' | 'gemini'> {
    const startTime = Date.now()
    const routing: Record<string, 'claude' | 'gpt' | 'gemini'> = {
      stories: 'gemini',
      blog: 'claude',
      warmup: 'gpt',
      reels: 'gpt',
      webinar: 'gpt',
    }
    let preferred = routing[contentType] ?? 'claude'
    if (!availableProviders.includes(preferred)) {
      preferred = availableProviders[0] ?? 'gemini'
    }
    await this.logAgentExecution(
      DbAgentType.ROUTER_DIRIGENT,
      { contentType, availableProviders },
      { selected: preferred },
      Date.now() - startTime,
      'SUCCESS'
    )
    return preferred
  }

  async getActivePromptVersion(profileKey: string): Promise<number> {
    const profile = await prisma.aiBehaviorProfile.findUnique({ where: { key: profileKey } })
    return profile?.version ?? 1
  }

  async checkCostControl(userId: string): Promise<boolean> {
    const startTime = Date.now()
    const recentRequests = await prisma.aiGenerationHistory.count({
      where: {
        timestamp: { gte: new Date(Date.now() - 10_000) },
      },
    })
    const blocked = recentRequests > 5
    await this.logAgentExecution(
      DbAgentType.COST_CONTROL,
      { userId, recentRequests },
      { blocked },
      Date.now() - startTime,
      blocked ? 'FAILED' : 'SUCCESS'
    )
    return !blocked
  }

  async auditQuality(text: string, profileKey: string): Promise<{ passed: boolean; violations: string[] }> {
    const startTime = Date.now()
    const forbidden = await prisma.lexicon.findMany({
      where: { profileKey, type: 'FORBIDDEN' },
    })
    const violations = forbidden
      .filter((item) => text.toLowerCase().includes(item.word.toLowerCase()))
      .map((item) => item.word)

    const antiPatterns = [
      /підсумку|отже|таким чином/i,
      /унікальна можливість|трансформація|успішний успіх/i,
      /^[•\d\.]/m,
    ]
    for (let index = 0; index < antiPatterns.length; index += 1) {
      if (antiPatterns[index].test(text)) violations.push(`anti-pattern-${index}`)
    }

    const passed = violations.length === 0
    await this.logAgentExecution(
      DbAgentType.QUALITY_AUDITOR,
      { profileKey, textLength: text.length },
      { passed, violations },
      Date.now() - startTime,
      passed ? 'SUCCESS' : 'WARN'
    )
    return { passed, violations }
  }

  async saveHistory(input: {
    agent: AgentType
    audiencePain: string
    targetAction: string
    product?: string
    output: string
    userFeedback?: string
    modelUsed: string
    protocol: string
  }): Promise<void> {
    await prisma.aiGenerationHistory.create({
      data: {
        agent: input.agent,
        audiencePain: input.audiencePain,
        targetAction: input.targetAction,
        product: input.product,
        output: input.output,
        userFeedback: input.userFeedback,
        modelUsed: input.modelUsed,
        protocol: input.protocol,
      },
    })
  }

  private async logAgentExecution(
    agentType: DbAgentType,
    inputData: unknown,
    outputData: unknown,
    executionTime: number,
    status: string
  ): Promise<void> {
    await prisma.agentExecutionLog.create({
      data: { agentType, inputData: inputData as never, outputData: outputData as never, executionTime, status },
    })
  }
}

export const saasAgentsService = new SaasAgentsService()
