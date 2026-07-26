import type { IPromptCache, PromptCacheRecord } from './types.js'

export class InMemoryPromptCache implements IPromptCache {
  private readonly records = new Map<string, PromptCacheRecord>()

  async get(key: string): Promise<PromptCacheRecord | null> {
    return this.records.get(key) ?? null
  }

  async set(key: string, value: PromptCacheRecord): Promise<void> {
    this.records.set(key, value)
  }

  async clear(): Promise<void> {
    this.records.clear()
  }
}
