import {
  DNA_GENERATION_STATUSES,
  DNA_PIPELINE_STAGES,
  DNA_PRESET_IDS,
  type DnaArtifact,
  type DnaPipelineRunRequest,
} from '@/core/dna/contracts/dna.contracts.js'

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function validatePipelineRequest(request: DnaPipelineRunRequest): void {
  if (!DNA_PRESET_IDS.includes(request.preset)) {
    throw new Error(`DNA_PRESET_INVALID:${String(request.preset)}`)
  }
  if (!hasText(request.type)) {
    throw new Error('DNA_TYPE_REQUIRED')
  }
  if (!hasText(request.input.userContext)) {
    throw new Error('DNA_USER_CONTEXT_REQUIRED')
  }
  if (!hasText(request.input.userRequest)) {
    throw new Error('DNA_USER_REQUEST_REQUIRED')
  }
  if (!hasText(request.userContext.userId)) {
    throw new Error('DNA_USER_ID_REQUIRED')
  }
}

export function validateArtifactOutput(artifact: DnaArtifact): void {
  if (!artifact.rawText || !artifact.rawText.trim()) {
    throw new Error(`DNA_ARTIFACT_EMPTY:${artifact.type}`)
  }
  if (!artifact.payload || typeof artifact.payload !== 'object') {
    throw new Error(`DNA_ARTIFACT_PAYLOAD_INVALID:${artifact.type}`)
  }
}

export function isLifecycleStatus(value: string): boolean {
  return (DNA_GENERATION_STATUSES as readonly string[]).includes(value)
}

export function isPipelineStage(value: string): boolean {
  return (DNA_PIPELINE_STAGES as readonly string[]).includes(value)
}
