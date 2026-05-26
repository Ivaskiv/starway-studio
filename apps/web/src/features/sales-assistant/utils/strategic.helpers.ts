import type { ModelProvider } from '@ai/types/salesAssistant.types'
import type { ModelState } from '@/features/sales-assistant/utils/salesAssistant.helpers'

export function getEnabledModels(models: ModelState): ModelProvider[] {
  return (Object.keys(models) as ModelProvider[]).filter((key) => models[key])
}
