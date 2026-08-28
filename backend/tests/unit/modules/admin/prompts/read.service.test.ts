import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { prisma } from '../../../../../src/db/client.js'
import { readAdminAgent, readAdminAgentPrompt } from '../../../../../src/modules/admin/prompts/read.service.js'
import { resolveGatewayPromptRead } from '../../../../../src/modules/ai/gateway/index.js'

describe('admin agent prompt read service', () => {
  beforeEach(() => {
    vi.spyOn(prisma.promptVersion, 'findFirst').mockResolvedValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns non-empty canonical content for live and prompt-only cards', async () => {
    const results = await Promise.all([
      readAdminAgentPrompt('strategist'),
      readAdminAgentPrompt('sales'),
      readAdminAgentPrompt('content'),
      readAdminAgentPrompt('assistant'),
      readAdminAgentPrompt('funnel'),
      readAdminAgentPrompt('mentor'),
      readAdminAgentPrompt('marketing_analyst'),
      readAdminAgentPrompt('trend_radar'),
      readAdminAgentPrompt('coach'),
    ])

    for (const result of results) {
      expect(result).not.toBeNull()
      expect(result?.editablePrompt).toBe(true)
      expect(result?.promptContent?.trim().length ?? 0).toBeGreaterThan(0)
      expect(result?.content?.trim().length ?? 0).toBeGreaterThan(0)
      expect(result?.source).toBe('filesystem')
      expect(result?.version).toBe(0)
    }
  })

  it('composes multi-file runtime prompts in the existing sourceFiles order when no active DB version exists', async () => {
    const strategist = await readAdminAgentPrompt('strategist')
    const sales = await readAdminAgentPrompt('sales')
    const content = await readAdminAgentPrompt('content')
    const assistant = await readAdminAgentPrompt('assistant')
    const mentor = await readAdminAgentPrompt('mentor')
    const coach = await readAdminAgentPrompt('coach')

    expect(strategist?.content).toContain('# 0006 Business Model')
    expect(strategist?.content).toContain('# Product Ownership Map')

    expect(sales?.content).toContain('AI Seller System Prompt')
    expect(sales?.content).toContain('PATCH: ai-seller-rules')

    expect(content?.content).toContain('SKILL: Creative Ads')
    expect(content?.content).toContain('SYSTEM PROMPT OVERRIDE')

    expect(assistant?.content).toContain('Surgical Guardrails Update')
    expect(assistant?.content).toContain('Analysis: Strict Guardrails')

    expect(mentor?.content).toContain('TOV Mentor Examples')
    expect(mentor?.content).toContain('COMEBACK FLOWS')

    expect(coach?.content).toContain('OPERATING RULES')
    expect(coach?.content).toContain('SKILL: СВОЯ')
  })

  it('returns explicit non-editable state for knowledge-tool cards', async () => {
    const result = await readAdminAgentPrompt('zoom_recap')

    expect(result).not.toBeNull()
    expect(result).toMatchObject({
      agentKey: 'zoom_recap',
      capabilityType: 'KNOWLEDGE_TOOL',
      promptId: 'zoom-recap-prompt',
      editablePrompt: false,
      promptContent: null,
      content: null,
      source: null,
      version: null,
    })
    expect(result?.reason).toContain('knowledge/tool source')
  })

  it('returns prompt-only metadata for non-runtime cards instead of requiring runtime registration', async () => {
    const marketingAnalyst = await readAdminAgentPrompt('marketing_analyst')
    const trendRadar = await readAdminAgentPrompt('trend_radar')

    expect(marketingAnalyst).toMatchObject({
      agentKey: 'marketing_analyst',
      capabilityType: 'PROMPT_ONLY',
      promptId: 'marketing-analyst-prompt',
      editablePrompt: true,
    })
    expect(trendRadar).toMatchObject({
      agentKey: 'trend_radar',
      capabilityType: 'PROMPT_ONLY',
      promptId: 'trend-radar-prompt',
      editablePrompt: true,
    })
  })

  it('resolves strategist through the canonical live-agent read path and keeps marketing_analyst as a prompt-only legacy alias', async () => {
    const strategist = await readAdminAgent('strategist')
    const marketingAnalyst = await readAdminAgent('marketing_analyst')

    expect(strategist).toMatchObject({
      agentKey: 'strategist',
      name: 'Strategist',
      runtimeRegistered: true,
      runtimeStatus: 'active',
      capabilityType: 'LIVE_AGENT',
      promptId: 'strategist-agent-prompt',
      editablePrompt: true,
      promptContent: expect.any(String),
      source: 'filesystem',
      version: 0,
    })

    expect(marketingAnalyst).toMatchObject({
      agentKey: 'marketing_analyst',
      runtimeRegistered: false,
      runtimeStatus: null,
      capabilityType: 'PROMPT_ONLY',
      promptId: 'marketing-analyst-prompt',
    })
  })

  it('loads strategist prompt content from filesystem fallback when no active DB version exists', async () => {
    const prompt = await resolveGatewayPromptRead('strategist-agent-prompt')

    expect(prompt).toMatchObject({
      promptId: 'strategist-agent-prompt',
      source: 'filesystem',
      version: 0,
    })
    expect(prompt?.content.trim().length ?? 0).toBeGreaterThan(0)
    expect(prompt?.content).toContain('# 0006 Business Model')
  })

  it('builds the canonical admin agent read contract for live and prompt-only cards', async () => {
    const sales = await readAdminAgent('sales')
    const strategist = await readAdminAgent('strategist')

    expect(sales).toMatchObject({
      agentKey: 'sales',
      name: 'Sales Agent',
      runtimeRegistered: true,
      runtimeStatus: 'active',
      capabilityType: 'LIVE_AGENT',
      promptId: 'sales-agent-prompt',
      analysisState: 'idle',
      editablePrompt: true,
      promptContent: expect.any(String),
      source: 'filesystem',
      version: 0,
    })

    expect(strategist).toMatchObject({
      agentKey: 'strategist',
      runtimeRegistered: true,
      runtimeStatus: 'active',
      capabilityType: 'LIVE_AGENT',
      promptId: 'strategist-agent-prompt',
      analysisState: 'idle',
      editablePrompt: true,
      promptContent: expect.any(String),
      source: 'filesystem',
      version: 0,
    })
  })
})
