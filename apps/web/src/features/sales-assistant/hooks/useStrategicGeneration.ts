/**
 * STRATEGIC CORE GENERATION
 *
 * Single source of truth для всіх content types.
 * Flow: Input → AI Position → Strategic Core → Content Renderers
 *
 * Content types (blog/landing/reels/etc) — це projections від core,
 * НЕ окремі pipelines. При додаванні нового типу — reuse existing core.
 */
import { resolveContentType, type ContentKey, type ModelState } from '@/features/sales-assistant/utils/salesAssistant.helpers'
import { getEnabledModels } from '@/features/sales-assistant/utils/strategic.helpers'
import type { ContentTypeKey } from '@/features/sales-assistant/types/output.types'
import type {
  GenerationResult,
  ModelGenerationResult,
  ModelProvider,
} from '@ai/types/salesAssistant.types'
import toast from 'react-hot-toast'
import type { Dispatch, SetStateAction } from 'react'

type ResultsByModel = Partial<Record<ModelProvider, GenerationResult>>
type ProviderError = {
  status: number
  code: string
  message: string
  isFatal: boolean
}

type Params = {
  generateContent: (payload: any) => { unwrap: () => Promise<GenerationResult> }
  models: ModelState
  selectedProtocol: string
  strategicCoreSnapshot: { userContext: string; userRequest: string } | null
  isBusy: boolean
  setOutputs: Dispatch<SetStateAction<ContentKey[]>>
  setIsGeneratingLocal: Dispatch<SetStateAction<boolean>>
  setResults: Dispatch<SetStateAction<ResultsByModel>>
  setProviderErrors: Dispatch<SetStateAction<Partial<Record<ModelProvider, ProviderError>>>>
  setOutputsByType: Dispatch<SetStateAction<Partial<Record<ContentTypeKey, string>>>>
}

export function useStrategicGeneration({
  generateContent,
  models,
  selectedProtocol,
  strategicCoreSnapshot,
  isBusy,
  setOutputs,
  setIsGeneratingLocal,
  setResults,
  setProviderErrors,
  setOutputsByType,
}: Params) {
  const generateStrategicFromCore = async (contentKey: ContentKey) => {
    if (!strategicCoreSnapshot || isBusy) return
    const enabledModels = getEnabledModels(models)
    if (!enabledModels.length) return

    setOutputs((prev) => (prev.includes(contentKey) ? prev : [...prev, contentKey]))
    setIsGeneratingLocal(true)

    try {
      const result = await generateContent({
        contentType: resolveContentType(contentKey),
        providers: enabledModels,
        enabledModels,
        selectedProtocol,
        selectedOutputs: [contentKey],
        userContext: strategicCoreSnapshot.userContext,
        userRequest: strategicCoreSnapshot.userRequest,
      }).unwrap()

      if (result.multiModelResults && result.multiModelResults.length > 0) {
        const newResults: ResultsByModel = {}
        const newErrors: Partial<Record<ModelProvider, ProviderError>> = {}
        for (const mr of result.multiModelResults as ModelGenerationResult[]) {
          if (mr.content !== null) {
            newResults[mr.modelKey] = {
              id: result.id,
              content: mr.content,
              modelUsed: mr.modelKey,
              contentType: result.contentType,
              protocol: result.protocol,
              tokensUsed: mr.usage?.totalTokens ?? 0,
              usage: mr.usage ?? undefined,
              createdAt: result.createdAt,
              validationWarning: result.validationWarning,
            }
          } else if (mr.error !== null) {
            newErrors[mr.modelKey] = mr.error
          }
        }
        setResults((current) => ({ ...current, ...newResults }))
        setProviderErrors((current) => ({ ...current, ...newErrors }))
      } else {
        setResults((current) => ({ ...current, [result.modelUsed]: result }))
      }
      setOutputsByType((current) => ({
        ...current,
        [contentKey]: result.content ?? '',
      }))
    } catch (error) {
      console.error('[DNA][frontend] strategic generation failed', error)
      toast.error('Не вдалося згенерувати стратегічний контент')
    } finally {
      setIsGeneratingLocal(false)
    }
  }

  return { generateStrategicFromCore }
}
