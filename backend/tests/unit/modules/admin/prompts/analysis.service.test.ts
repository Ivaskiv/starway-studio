import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  buildRuntimePromptFallbackRecord,
} from '../../../../../src/modules/admin/prompts/analysis.service.js'
import { CanonicalGatewayAgentRegistry } from '../../../../../src/modules/ai/agentRegistry.js'
import { resolveGatewayPromptRead } from '../../../../../src/modules/ai/gateway/index.js'
import { prisma } from '../../../../../src/db/client.js'

describe('admin prompt read fallback', () => {
  beforeEach(() => {
    vi.spyOn(prisma.promptVersion, 'findFirst').mockResolvedValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns only readable canonical fallback content for AI-Seller', async () => {
    const prompt = await buildRuntimePromptFallbackRecord('sales-agent-prompt')

    expect(prompt?.content.trim().length).toBeGreaterThan(0)
  })

  it('loads the canonical AI-Seller runtime prompt from filesystem fallback', async () => {
    const prompt = await buildRuntimePromptFallbackRecord('sales-agent-prompt')

    expect(prompt).not.toBeNull()
    expect(prompt).toMatchObject({
      name: 'sales-agent-prompt',
      version: 0,
      isActive: true,
      source: 'filesystem',
    })
    expect(prompt?.content.trim().length).toBeGreaterThan(0)
    expect(prompt?.content).toContain('ai-seller-system-prompt')
  })

  it('returns non-empty canonical prompt content for every editable runtime agent', async () => {
    const registry = new CanonicalGatewayAgentRegistry()
    const editableAgentKeys = new Set(['coach', 'content', 'sales', 'funnel', 'mentor', 'assistant'])

    const promptReads = await Promise.all(
      registry
        .listRegistrations()
        .filter((registration) => editableAgentKeys.has(registration.key))
        .map(async (registration) => ({
          key: registration.key,
          prompt: await resolveGatewayPromptRead(registration.runtime.prompt),
        })),
    )

    for (const promptRead of promptReads) {
      expect(promptRead.prompt, `Missing prompt for agent "${promptRead.key}"`).not.toBeNull()
      expect(
        promptRead.prompt?.content.trim().length,
        `Empty prompt for agent "${promptRead.key}"`,
      ).toBeGreaterThan(0)
    }
  })
})
