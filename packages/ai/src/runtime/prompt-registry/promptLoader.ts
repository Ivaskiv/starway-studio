import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { PromptMetadataValidationError } from './errors.js'
import type { IPromptLoader, PromptLoaderInput } from './types.js'

export interface FileSystemPromptLoaderOptions {
  baseDir?: string
}

export class FileSystemPromptLoader implements IPromptLoader {
  private readonly baseDir: string

  constructor(options: FileSystemPromptLoaderOptions = {}) {
    this.baseDir = options.baseDir ?? process.cwd()
  }

  async load(input: PromptLoaderInput): Promise<string> {
    const resolvedPath = path.isAbsolute(input.source.filePath)
      ? input.source.filePath
      : path.resolve(this.baseDir, input.source.filePath)

    const content = await readFile(resolvedPath, 'utf8')
    if (!content.trim()) {
      throw new PromptMetadataValidationError(
        `Prompt file '${resolvedPath}' is empty for prompt '${input.source.id}'.`,
      )
    }

    return content
  }
}
