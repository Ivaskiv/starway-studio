import { describe, expect, it } from 'vitest'

import type { RuntimeAgentRecord } from '@/features/admin/services/admin.api'

import { buildAgentControlCenterCards } from './agentControlCenterViewModel'

const runtimeAgents: RuntimeAgentRecord[] = [
  {
    key: 'strategist',
    runtimeAgentId: 'strategy_agent',
    promptId: 'strategist-agent-prompt',
    capability: 'strategy',
    objective: 'Business strategy agent.',
    buildInputKind: 'assistant',
    name: 'Strategist',
    icon: '📊',
    category: 'marketing',
    description: 'Runtime strategist agent.',
    status: 'active',
    isSystem: true,
    sourceFiles: ['docs/agents/ai-strategist/business-model-full.md'],
  },
  {
    key: 'funnel',
    runtimeAgentId: 'funnel_agent',
    promptId: 'funnel-agent-prompt',
    capability: 'funnel',
    objective: 'Improve movement through funnel.',
    buildInputKind: 'assistant',
    name: 'Funnel Agent',
    icon: '📄',
    category: 'sales',
    description: 'Runtime funnel agent.',
    status: 'active',
    isSystem: true,
    sourceFiles: ['docs/agents/ai-funnel-assistant/README.md'],
  },
  {
    key: 'mentor',
    runtimeAgentId: 'mentor_agent',
    promptId: 'mentor-agent-prompt',
    capability: 'mentoring',
    objective: 'Mentor reply.',
    buildInputKind: 'assistant',
    name: 'AI Mentor',
    icon: '🧭',
    category: 'ops',
    description: 'Runtime mentor agent.',
    status: 'running',
    isSystem: true,
    sourceFiles: ['docs/agents/ai-mentor/methodology-absystem.md'],
  },
]

describe('agent control center view model', () => {
  it('uses canonical runtime status instead of stale static status for live agents', () => {
    const cards = buildAgentControlCenterCards(runtimeAgents)
    const funnel = cards.find((card) => card.key === 'funnel')

    expect(funnel).toMatchObject({
      runtimeRegistered: true,
      runtimeStatus: 'active',
      capabilityType: 'LIVE_AGENT',
      statusLabel: 'Підключений',
    })
  })

  it('does not mark non-runtime cards as active agents', () => {
    const cards = buildAgentControlCenterCards(runtimeAgents)
    const trendRadar = cards.find((card) => card.key === 'trend_radar')
    const zoomRecap = cards.find((card) => card.key === 'zoom_recap')

    expect(trendRadar).toMatchObject({
      runtimeRegistered: false,
      runtimeStatus: null,
      capabilityType: 'PROMPT_ONLY',
      statusLabel: 'Ще не підключений',
    })
    expect(zoomRecap).toMatchObject({
      runtimeRegistered: false,
      runtimeStatus: null,
      capabilityType: 'KNOWLEDGE_TOOL',
      statusLabel: 'Інструмент',
    })
  })

  it('keeps live agent status independent from presentation config labels', () => {
    const cards = buildAgentControlCenterCards(runtimeAgents)
    const mentor = cards.find((card) => card.key === 'mentor')
    const strategist = cards.find((card) => card.key === 'strategist')

    expect(mentor?.name).toBe('AI-Mentor (ABSystem)')
    expect(mentor).toMatchObject({
      runtimeRegistered: true,
      runtimeStatus: 'running',
      capabilityType: 'LIVE_AGENT',
      statusLabel: 'У роботі',
    })
    expect(strategist).toMatchObject({
      runtimeRegistered: true,
      runtimeStatus: 'active',
      capabilityType: 'LIVE_AGENT',
      promptId: 'strategist-agent-prompt',
      statusLabel: 'Підключений',
    })
  })
})
