import { prisma } from '@/db/client.js'
import type { DnaArtifact, DnaPipelineInput, DnaRuntimeUserContext } from '@/core/dna/contracts/dna.contracts.js'

export async function persistDnaArtifacts(params: {
  user: DnaRuntimeUserContext
  input: DnaPipelineInput
  artifacts: DnaArtifact[]
  runId: string
}): Promise<void> {
  if (!params.user.workspaceId || params.artifacts.length === 0) return

  const first = params.artifacts[0]

  await prisma.salesAssistantGeneration.create({
    data: {
      workspaceId: params.user.workspaceId,
      contentType: params.input.contentType,
      modelUsed: first.provider,
      protocol: params.input.selectedProtocol,
      userContext: params.input.userContext,
      request: params.input.userRequest,
      result: JSON.stringify(params.artifacts.map((artifact) => artifact.payload)),
      tokensUsed: 0,
    },
  }).catch((error) => {
    console.error('[DNA][storage] persist failed', { runId: params.runId, error })
  })
}
