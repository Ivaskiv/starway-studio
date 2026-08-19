import { describe, expect, it, vi } from 'vitest'

import { TelegramAgentGateway, type TelegramAgentGatewayRequest } from '../index.ts'

describe('TelegramAgentGateway', () => {
  it('routes telegram intelligence requests through the classification runtime intent', async () => {
    const runtimeExecutor = {
      execute: vi.fn(async ({ agentDefinition, task }) => ({
        id: 'artifact-1',
        type: 'classification_artifact',
        summary: 'classified',
        payload: {
          category: 'pricing',
          confidence: 0.91,
          provider: 'openai',
          model: 'test-model',
          tokensUsed: 18,
        },
        metadata: {
          ownerAgentId: agentDefinition.id,
          taskId: task.id,
        },
      })),
    }

    const gateway = new TelegramAgentGateway({ runtimeExecutor })
    const request: TelegramAgentGatewayRequest = {
      bot: 'user',
      intent: 'telegram_intelligence',
      chatId: 'chat-1',
      userId: 'user-1',
      message: 'Скільки коштує ФОКУС?',
    }

    const result = await gateway.execute(request)

    expect(result.bot).toBe('user')
    expect(result.intent).toBe('telegram_intelligence')
    expect(result.agentId).toBe('classification_agent')
    expect(result.artifact.payload).toMatchObject({
      category: 'pricing',
      provider: 'openai',
      model: 'test-model',
    })

    expect(runtimeExecutor.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        agentDefinition: expect.objectContaining({
          id: 'classification_agent',
        }),
        task: expect.objectContaining({
          metadata: expect.objectContaining({
            bot: 'user',
            chatId: 'chat-1',
            userId: 'user-1',
            input: expect.objectContaining({
              text: 'Скільки коштує ФОКУС?',
              categories: expect.arrayContaining(['pricing', 'about_focus', 'technical_issue']),
            }),
          }),
        }),
      }),
    )
  })

  it('routes telegram echo requests through the echo runtime intent', async () => {
    const runtimeExecutor = {
      execute: vi.fn(async ({ agentDefinition, task }) => ({
        id: 'artifact-echo-1',
        type: 'echo_artifact',
        summary: 'echoed',
        payload: {
          message: 'Привіт',
        },
        metadata: {
          ownerAgentId: agentDefinition.id,
          taskId: task.id,
          runtimeTelemetry: {
            provider: 'openai',
            model: 'gpt-4.1-mini',
            latency: 123,
            promptTokens: 8,
            completionTokens: 8,
            cachedTokens: 0,
            estimatedCost: 0.000016,
            actualCost: 0.000016,
            timestamp: '2026-07-23T10:00:00.000Z',
            user: 'user-1',
          },
        },
      })),
    }

    const gateway = new TelegramAgentGateway({ runtimeExecutor })
    const request: TelegramAgentGatewayRequest = {
      bot: 'user',
      intent: 'telegram_echo',
      chatId: 'chat-1',
      userId: 'user-1',
      message: 'Привіт',
    }

    const result = await gateway.execute(request)

    expect(result.intent).toBe('telegram_echo')
    expect(result.agentId).toBe('echo_agent')
    expect(result.artifact.payload).toMatchObject({
      message: 'Привіт',
    })
    expect(runtimeExecutor.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        agentDefinition: expect.objectContaining({
          id: 'echo_agent',
        }),
        task: expect.objectContaining({
          metadata: expect.objectContaining({
            input: expect.objectContaining({
              message: 'Привіт',
            }),
          }),
        }),
      }),
    )
  })

  it('routes telegram assistant requests through the mentor runtime intent', async () => {
    const runtimeExecutor = {
      execute: vi.fn(async ({ agentDefinition, task }) => ({
        id: 'artifact-assistant-1',
        type: 'assistant_response_artifact',
        summary: 'assistant-replied',
        payload: {
          response: 'Твоя підписка активна.',
          suggestions: [],
          followUp: 'Хочеш, я коротко покажу наступний крок?',
          provider: 'openai',
          model: 'test-model',
          tokensUsed: 42,
        },
        metadata: {
          ownerAgentId: agentDefinition.id,
          taskId: task.id,
        },
      })),
    }

    const gateway = new TelegramAgentGateway({ runtimeExecutor })
    const request: TelegramAgentGatewayRequest = {
      bot: 'user',
      intent: 'telegram_assistant',
      chatId: 'chat-1',
      userId: 'user-1',
      message: 'Яка в мене підписка?',
    }

    const result = await gateway.execute(request)

    expect(result.intent).toBe('telegram_assistant')
    expect(result.agentId).toBe('mentor_agent')
    expect(result.artifact.payload).toMatchObject({
      response: 'Твоя підписка активна.',
      provider: 'openai',
      model: 'test-model',
    })
    expect(runtimeExecutor.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        agentDefinition: expect.objectContaining({
          id: 'mentor_agent',
        }),
        task: expect.objectContaining({
          metadata: expect.objectContaining({
            bot: 'user',
            chatId: 'chat-1',
            userId: 'user-1',
            input: expect.objectContaining({
              userMessage: 'Яка в мене підписка?',
              userContext: expect.any(Object),
              decision: expect.objectContaining({
                primaryIntent: 'subscription_status',
                recommendedAction: 'recommend_subscription',
              }),
              knowledgeBase: expect.any(Object),
            }),
          }),
        }),
      }),
    )
  })

  it('delegates sales requests through the canonical specialist registry', async () => {
    const runtimeExecutor = {
      execute: vi.fn(async ({ agentDefinition, task }) => ({
        id: 'artifact-sales-1',
        type: 'assistant_response_artifact',
        summary: 'sales-replied',
        payload: {
          response: 'Почни з короткого CTA для діалогу з лідами.',
          suggestions: [],
          followUp: '',
          provider: 'openai',
          model: 'test-model',
          tokensUsed: 21,
        },
        metadata: {
          ownerAgentId: agentDefinition.id,
          taskId: task.id,
        },
      })),
    }

    const gateway = new TelegramAgentGateway({ runtimeExecutor })
    const request: TelegramAgentGatewayRequest = {
      bot: 'user',
      intent: 'telegram_assistant',
      chatId: 'chat-1',
      userId: 'user-1',
      message: 'Допоможи з CTA для продажу і запереченнями клієнта',
      messageType: 'UNKNOWN',
    }

    const result = await gateway.execute(request)

    expect(result.agentId).toBe('sales_agent')
    expect(result.artifact.metadata).toMatchObject({
      orchestration: expect.objectContaining({
        selectedAgent: 'sales',
        executedAgent: 'sales',
        delegated: true,
        fallbackActivated: false,
      }),
    })
    expect(runtimeExecutor.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        agentDefinition: expect.objectContaining({
          id: 'sales_agent',
        }),
        task: expect.objectContaining({
          metadata: expect.objectContaining({
            input: expect.objectContaining({
              decision: expect.objectContaining({
                primaryIntent: 'sales_guidance',
                recommendedAction: 'none',
              }),
              orchestration: expect.objectContaining({
                selectedAgent: 'sales',
                delegated: true,
                capability: 'sales',
              }),
            }),
          }),
        }),
      }),
    )
  })

  it('falls back to the assistant agent when delegated execution fails', async () => {
    const runtimeExecutor = {
      execute: vi
        .fn()
        .mockRejectedValueOnce(new Error('provider unavailable'))
        .mockImplementationOnce(async ({ agentDefinition, task }) => ({
          id: 'artifact-fallback-1',
          type: 'assistant_response_artifact',
          summary: 'assistant-fallback',
          payload: {
            response: 'Повертаю тебе до основного асистента без втрати контексту.',
            suggestions: [],
            followUp: '',
            provider: 'openai',
            model: 'test-model',
            tokensUsed: 9,
          },
          metadata: {
            ownerAgentId: agentDefinition.id,
            taskId: task.id,
          },
        })),
    }

    const gateway = new TelegramAgentGateway({ runtimeExecutor })
    const request: TelegramAgentGatewayRequest = {
      bot: 'user',
      intent: 'telegram_assistant',
      chatId: 'chat-1',
      userId: 'user-1',
      message: 'Допоможи з CTA для продажу',
      messageType: 'UNKNOWN',
    }

    const result = await gateway.execute(request)

    expect(result.agentId).toBe('assistant_agent')
    expect(runtimeExecutor.execute).toHaveBeenCalledTimes(2)
    expect(runtimeExecutor.execute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        agentDefinition: expect.objectContaining({
          id: 'sales_agent',
        }),
      }),
    )
    expect(runtimeExecutor.execute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        agentDefinition: expect.objectContaining({
          id: 'assistant_agent',
        }),
      }),
    )
    expect(result.artifact.metadata).toMatchObject({
      decision: expect.objectContaining({
        primaryIntent: 'sales_guidance',
        recommendedAction: 'none',
      }),
      orchestration: expect.objectContaining({
        selectedAgent: 'sales',
        executedAgent: 'assistant',
        delegated: true,
        fallbackActivated: true,
        fallbackAgent: 'assistant',
      }),
    })
  })

  it('runs a targeted agent test through the canonical registration key without routing selection', async () => {
    const runtimeExecutor = {
      execute: vi.fn(async ({ agentDefinition, task }) => ({
        id: 'artifact-targeted-1',
        type: 'assistant_response_artifact',
        summary: 'targeted-replied',
        payload: {
          response: 'Ось targeted відповідь.',
          suggestions: ['Уточни ціль'],
          followUp: 'Потрібен ще один приклад?',
          provider: 'openai',
          model: 'test-model',
          tokensUsed: 17,
        },
        metadata: {
          ownerAgentId: agentDefinition.id,
          taskId: task.id,
        },
      })),
    }

    const gateway = new TelegramAgentGateway({ runtimeExecutor })

    const result = await gateway.executeTargetedAgentTest({
      key: 'sales',
      bot: 'admin',
      chatId: 'admin-chat-1',
      userId: 'admin-user-1',
      message: 'Дай один конкретний CTA для продажу.',
    })

    expect(result.intent).toBe('telegram_assistant')
    expect(result.agentId).toBe('sales_agent')
    expect(result.artifact.payload).toMatchObject({
      response: 'Ось targeted відповідь.',
      provider: 'openai',
      model: 'test-model',
    })
    expect(runtimeExecutor.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        agentDefinition: expect.objectContaining({
          id: 'sales_agent',
        }),
        task: expect.objectContaining({
          metadata: expect.objectContaining({
            bot: 'admin',
            chatId: 'admin-chat-1',
            userId: 'admin-user-1',
            input: expect.objectContaining({
              userMessage: 'Дай один конкретний CTA для продажу.',
              orchestration: expect.objectContaining({
                selectedAgent: 'sales',
                delegated: false,
                capability: 'sales',
              }),
            }),
          }),
        }),
      }),
    )
  })
})
