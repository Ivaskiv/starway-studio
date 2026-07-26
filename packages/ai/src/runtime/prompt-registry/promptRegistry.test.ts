import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { FileSystemPromptLoader } from './promptLoader.js'
import { InMemoryPromptCache } from './promptCache.js'
import { PromptRegistry } from './promptRegistry.js'
import {
  PromptDeprecatedError,
  PromptMetadataValidationError,
  PromptNotFoundError,
  PromptOwnershipConflictError,
} from './errors.js'
import type { AgentDefinition, ResolvedPrompt } from '../agent-runner/types.js'
import type { PromptSourceDefinition } from './types.js'
import type { EngineeringTask, ExecutionStateSnapshot, IRuntimeLogger } from '../orchestrator/types.js'

const task: EngineeringTask = {
  id: 'task-1',
  description: 'Resolve runtime prompt',
  objective: 'Load canonical prompt',
}

const state: ExecutionStateSnapshot = {
  task,
  status: 'running',
  currentAgentId: 'task_planning',
  completedAgentIds: [],
  artifacts: [],
  notes: [],
  lastUpdatedAt: new Date(0).toISOString(),
}

const taskPlanningDefinition: AgentDefinition = {
  id: 'task_planning',
  promptId: 'task-planning-prompt',
  artifactType: 'planning_artifact',
}

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

async function createPromptFile(name: string, content: string): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'prompt-registry-'))
  const filePath = path.join(directory, name)
  await writeFile(filePath, content, 'utf8')
  return filePath
}

async function makeRegistry(
  sources: PromptSourceDefinition[],
  loaderOverrides: Partial<FileSystemPromptLoader> = {},
): Promise<PromptRegistry> {
  const loader = new FileSystemPromptLoader()
  Object.assign(loader, loaderOverrides)

  return new PromptRegistry({
    sources,
    loader,
    cache: new InMemoryPromptCache(),
    logger,
  })
}

describe('PromptRegistry', () => {
  it('resolves a prompt for an agent definition and caches the loaded result', async () => {
    const filePath = await createPromptFile('task-planning.md', '# prompt\ncontent')
    const loadSpy = vi.fn(async ({ source }: { source: PromptSourceDefinition }) => {
      const loader = new FileSystemPromptLoader()
      return loader.load({ source })
    })

    const registry = new PromptRegistry({
      sources: [
        {
          id: 'task-planning-prompt',
          version: '1.0.0',
          filePath,
          ownerAgentIds: ['task_planning'],
          canonical: true,
          defaultVersion: true,
        },
      ],
      loader: { load: loadSpy },
      cache: new InMemoryPromptCache(),
      logger,
    })

    const first = await registry.resolvePrompt({
      agentDefinition: taskPlanningDefinition,
      task,
      state,
    })
    const second = await registry.resolvePrompt({
      agentDefinition: taskPlanningDefinition,
      task,
      state,
    })

    expect(first).toEqual<ResolvedPrompt>({
      id: 'task-planning-prompt',
      version: '1.0.0',
      content: '# prompt\ncontent',
      metadata: { filePath },
    })
    expect(second).toEqual(first)
    expect(loadSpy).toHaveBeenCalledTimes(1)
  })

  it('resolves a prompt by prompt id and explicit version', async () => {
    const v1Path = await createPromptFile('implementation-v1.md', 'v1')
    const v2Path = await createPromptFile('implementation-v2.md', 'v2')

    const registry = await makeRegistry([
      {
        id: 'implementation-prompt',
        version: '1.0.0',
        filePath: v1Path,
        ownerAgentIds: ['implementation'],
        canonical: true,
      },
      {
        id: 'implementation-prompt',
        version: '1.1.0',
        filePath: v2Path,
        ownerAgentIds: ['implementation'],
        canonical: true,
        defaultVersion: true,
      },
    ])

    const prompt = await registry.resolvePromptById({
      promptId: 'implementation-prompt',
      version: '1.0.0',
    })

    expect(prompt.version).toBe('1.0.0')
    expect(prompt.content).toBe('v1')
  })

  it('returns prompt info for a prompt id', async () => {
    const filePath = await createPromptFile('review.md', 'review')
    const registry = await makeRegistry([
      {
        id: 'code-review-prompt',
        version: '1.0.0',
        filePath,
        ownerAgentIds: ['code_review'],
        canonical: true,
        defaultVersion: true,
      },
    ])

    const info = await registry.getPromptInfo('code-review-prompt')

    expect(info).toEqual({
      id: 'code-review-prompt',
      availableVersions: ['1.0.0'],
      defaultVersion: '1.0.0',
      ownerAgentIds: ['code_review'],
      canonical: true,
    })
  })

  it('fails when prompt metadata is incomplete', async () => {
    expect(
      () =>
        new PromptRegistry({
          sources: [
            {
              id: 'task-planning-prompt',
              version: '',
              filePath: '/tmp/missing.md',
              ownerAgentIds: ['task_planning'],
              canonical: true,
            },
          ],
          loader: { load: vi.fn() },
          cache: new InMemoryPromptCache(),
          logger,
        }),
    ).toThrow(PromptMetadataValidationError)
  })

  it('fails when a requested prompt is missing', async () => {
    const registry = await makeRegistry([])

    await expect(
      registry.resolvePromptById({ promptId: 'missing-prompt' }),
    ).rejects.toBeInstanceOf(PromptNotFoundError)
  })

  it('fails when multiple canonical prompts own the same agent role', async () => {
    const planningPath = await createPromptFile('planning.md', 'plan')
    const masterPath = await createPromptFile('master.md', 'master')

    const registry = await makeRegistry([
      {
        id: 'task-planning-prompt',
        version: '1.0.0',
        filePath: planningPath,
        ownerAgentIds: ['task_planning'],
        canonical: true,
        defaultVersion: true,
      },
      {
        id: 'duplicate-planning-prompt',
        version: '1.0.0',
        filePath: masterPath,
        ownerAgentIds: ['task_planning'],
        canonical: true,
        defaultVersion: true,
      },
    ])

    await expect(
      registry.resolvePrompt({
        agentDefinition: taskPlanningDefinition,
        task,
        state,
      }),
    ).rejects.toBeInstanceOf(PromptOwnershipConflictError)
  })

  it('fails when the selected prompt version is deprecated', async () => {
    const deprecatedPath = await createPromptFile('deprecated.md', 'old')
    const currentPath = await createPromptFile('current.md', 'current')

    const registry = await makeRegistry([
      {
        id: 'legacy-review-prompt',
        version: '0.9.0',
        filePath: deprecatedPath,
        ownerAgentIds: ['code_review'],
        canonical: true,
        deprecated: true,
      },
      {
        id: 'legacy-review-prompt',
        version: '1.0.0',
        filePath: currentPath,
        ownerAgentIds: ['code_review'],
        canonical: true,
        defaultVersion: true,
      },
    ])

    await expect(
      registry.resolvePromptById({ promptId: 'legacy-review-prompt', version: '0.9.0' }),
    ).rejects.toBeInstanceOf(PromptDeprecatedError)
  })
})
