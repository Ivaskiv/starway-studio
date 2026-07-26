import type {
  IRepositorySnapshotValidator,
  RepositorySnapshot,
  RepositorySnapshotValidationResult,
} from './types.js'

const ALLOWED_CHANGE_STATUSES = new Set([
  'added',
  'modified',
  'deleted',
  'renamed',
  'copied',
  'untracked',
  'ignored',
  'unknown',
])

export class RepositorySnapshotValidator implements IRepositorySnapshotValidator {
  async validate(snapshot: RepositorySnapshot): Promise<RepositorySnapshotValidationResult> {
    if (!snapshot.rootPath.trim()) {
      return {
        valid: false,
        reason: 'Repository snapshot rootPath is required.',
      }
    }

    if (!snapshot.generatedAt) {
      return {
        valid: false,
        reason: 'Repository snapshot generatedAt is required.',
      }
    }

    const filePaths = new Set<string>()
    for (const file of snapshot.structure.files) {
      if (!file.path.trim()) {
        return {
          valid: false,
          reason: 'Repository snapshot contains a file without a path.',
        }
      }
      if (filePaths.has(file.path)) {
        return {
          valid: false,
          reason: `Repository snapshot contains duplicate file path '${file.path}'.`,
        }
      }
      filePaths.add(file.path)
    }

    const moduleIds = new Set<string>()
    for (const moduleRecord of snapshot.structure.modules) {
      if (!moduleRecord.id.trim()) {
        return {
          valid: false,
          reason: 'Repository snapshot contains a module without an id.',
        }
      }
      if (moduleIds.has(moduleRecord.id)) {
        return {
          valid: false,
          reason: `Repository snapshot contains duplicate module id '${moduleRecord.id}'.`,
        }
      }
      moduleIds.add(moduleRecord.id)
    }

    const currentBranches = snapshot.git.branches.filter((branch) => branch.current)
    if (snapshot.git.branches.length > 0 && currentBranches.length !== 1) {
      return {
        valid: false,
        reason: 'Repository snapshot must contain exactly one current branch when branches are present.',
      }
    }

    for (const changedFile of snapshot.git.status.changedFiles) {
      if (!ALLOWED_CHANGE_STATUSES.has(changedFile.status)) {
        return {
          valid: false,
          reason: `Repository snapshot contains unsupported change status '${changedFile.status}'.`,
        }
      }
    }

    return { valid: true }
  }
}
