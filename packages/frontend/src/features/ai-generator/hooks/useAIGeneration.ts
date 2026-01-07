// packages/frontend/src/features/ai-generator/hooks/useAIGeneration.ts
import { useGenerateStepVariantsMutation } from '@/services/ai-generator.api'

export function useAIGeneration() {
  const [generateStepVariants, state] =
    useGenerateStepVariantsMutation()

  const generate = async (payload: any) => {
    return generateStepVariants(payload).unwrap()
  }

  return {
    generate,
    ...state,
  }
}
export default useAIGeneration;