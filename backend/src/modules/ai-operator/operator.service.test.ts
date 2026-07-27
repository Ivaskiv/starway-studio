import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type FsModule = typeof import('node:fs')

const providerCalls: Array<{ systemPrompt: string; userPrompt: string }> = []

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  zoomSessionAttendee: {
    count: vi.fn(),
  },
}

function setupBaseMocks() {
  vi.doMock('@/db/client.js', () => ({
    prisma: prismaMock,
  }))

  vi.doMock('@/lib/telegram.js', () => ({
    coachBot: {
      telegram: {
        sendMessage: vi.fn(),
      },
    },
  }))

  vi.doMock('@/modules/sales-assistant/sales-assistant.providers.js', () => ({
    callProviderSafe: vi.fn(async (_provider: string, systemPrompt: string, userPrompt: string) => {
      providerCalls.push({ systemPrompt, userPrompt })
      return { content: 'Generated post from AI' }
    }),
  }))

  vi.doMock('@/services/scheduler/common.js', () => ({
    getSettingsObject: vi.fn((input: unknown) => {
      if (input && typeof input === 'object' && !Array.isArray(input)) {
        return input as Record<string, unknown>
      }
      return {}
    }),
  }))

  vi.doMock('@starway/ai/providers/routing', () => ({
    resolveModelStrategyTier: vi.fn(() => 'raw_truth'),
  }))
}

async function importService(options?: {
  fsFactory?: (actual: FsModule) => Partial<FsModule>
}) {
  vi.resetModules()
  vi.unmock('node:fs')
  setupBaseMocks()

  if (options?.fsFactory) {
    vi.doMock('node:fs', async () => {
      const actual = await vi.importActual<FsModule>('node:fs')
      return {
        ...actual,
        ...options.fsFactory?.(actual),
      }
    })
  }

  return import('./operator.service.js')
}

describe('ai operator document loading', () => {
  const originalCwd = process.cwd()

  beforeEach(() => {
    providerCalls.length = 0
    vi.clearAllMocks()
    prismaMock.user.findUnique.mockResolvedValue({ settings: {} })
    prismaMock.user.update.mockResolvedValue({})
    prismaMock.user.findMany.mockResolvedValue([])
    prismaMock.zoomSessionAttendee.count.mockResolvedValue(0)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    vi.resetModules()
    vi.restoreAllMocks()
    vi.unmock('node:fs')
  })

  it('does not read AI documents during module import when cwd is backend', async () => {
    process.chdir(path.resolve(originalCwd, 'backend'))

    const readPaths: string[] = []
    await importService({
      fsFactory: (actual) => ({
        readFileSync: vi.fn(((filePath: FsModule['readFileSync'] extends (...args: infer A) => any ? A[0] : never, ...rest: unknown[]) => {
          readPaths.push(String(filePath))
          return (actual.readFileSync as (...args: unknown[]) => unknown)(filePath, ...(rest as []))
        }) as FsModule['readFileSync']),
      }),
    })

    expect(readPaths.filter((value) => value.includes('OPERATING-RULES.md'))).toEqual([])
  })

  it('does not fail on import when AI documents are unavailable', async () => {
    process.chdir(path.resolve(originalCwd, 'backend'))

    await expect(
      importService({
        fsFactory: () => ({
          existsSync: vi.fn(() => false),
        }),
      }),
    ).resolves.toBeTruthy()
  })

  it('resolves the canonical docs root from the repo root', async () => {
    const repoRoot = originalCwd
    const docsRoot = path.join(repoRoot, 'docs')
    const markerPath = path.join(docsRoot, 'agents', 'shared', 'OPERATING-RULES.md')
    const checkedPaths: string[] = []

    const service = await importService({
      fsFactory: () => ({
        existsSync: vi.fn((candidate: Parameters<FsModule['existsSync']>[0]) => {
          const value = String(candidate)
          checkedPaths.push(value)
          return (
            value === path.join(repoRoot, 'pnpm-workspace.yaml') ||
            value === docsRoot ||
            value === markerPath
          )
        }),
      }),
    })

    service.__testOnly.resetAiOperatorDocsCache()

    expect(service.__testOnly.resolveDocsRoot()).toBe(docsRoot)
    expect(checkedPaths).not.toContain(path.join(repoRoot, 'backend', 'docs', 'agents', 'shared', 'OPERATING-RULES.md'))
  })

  it('returns a controlled operator step and warning when AI docs are missing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const service = await importService({
      fsFactory: (actual) => ({
        existsSync: vi.fn((candidate: Parameters<FsModule['existsSync']>[0]) => {
          const value = String(candidate)
          if (value.includes(path.join('docs', 'agents', 'shared', 'OPERATING-RULES.md'))) {
            return false
          }
          if (value.endsWith(path.sep + 'pnpm-workspace.yaml') || value === 'pnpm-workspace.yaml') {
            return actual.existsSync(candidate)
          }
          return actual.existsSync(candidate)
        }),
      }),
    })

    service.__testOnly.resetAiOperatorDocsCache()

    const step = await service.runCoachStartDay('coach-user-id')

    expect(step.text).toContain('AI operator тимчасово недоступний')
    expect(step.buttons).toEqual([])
    expect(warnSpy).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith(
      '[ai-operator:document_unavailable]',
      expect.objectContaining({
        feature: 'ai-operator',
        document: 'OPERATING-RULES.md',
        resolvedPath: expect.stringContaining(path.join('docs', 'agents', 'shared', 'OPERATING-RULES.md')),
        code: 'AI_DOCUMENT_NOT_FOUND',
      }),
    )
  })

  it('ignores backend cwd and still resolves docs from repo root', async () => {
    process.chdir(path.resolve(originalCwd, 'backend'))
    const repoRoot = originalCwd
    const docsRoot = path.join(repoRoot, 'docs')
    const markerPath = path.join(docsRoot, 'agents', 'shared', 'OPERATING-RULES.md')

    const service = await importService({
      fsFactory: () => ({
        existsSync: vi.fn((candidate: Parameters<FsModule['existsSync']>[0]) => {
          const value = String(candidate)
          return (
            value === path.join(repoRoot, 'pnpm-workspace.yaml') ||
            value === docsRoot ||
            value === markerPath
          )
        }),
      }),
    })

    service.__testOnly.resetAiOperatorDocsCache()

    expect(service.__testOnly.resolveDocsRoot()).toBe(docsRoot)
  })

  it('loads OPERATING-RULES from repo-root docs during explicit AI execution', async () => {
    process.chdir(path.resolve(originalCwd, 'backend'))
    const repoRoot = originalCwd
    const docsRoot = path.join(repoRoot, 'docs')
    const operatingRulesPath = path.join(docsRoot, 'agents', 'shared', 'OPERATING-RULES.md')
    const contentPromptPath = path.join(docsRoot, 'agents', 'ai-content', 'dna-content-generator-offer.md')
    const assistantPromptPath = path.join(docsRoot, 'agents', 'ai-assistant-bot', 'README.md')
    const mentorMethodPath = path.join(docsRoot, 'agents', 'ai-mentor', 'methodology-absystem.md')
    const focusPromptPath = path.join(docsRoot, 'agents', 'ai-mentor', 'focus-course-materials.md')

    const service = await importService({
      fsFactory: () => ({
        existsSync: vi.fn((candidate: Parameters<FsModule['existsSync']>[0]) => {
          const value = String(candidate)
          return (
            value === path.join(repoRoot, 'pnpm-workspace.yaml') ||
            value === docsRoot ||
            value === operatingRulesPath
          )
        }),
        readFileSync: vi.fn((candidate: Parameters<FsModule['readFileSync']>[0]) => {
          const value = String(candidate)
          if (value === operatingRulesPath) return 'OPERATING RULES CONTENT'
          if (value === contentPromptPath) return 'CONTENT PROMPT'
          if (value === assistantPromptPath) return 'ASSISTANT PROMPT'
          if (value === mentorMethodPath) return 'MENTOR METHOD'
          if (value === focusPromptPath) return 'FOCUS PROMPT'
          throw new Error(`unexpected read: ${value}`)
        }) as FsModule['readFileSync'],
      }),
    })

    service.__testOnly.resetAiOperatorDocsCache()

    const step = await service.runCoachStartDay('coach-user-id')

    expect(step.text).toContain('Generated post from AI')
    expect(prismaMock.user.update).toHaveBeenCalledTimes(1)
    expect(providerCalls).toHaveLength(1)
    expect(providerCalls[0]?.systemPrompt).toContain('OPERATING RULES CONTENT')
  })
})
