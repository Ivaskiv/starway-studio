import type {
  DependencyEdge,
  GitBranchRecord,
  GitCommitRecord,
  GitStatusSnapshot,
  IGitProvider,
  IRepositoryProvider,
  IWorkspaceProvider,
  ProjectMetadata,
  RepositoryAnalysisInput,
  RepositoryStructure,
  TestBuildMetadata,
  WorkspaceLayout,
} from './types.js'

export interface StaticRepositoryProviderConfig {
  structure: RepositoryStructure
  project: ProjectMetadata
  dependencyGraph: DependencyEdge[]
}

export class StaticRepositoryProvider implements IRepositoryProvider {
  constructor(private readonly config: StaticRepositoryProviderConfig) {}

  async inspectStructure(_input: RepositoryAnalysisInput): Promise<RepositoryStructure> {
    return structuredClone(this.config.structure)
  }

  async inspectProjectMetadata(_input: RepositoryAnalysisInput): Promise<ProjectMetadata> {
    return structuredClone(this.config.project)
  }

  async inspectDependencyGraph(_input: RepositoryAnalysisInput): Promise<DependencyEdge[]> {
    return structuredClone(this.config.dependencyGraph)
  }
}

export interface StaticGitProviderConfig {
  status: GitStatusSnapshot
  branches: GitBranchRecord[]
  commits: GitCommitRecord[]
}

export class StaticGitProvider implements IGitProvider {
  constructor(private readonly config: StaticGitProviderConfig) {}

  async inspectStatus(_input: RepositoryAnalysisInput): Promise<GitStatusSnapshot> {
    return structuredClone(this.config.status)
  }

  async inspectBranches(_input: RepositoryAnalysisInput): Promise<GitBranchRecord[]> {
    return structuredClone(this.config.branches)
  }

  async inspectCommits(input: RepositoryAnalysisInput): Promise<GitCommitRecord[]> {
    const commits = structuredClone(this.config.commits)
    return input.commitLimit ? commits.slice(0, input.commitLimit) : commits
  }
}

export interface StaticWorkspaceProviderConfig {
  layout: WorkspaceLayout
  testBuild: TestBuildMetadata
}

export class StaticWorkspaceProvider implements IWorkspaceProvider {
  constructor(private readonly config: StaticWorkspaceProviderConfig) {}

  async inspectWorkspaceLayout(_input: RepositoryAnalysisInput): Promise<WorkspaceLayout> {
    return structuredClone(this.config.layout)
  }

  async inspectTestBuildMetadata(_input: RepositoryAnalysisInput): Promise<TestBuildMetadata> {
    return structuredClone(this.config.testBuild)
  }
}
