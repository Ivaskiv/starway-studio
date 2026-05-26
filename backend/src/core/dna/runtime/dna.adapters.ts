import type { ContentTypeKey, PromptTone } from '@/modules/sales-assistant/prompts/contentType.prompts.js'
import type { DnaPipelineRunRequest, DnaRuntimeChannel } from '@/core/dna/contracts/dna.contracts.js'
import type { SalesAssistantGenerateBody } from '@/modules/sales-assistant/sales-assistant.types.js'

export function fromSalesAssistantInput(params: {
  userId: string
  workspaceId?: string | null
  body: SalesAssistantGenerateBody
  channel?: DnaRuntimeChannel
}): DnaPipelineRunRequest {
  return {
    type: params.body.contentType as ContentTypeKey,
    preset: 'TAKTYKA',
    channel: params.channel ?? 'web',
    userContext: {
      userId: params.userId,
      workspaceId: params.workspaceId ?? null,
      role: null,
      locale: 'uk-UA',
    },
    input: {
      userContext: params.body.userContext,
      userRequest: params.body.userRequest,
      selectedProtocol: params.body.selectedProtocol,
      tone: params.body.tone as PromptTone | undefined,
      selectedOutputs: params.body.selectedOutputs,
      transcript: null,
    },
  }
}
