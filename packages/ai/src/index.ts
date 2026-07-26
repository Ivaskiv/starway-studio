export * from './providers/index.js'
export * from './providers/models.js'
export * from './providers/routing.js'
export * from './runtime/agent-runner/index.js'
export * from './runtime/agent-registry/index.js'
export * from './runtime/artifact-engine/index.js'
export * from './runtime/context-loader/index.js'
export * from './runtime/human-approval/index.js'
export * from './runtime/orchestrator/index.js'
export * from './runtime/prompt-registry/index.js'
export * from './runtime/repository-analyzer/index.js'
export * from './runtime/routing-engine/index.js'
export * from './tools/registry.js'
export * from './tools/telegram.tool.js'
export * from './tools/types.js'
export * from './types/salesAssistant.types.js'

import { toolRegistry } from './tools/registry.js'
import { telegramSendTool } from './tools/telegram.tool.js'

if (!toolRegistry.get(telegramSendTool.id)) {
  toolRegistry.register(telegramSendTool)
}
