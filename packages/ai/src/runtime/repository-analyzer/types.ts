import type { AgentId, IRuntimeLogger } from '../orchestrator/types.js'

export type RepositoryOwnershipClassification =
  | 'canonical'
  | 'active'
  | 'duplicate'
  | 'legacy'
  | 'dead'
  | 'unknown'

export type RepositoryChangeStatus =
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'untracked'
  | 'ignored'
  | 'unknown'

export type RepositoryDependencyKind =
  | 'workspace'
  | 'package'
  | 'module'
  | 'service'
  | 'prompt'
  | 'document'
  | 'test'
  | 'build'
  | 'unknown'

export interface RepositoryAnalysisScope {
  includePaths?: string[]
  excludePaths?: string[]
  changedFilesOnly?: boolean
  maxFiles?: number
}

export interface RepositoryAnalysisInput {
  rootPath: string
  taskId?: string
  agentId?: AgentId
  scope?: RepositoryAnalysisScope
  commitLimit?: number
}

export interface RepositoryFileRecord {
  path: string
  moduleId?: string
  packageName?: string
  classification?: RepositoryOwnershipClassification
  metadata?: Record<string, unknown>
}

export interface RepositoryModuleRecord {
  id: string
  name: string
  path: string
  packageName?: string
  ownerDocument?: string
  classification?: RepositoryOwnershipClassification
  metadata?: Record<string, unknown>
}

export interface ProjectMetadata {
  name?: string
  version?: string
  packageManager?: string
  workspaces?: string[]
  metadata?: Record<string, unknown>
}

export interface DependencyEdge {
  from: string
  to: string
  kind: RepositoryDependencyKind
  metadata?: Record<string, unknown>
}

export interface GitChangedFile {
  path: string
  status: RepositoryChangeStatus
  previousPath?: string
}

export interface GitBranchRecord {
  name: string
  current: boolean
  remoteTracking?: string
}

export interface GitCommitRecord {
  sha: string
  message: string
  authoredAt: string
  authorName?: string
}

export interface GitStatusSnapshot {
  changedFiles: GitChangedFile[]
  currentBranch?: string
  clean: boolean
  aheadBy?: number
  behindBy?: number
}

export interface WorkspacePackageRecord {
  name: string
  path: string
  private?: boolean
  scripts?: string[]
  metadata?: Record<string, unknown>
}

export interface WorkspaceLayout {
  packages: WorkspacePackageRecord[]
  apps: WorkspacePackageRecord[]
  sharedPackages?: WorkspacePackageRecord[]
}

export interface TestBuildMetadata {
  hasTypecheck: boolean
  hasBuild: boolean
  testScripts: string[]
  buildScripts: string[]
  lintScripts?: string[]
  metadata?: Record<string, unknown>
}

export interface RepositorySnapshot {
  rootPath: string
  taskId?: string
  agentId?: AgentId
  generatedAt: string
  scope: RepositoryAnalysisScope
  project: ProjectMetadata
  structure: {
    files: RepositoryFileRecord[]
    modules: RepositoryModuleRecord[]
  }
  git: {
    status: GitStatusSnapshot
    branches: GitBranchRecord[]
    commits: GitCommitRecord[]
  }
  dependencyGraph: DependencyEdge[]
  workspace: WorkspaceLayout
  testBuild: TestBuildMetadata
  evidence: string[]
}

export interface RepositoryStructure {
  files: RepositoryFileRecord[]
  modules: RepositoryModuleRecord[]
}

export interface IRepositoryProvider {
  inspectStructure(input: RepositoryAnalysisInput): Promise<RepositoryStructure>
  inspectProjectMetadata(input: RepositoryAnalysisInput): Promise<ProjectMetadata>
  inspectDependencyGraph(input: RepositoryAnalysisInput): Promise<DependencyEdge[]>
}

export interface IGitProvider {
  inspectStatus(input: RepositoryAnalysisInput): Promise<GitStatusSnapshot>
  inspectBranches(input: RepositoryAnalysisInput): Promise<GitBranchRecord[]>
  inspectCommits(input: RepositoryAnalysisInput): Promise<GitCommitRecord[]>
}

export interface IWorkspaceProvider {
  inspectWorkspaceLayout(input: RepositoryAnalysisInput): Promise<WorkspaceLayout>
  inspectTestBuildMetadata(input: RepositoryAnalysisInput): Promise<TestBuildMetadata>
}

export interface IRepositorySnapshotValidator {
  validate(snapshot: RepositorySnapshot): Promise<RepositorySnapshotValidationResult>
}

export interface RepositorySnapshotValidationResult {
  valid: boolean
  reason?: string
}

export interface IRepositoryAnalyzer {
  analyze(input: RepositoryAnalysisInput): Promise<RepositorySnapshot>
}

export interface RepositoryAnalyzerDependencies {
  repositoryProvider: IRepositoryProvider
  gitProvider: IGitProvider
  workspaceProvider: IWorkspaceProvider
  validator: IRepositorySnapshotValidator
  logger?: IRuntimeLogger
}
