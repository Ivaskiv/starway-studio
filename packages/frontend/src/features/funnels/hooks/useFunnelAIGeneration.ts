// packages/frontend/src/features/funnels/hooks/useFunnelAIGeneration.ts

import { useGenerateFunnelVariantsMutation } from "@/services"

export default function useFunnelAIGeneration() {
  const [generateVariants, state] = useGenerateFunnelVariantsMutation()

  const generate = async (payload: any) => generateVariants(payload).unwrap()

  return { generate, ...state }
}