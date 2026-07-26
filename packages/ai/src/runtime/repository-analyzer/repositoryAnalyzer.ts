import type { IRuntimeLogger } from '../orchestrator/types.js'
import { RepositoryProviderError, RepositoryValidationError } from './errors.js'
import type {
  IRepositoryAnalyzer,
  RepositoryAnalysisInput,
  RepositoryAnalyzerDependencies,
  RepositorySnapshot,
} from './types.js'

class NoopRuntimeLogger implements IRuntimeLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

export class RepositoryAnalyzer implements IRepositoryAnalyzer {
  private readonly logger: IRuntimeLogger

  constructor(private readonly deps: RepositoryAnalyzerDependencies) {
    this.logger = deps.logger ?? new NoopRuntimeLogger()
  }

  async analyze(input: RepositoryAnalysisInput): Promise<RepositorySnapshot> {
    this.logger.info('repository_analyzer.analysis_started', {
      rootPath: input.rootPath,
      taskId: input.taskId,
      agentId: input.agentId,
      scope: input.scope,
    })

    let structure
    let project
    let dependencyGraph
    let gitStatus
    let gitBranches
    let gitCommits
    let workspace
    let testBuild

    try {
      ;[
        structure,
        project,
        dependencyGraph,
        gitStatus,
        gitBranches,
        gitCommits,
        workspace,
        testBuild,
      ] = await Promise.all([
        this.deps.repositoryProvider.inspectStructure(input),
        this.deps.repositoryProvider.inspectProjectMetadata(input),
        this.deps.repositoryProvider.inspectDependencyGraph(input),
        this.deps.gitProvider.inspectStatus(input),
        this.deps.gitProvider.inspectBranches(input),
        this.deps.gitProvider.inspectCommits(input),
        this.deps.workspaceProvider.inspectWorkspaceLayout(input),
        this.deps.workspaceProvider.inspectTestBuildMetadata(input),
      ])
    } catch (cause) {
      this.logger.error('repository_analyzer.provider_failed', {
        rootPath: input.rootPath,
        taskId: input.taskId,
        agentId: input.agentId,
        error: toErrorContext(cause),
      })
      throw new RepositoryProviderError('Repository Analyzer failed to inspect repository providers.', cause)
    }

    const files = this.applyScope(structure.files, input)
    const scopedChangedFiles = this.applyScope(gitStatus.changedFiles, input)

    const snapshot: RepositorySnapshot = {
      rootPath: input.rootPath,
      taskId: input.taskId,
      agentId: input.agentId,
      generatedAt: new Date().toISOString(),
      scope: input.scope ?? {},
      project,
      structure: {
        files,
        modules: structure.modules,
      },
      git: {
        status: {
          ...gitStatus,
          changedFiles: scopedChangedFiles,
        },
        branches: gitBranches,
        commits: gitCommits,
      },
      dependencyGraph,
      workspace,
      testBuild,
      evidence: this.buildEvidence({
        files,
        modules: structure.modules.length,
        changedFiles: scopedChangedFiles.length,
        dependencyEdges: dependencyGraph.length,
        packages: workspace.packages.length,
        apps: workspace.apps.length,
      }),
    }

    const validation = await this.deps.validator.validate(snapshot)
    if (!validation.valid) {
      this.logger.warn('repository_analyzer.analysis_invalid', {
        rootPath: input.rootPath,
        taskId: input.taskId,
        agentId: input.agentId,
        reason: validation.reason,
      })
      throw new RepositoryValidationError(validation.reason ?? 'Repository snapshot validation failed.')
    }

    this.logger.info('repository_analyzer.analysis_completed', {
      rootPath: input.rootPath,
      taskId: input.taskId,
      agentId: input.agentId,
      fileCount: snapshot.structure.files.length,
      moduleCount: snapshot.structure.modules.length,
      changedFileCount: snapshot.git.status.changedFiles.length,
    })

    return snapshot
  }

  private applyScope<T extends { path: string }>(items: T[], input: RepositoryAnalysisInput): T[] {
    const includePaths = input.scope?.includePaths ?? []
    const excludePaths = input.scope?.excludePaths ?? []
    const changedFilesOnly = input.scope?.changedFilesOnly ?? false
    const changedFileSet = new Set(
      changedFilesOnly
        ? items
            .filter((item) => input.scope?.includePaths?.some((prefix) => item.path.startsWith(prefix)) ?? true)
            .map((item) => item.path)
        : [],
    )

    let scopedItems = items.filter((item) => {
      const included = includePaths.length === 0 || includePaths.some((prefix) => item.path.startsWith(prefix))
      const excluded = excludePaths.some((prefix) => item.path.startsWith(prefix))
      const changedAllowed = !changedFilesOnly || changedFileSet.has(item.path)
      return included && !excluded && changedAllowed
    })

    if (typeof input.scope?.maxFiles === 'number') {
      scopedItems = scopedItems.slice(0, input.scope.maxFiles)
    }

    return scopedItems
  }

  private buildEvidence(input: {
    files: Array<{ path: string }>
    modules: number
    changedFiles: number
    dependencyEdges: number
    packages: number
    apps: number
  }): string[] {
    return [
      `Scoped files: ${input.files.length}`,
      `Discovered modules: ${input.modules}`,
      `Scoped changed files: ${input.changedFiles}`,
      `Dependency edges: ${input.dependencyEdges}`,
      `Workspace packages: ${input.packages}`,
      `Workspace apps: ${input.apps}`,
    ]
  }
}

function toErrorContext(cause: unknown): Record<string, unknown> {
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
    }
  }

  return { cause }
}
