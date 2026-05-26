import type {
  DnaAgentResult,
  DnaGenerationLifecycleStatus,
  DnaPipelineRunRequest,
  DnaPipelineRunResult,
  DnaPipelineStage,
} from '@/core/dna/contracts/dna.contracts.js'
import { getDnaAgent } from '@/core/dna/agents/dna.agent-registry.js'
import { validateArtifactOutput } from '@/core/dna/validators/dna.validators.js'
import { createLifecycle, pushLifecycle } from '@/core/dna/runtime/dna.runtime.js'
import { createTelemetryCollector } from '@/core/dna/telemetry/dna.telemetry.js'
import { persistDnaArtifacts } from '@/core/dna/storage/dna.storage.js'
import type { DnaPipelineRoute } from '@/core/dna/contracts/dna.contracts.js'

export async function executeDnaPipeline(params: {
  request: DnaPipelineRunRequest
  runId: string
  route: DnaPipelineRoute
}): Promise<DnaPipelineRunResult> {
  let lifecycle = createLifecycle('queued')
  const telemetry = createTelemetryCollector()

  const setStatus = (status: DnaGenerationLifecycleStatus, stage: DnaPipelineStage, reason?: string) => {
    lifecycle = pushLifecycle(lifecycle, status, reason)
    telemetry.push(stage, `lifecycle:${status}`, { details: reason ? { reason } : undefined })
  }

  setStatus('running', 'PLAN')

  const baseInput = {
    contentType: params.request.type,
    userContext: params.request.input.userContext,
    userRequest: params.request.input.userRequest,
    selectedProtocol: params.request.input.selectedProtocol,
    tone: params.request.input.tone,
    selectedOutputs: params.request.input.selectedOutputs,
    transcript: params.request.input.transcript,
  }

  const artifacts: DnaAgentResult[] = []

  for (const agentId of params.route.agents) {
    telemetry.push('EXECUTE', 'agent:start', { details: { agentId } })
    const startedAt = Date.now()
    try {
      const agent = getDnaAgent(agentId)
      const result = await agent.execute({
        input: baseInput,
        presetId: params.request.preset,
        provider: params.route.providerOrder[0],
        stageContext: {
          runId: params.runId,
          status: 'running',
          stage: 'EXECUTE',
          startedAt,
          retries: 0,
          route: params.route,
          telemetry: telemetry.list(),
        },
      })
      artifacts.push(result)
      telemetry.push('EXECUTE', 'agent:success', {
        provider: result.artifact.provider,
        latencyMs: Date.now() - startedAt,
        tokens: result.usage?.totalTokens,
        estimatedCostUsd: result.usage?.estimatedCostUsd ?? undefined,
        details: { agentId },
      })
    } catch (error) {
      telemetry.push('EXECUTE', 'agent:failed', {
        latencyMs: Date.now() - startedAt,
        details: { agentId, error: error instanceof Error ? error.message : String(error) },
      })
      setStatus('retrying', 'EXECUTE', `agent_failed:${agentId}`)
      throw error
    }
  }

  setStatus('running', 'VALIDATE')
  for (const result of artifacts) {
    validateArtifactOutput(result.artifact)
  }

  setStatus('running', 'FORMAT')
  const finalArtifacts = artifacts.map((result) => result.artifact)

  setStatus('running', 'STORE')
  await persistDnaArtifacts({
    user: params.request.userContext,
    input: baseInput,
    artifacts: finalArtifacts,
    runId: params.runId,
  })

  setStatus('running', 'QUEUE')
  telemetry.push('QUEUE', 'queue:ready', {
    details: { runId: params.runId, artifacts: finalArtifacts.length },
  })

  setStatus('completed', 'DISTRIBUTE')

  return {
    runId: params.runId,
    status: 'completed',
    stage: 'DISTRIBUTE',
    route: params.route,
    artifacts: finalArtifacts,
    lifecycle,
    telemetry: telemetry.list(),
  }
}
