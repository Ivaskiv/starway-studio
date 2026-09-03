import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const {
  executeTargetedAgentTest,
  resolveGatewayPromptRead,
  findZoomSessions,
  findNotes,
} = vi.hoisted(() => ({
  executeTargetedAgentTest: vi.fn(),
  resolveGatewayPromptRead: vi.fn(),
  findZoomSessions: vi.fn(),
  findNotes: vi.fn(),
}))

vi.mock('../../../../src/modules/ai/gateway/index.js', () => ({
  getTelegramAgentGateway: () => ({
    executeTargetedAgentTest,
  }),
}))

vi.mock('../../../../src/modules/ai/gateway/runtime.js', () => ({
  resolveGatewayPromptRead,
}))

vi.mock('../../../../src/db/client.js', () => ({
  prisma: {
    zoomSession: {
      findMany: (...args: unknown[]) => findZoomSessions(...args),
    },
    note: {
      findMany: (...args: unknown[]) => findNotes(...args),
    },
    contentPlan: {
      upsert: vi.fn(),
    },
  },
}))

import {
  generateContentPlannerDraft,
  loadPlannerContextByScope,
} from '../../../../src/modules/coach-content/contentPlanner.service.ts'

describe('contentPlanner.service canonical content runtime', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolveGatewayPromptRead.mockResolvedValue({
      promptId: 'content-agent-prompt',
      source: 'db',
      version: 7,
      content: 'active prompt',
    })
    findZoomSessions.mockResolvedValue([
      {
        topic: 'Zoom 1',
        type: 'GROUP',
        scheduledAt: new Date('2026-09-01T08:00:00.000Z'),
        postSessionReport: {
          transcript: 'Говорили про прогрів і CTA.',
        },
      },
    ])
    findNotes.mockResolvedValue([
      { content: 'Нотатка коуча про контент-план.' },
    ])
    executeTargetedAgentTest.mockResolvedValue({
      bot: 'coach',
      intent: 'telegram_assistant',
      agentId: 'content_agent',
      taskId: 'task-content-1',
      artifact: {
        id: 'artifact-content-1',
        type: 'assistant_response_artifact',
        summary: 'ok',
        payload: {
          response: '1. Reels idea\n2. CTA',
          provider: 'anthropic',
          model: 'claude-sonnet-4-5',
          tokensUsed: 42,
        },
        metadata: {
          runtimeTelemetry: {
            provider: 'anthropic',
            model: 'claude-sonnet-4-5',
            latency: 12,
            promptTokens: 21,
            completionTokens: 21,
            cachedTokens: 0,
            estimatedCost: 0.001,
            actualCost: 0.001,
            timestamp: '2026-09-02T10:00:00.000Z',
            user: 'coach-user-1',
          },
        },
      },
    })
  })

  it.each([
    ['REELS_IDEAS'],
    ['FULL_CONTENT'],
  ] as const)('routes %s generation through canonical content agent runtime', async (mode) => {
    const draft = await generateContentPlannerDraft({
      userId: `coach-user-${mode}`,
      mode,
      topic: 'Запуск нового продукту',
    })

    expect(resolveGatewayPromptRead).toHaveBeenCalledWith('content-agent-prompt')
    expect(executeTargetedAgentTest).toHaveBeenCalledWith(expect.objectContaining({
      key: 'content',
      bot: 'coach',
      userId: `coach-user-${mode}`,
      chatId: `coach-user-${mode}`,
      message: expect.stringContaining('Запуск нового продукту'),
    }))
    expect(draft.mode).toBe(mode)
    expect(draft.content).toBe('1. Reels idea\n2. CTA')
    expect(draft.zooms).toHaveLength(1)
    expect(draft.notes).toEqual(['Нотатка коуча про контент-план.'])
  })

  it('keeps deterministic planner context loading outside AI runtime', async () => {
    await loadPlannerContextByScope('coach-user-context-only', 'WEEKLY')

    expect(executeTargetedAgentTest).not.toHaveBeenCalled()
    expect(findZoomSessions).toHaveBeenCalledTimes(1)
    expect(findNotes).toHaveBeenCalledTimes(1)
  })

  it('removes direct anthropic ownership from coach content generation', () => {
    const source = readFileSync(
      path.resolve(
        process.cwd(),
        'backend/src/modules/coach-content/contentPlanner.service.ts',
      ),
      'utf8',
    )

    expect(source).not.toContain('anthropic.messages.create')
  })
})
