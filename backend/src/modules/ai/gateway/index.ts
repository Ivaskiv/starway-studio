// Canonical AI agent gateway facade.
export { executeCanonicalPromptAgent } from './execute.js'
export {
buildGatewayPromptSources,
resolveRepositoryPromptsDir
} from './runtime.js'
export { TelegramAgentGateway } from './service.js'
export type {
CanonicalPromptAgentExecutionInput,
CanonicalPromptAgentExecutionResult,
IAgentGateway,
TargetedGatewayAgentTestRequest,
TelegramAgentGatewayDependencies,
TelegramAgentGatewayRequest,
TelegramAgentGatewayResult,
TelegramGatewayBot,
TelegramGatewayIntent
} from './types.js'

import { TelegramAgentGateway } from './service.js'
let telegramAgentGatewaySingleton: TelegramAgentGateway | null = null
export function getTelegramAgentGateway(): TelegramAgentGateway {
  if (!telegramAgentGatewaySingleton)
    telegramAgentGatewaySingleton = new TelegramAgentGateway()
  return telegramAgentGatewaySingleton
}
export async function invalidateTelegramAgentPromptCache(): Promise<void> {
  await telegramAgentGatewaySingleton?.invalidatePromptCache()
}
