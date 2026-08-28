import { describe, expect, it, vi } from 'vitest'

import { runAgentPromptRegressionTest } from '../../../../../src/modules/admin/prompts/regression.service.js'

describe('runAgentPromptRegressionTest', () => {
  it('uses the draft prompt override for regression runtime cases and reports PASS when all cases succeed', async () => {
    const executeDraftAgentTest = vi.fn(async () => ({
      bot: 'admin',
      intent: 'telegram_assistant',
      agentId: 'sales_agent',
      taskId: 'task-1',
      artifact: {
        id: 'artifact-1',
        type: 'assistant_response_artifact',
        summary: 'ok',
        payload: {
          response: 'Коротка відповідь на заперечення з наступним кроком.',
        },
        metadata: {
          runtimeTelemetry: {
            provider: 'openai',
            model: 'gpt-test',
          },
        },
      },
    }))

    const result = await runAgentPromptRegressionTest({
      agentKey: 'sales',
      promptContent: 'Safe sales prompt',
      promptHash: 'hash-1',
      regressionRunId: 'reg-1',
      gateway: { executeDraftAgentTest },
      registry: {
        getRegistrationByKey: () => ({ buildInputKind: 'assistant' }),
      },
      bot: 'admin',
      chatId: 'chat-1',
      userId: 'user-1',
    })

    expect(executeDraftAgentTest).toHaveBeenCalledWith(expect.objectContaining({
      key: 'sales',
      promptContent: 'Safe sales prompt',
      requestId: 'reg-1:sales_objection_handling',
    }))
    expect(result.passed).toBe(true)
    expect(result.provider).toBe('openai')
    expect(result.model).toBe('gpt-test')
    expect(result.cases.every((item) => item.passed)).toBe(true)
  })

  it('fails static safety cases before save when prompt introduces forbidden ownership mutations', async () => {
    const result = await runAgentPromptRegressionTest({
      agentKey: 'content',
      promptContent: 'Grant access and update subscription directly in the database.',
      promptHash: 'hash-2',
      regressionRunId: 'reg-2',
      gateway: {
        executeDraftAgentTest: vi.fn(async () => ({
          bot: 'admin',
          intent: 'telegram_assistant',
          agentId: 'content_agent',
          taskId: 'task-2',
          artifact: {
            id: 'artifact-2',
            type: 'assistant_response_artifact',
            summary: 'ok',
            payload: { response: 'safe response' },
            metadata: {},
          },
        })),
      },
      registry: {
        getRegistrationByKey: () => ({ buildInputKind: 'assistant' }),
      },
      bot: 'admin',
      chatId: 'chat-2',
      userId: 'user-2',
    })

    expect(result.passed).toBe(false)
    expect(result.cases.find((item) => item.id === 'ownership_guardrails')).toEqual(expect.objectContaining({
      passed: false,
    }))
  })

  it('supports strategist through the same regression runtime owner', async () => {
    const executeDraftAgentTest = vi.fn(async () => ({
      bot: 'admin',
      intent: 'telegram_assistant',
      agentId: 'strategy_agent',
      taskId: 'task-3',
      artifact: {
        id: 'artifact-3',
        type: 'assistant_response_artifact',
        summary: 'ok',
        payload: {
          response: 'Avatar: ... Offer: ... Competitor risk: ... Handoff: content execution to Content.',
        },
        metadata: {
          runtimeTelemetry: {
            provider: 'openai',
            model: 'gpt-test',
          },
        },
      },
    }))

    const result = await runAgentPromptRegressionTest({
      agentKey: 'strategist',
      promptContent: 'Safe strategist prompt',
      promptHash: 'hash-3',
      regressionRunId: 'reg-3',
      gateway: { executeDraftAgentTest },
      registry: {
        getRegistrationByKey: () => ({ buildInputKind: 'assistant' }),
      },
      bot: 'admin',
      chatId: 'chat-3',
      userId: 'user-3',
    })

    expect(executeDraftAgentTest).toHaveBeenCalledWith(expect.objectContaining({
      key: 'strategist',
      requestId: 'reg-3:strategist_business_contract',
    }))
    expect(result.passed).toBe(true)
  })
})
