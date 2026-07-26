import type { Tool } from './types.js'

export class ToolRegistry {
  private readonly tools = new Map<string, Tool<unknown, unknown>>()

  register<TParams, TResult>(tool: Tool<TParams, TResult>): void {
    this.tools.set(tool.id, tool as Tool<unknown, unknown>)
  }

  get<TParams, TResult>(id: string): Tool<TParams, TResult> | undefined {
    return this.tools.get(id) as Tool<TParams, TResult> | undefined
  }

  list(): Array<Tool<unknown, unknown>> {
    return Array.from(this.tools.values())
  }
}

export const toolRegistry = new ToolRegistry()
