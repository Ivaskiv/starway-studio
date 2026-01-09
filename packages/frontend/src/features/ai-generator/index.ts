// features/ai-generator/index.ts

// Pages
export { default as AIGeneratorPage } from './pages/AIGeneratorPage'

// Components
export { default as StepCard } from './components/StepCard'

// Context
export { AIGeneratorProvider, useAIGenerator } from './components/AIGeneratorProvider'

// API
export {
  aiGeneratorApi, useGenerateFunnelBlueprintMutation, useGenerateStepVariantsMutation, useSaveFunnelFromBlueprintMutation
} from './services/ai-generator.api'

// Types
export * from './types/generator.types'
