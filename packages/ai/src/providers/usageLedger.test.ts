import { describe, expect, it } from 'vitest'

import { InMemoryUsageLedgerStore, UsageLedger } from './usageLedger.js'
import type { AgentDefinition } from '../runtime/agent-runner/types.js'
import type { EngineeringTask } from '../runtime/orchestrator/types.js'

const agentDefinition: AgentDefinition = {
  id: 'summarizer_agent',
  promptId: 'summarizer-prompt',
  artifactType: 'summary_artifact',
}

const task: EngineeringTask = {
  id: 'task-1',
  description: 'Summarize content',
  objective: 'Create a short summary',
  metadata: {
    userId: 'user-123',
  },
}

describe('UsageLedger', () => {
  it('records normalized runtime usage after one execution', async () => {
    const store = new InMemoryUsageLedgerStore()
    const ledger = new UsageLedger(store)

    const entry = await ledger.recordExecution({
      agentDefinition,
      task,
      promptText: 'Summarize the text',
      contextText: 'Long user content goes here.',
      providerResponse: {
        content: 'Short summary',
        metadata: {
          provider: 'openai',
          model: 'gpt-4.1-mini',
          tokenUsage: {
            inputTokens: 120,
            outputTokens: 30,
            totalTokens: 150,
            cachedInputTokens: 12,
          },
        },
      },
      latencyMs: 420,
      timestamp: new Date('2026-07-23T10:00:00.000Z'),
    })

    expect(entry).toMatchObject({
      provider: 'openai',
      model: 'gpt-4.1-mini',
      agent: 'summarizer_agent',
      task: 'task-1',
      promptTokens: 120,
      completionTokens: 30,
      cachedTokens: 12,
      latency: 420,
      user: 'user-123',
      timestamp: '2026-07-23T10:00:00.000Z',
    })
    expect(entry.actualCost).toBeGreaterThanOrEqual(0)
    expect(entry.estimatedCost).toBeGreaterThanOrEqual(0)

    await expect(store.list()).resolves.toEqual([entry])
  })
})
