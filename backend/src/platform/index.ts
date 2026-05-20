//Users/viravira/Documents/starway-studio/backend/src/platform/index.ts
export {
  AI_MODEL_TIERS,
  AI_TASK_REGISTRY,
  resolveAiModel,
  type AiTaskRegistryEntry,
  type AiTaskTier,
  type AiTaskType,
} from './ai.registry.js'

export {
  PLATFORM_PRODUCTS,
  getPlatformProductByRoute,
  getPlatformProductConfig,
  getPlatformProductManifest,
  getPlatformProductsByAuthMode,
  getPlatformProductsByVisibility,
  listPlatformProducts,
  type PlatformProductId,
  type PlatformProductType,
  type PlatformVisibility,
} from '@shared/platform.registry'

export {
  resolveRuntimeBotRegistry,
  type PlatformBotRegistry,
  type PlatformBotTemplate,
  type RuntimePlatformBot,
} from './bot.registry.js'

export {
  PLATFORM_CRON_REGISTRY,
  getProductCronProfile,
  type PlatformCronJob,
  type PlatformCronProfile,
} from './cron.registry.js'
