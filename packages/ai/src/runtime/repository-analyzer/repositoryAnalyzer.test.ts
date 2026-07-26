import { describe, expect, it, vi } from 'vitest'

import type { IRuntimeLogger } from '../orchestrator/types.js'
import { RepositoryValidationError } from './errors.js'
import {
  StaticGitProvider,
  StaticRepositoryProvider,
  StaticWorkspaceProvider,
} from './providers.js'
import { RepositoryAnalyzer } from './repositoryAnalyzer.js'
import { RepositorySnapshotValidator } from './validator.js'

const logger: IRuntimeLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

function createAnalyzer() {
  return new RepositoryAnalyzer({
    repositoryProvider: new StaticRepositoryProvider({
      structure: {
        files: [
          { path: 'packages/ai/src/runtime/orchestrator/runtimeOrchestrator.ts', moduleId: 'runtime-orchestrator' },
          { path: 'packages/ai/src/runtime/agent-runner/agentRunner.ts', moduleId: 'agent-runner' },
          { path: 'backend/src/index.ts', moduleId: 'backend-entry' },
        ],
        modules: [
          { id: 'runtime-orchestrator', name: 'Runtime Orchestrator', path: 'packages/ai/src/runtime/orchestrator' },
          { id: 'agent-runner', name: 'Agent Runner', path: 'packages/ai/src/runtime/agent-runner' },
        ],
      },
      project: {
        name: 'starway-studio',
        version: '1.0.0',
        packageManager: 'pnpm@11.3.0',
        workspaces: ['apps/*', 'backend', 'packages/*'],
      },
      dependencyGraph: [
        { from: 'runtime-orchestrator', to: 'agent-runner', kind: 'module' },
        { from: 'agent-runner', to: 'prompt-registry', kind: 'module' },
      ],
    }),
    gitProvider: new StaticGitProvider({
      status: {
        changedFiles: [
          { path: 'packages/ai/src/runtime/orchestrator/runtimeOrchestrator.ts', status: 'modified' },
          { path: 'packages/ai/src/runtime/repository-analyzer/repositoryAnalyzer.ts', status: 'added' },
        ],
        currentBranch: 'codex/runtime-7',
        clean: false,
      },
      branches: [
        { name: 'main', current: false },
        { name: 'codex/runtime-7', current: true },
      ],
      commits: [
        {
          sha: 'abc123',
          message: 'feat: runtime analyzer',
          authoredAt: new Date(0).toISOString(),
          authorName: 'Codex',
        },
      ],
    }),
    workspaceProvider: new StaticWorkspaceProvider({
      layout: {
        packages: [{ name: '@starway/ai', path: 'packages/ai', private: true, scripts: ['build', 'typecheck'] }],
        apps: [{ name: 'backend', path: 'backend', scripts: ['build'] }],
        sharedPackages: [{ name: '@starway/shared', path: 'packages/shared' }],
      },
      testBuild: {
        hasTypecheck: true,
        hasBuild: true,
        testScripts: ['test:unit', 'test:integration'],
        buildScripts: ['build'],
        lintScripts: [],
      },
    }),
    validator: new RepositorySnapshotValidator(),
    logger,
  })
}

describe('RepositoryAnalyzer', () => {
  it('builds a repository snapshot from read-only providers', async () => {
    const analyzer = createAnalyzer()

    const snapshot = await analyzer.analyze({
      rootPath: '/workspace/starway-studio',
      taskId: 'task-7',
      agentId: 'implementation',
      commitLimit: 1,
    })

    expect(snapshot.project.name).toBe('starway-studio')
    expect(snapshot.structure.files).toHaveLength(3)
    expect(snapshot.git.status.changedFiles).toHaveLength(2)
    expect(snapshot.git.commits).toHaveLength(1)
    expect(snapshot.workspace.packages).toHaveLength(1)
    expect(snapshot.evidence).toContain('Scoped files: 3')
  })

  it('applies scoped path filtering', async () => {
    const analyzer = createAnalyzer()

    const snapshot = await analyzer.analyze({
      rootPath: '/workspace/starway-studio',
      agentId: 'code_review',
      scope: {
        includePaths: ['packages/ai/src/runtime'],
        excludePaths: ['packages/ai/src/runtime/agent-runner'],
      },
    })

    expect(snapshot.structure.files).toHaveLength(1)
    expect(snapshot.structure.files[0]?.path).toContain('runtimeOrchestrator.ts')
  })

  it('limits returned commits through git provider abstraction', async () => {
    const analyzer = createAnalyzer()

    const snapshot = await analyzer.analyze({
      rootPath: '/workspace/starway-studio',
      commitLimit: 1,
    })

    expect(snapshot.git.commits).toHaveLength(1)
  })

  it('fails validation when the snapshot is structurally invalid', async () => {
    const analyzer = new RepositoryAnalyzer({
      repositoryProvider: new StaticRepositoryProvider({
        structure: {
          files: [
            { path: 'duplicate.ts' },
            { path: 'duplicate.ts' },
          ],
          modules: [],
        },
        project: {},
        dependencyGraph: [],
      }),
      gitProvider: new StaticGitProvider({
        status: { changedFiles: [], clean: true },
        branches: [],
        commits: [],
      }),
      workspaceProvider: new StaticWorkspaceProvider({
        layout: { packages: [], apps: [] },
        testBuild: { hasTypecheck: false, hasBuild: false, testScripts: [], buildScripts: [] },
      }),
      validator: new RepositorySnapshotValidator(),
      logger,
    })

    await expect(
      analyzer.analyze({
        rootPath: '/workspace/starway-studio',
      }),
    ).rejects.toBeInstanceOf(RepositoryValidationError)
  })
})
