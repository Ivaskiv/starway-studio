import { resolveDnaPipelineRoute } from '@/core/dna/routing/dna.router.js'
import { executeDnaPipeline } from '@/core/dna/pipelines/dna.pipeline.js'
import { createRunId } from '@/core/dna/runtime/dna.runtime.js'
import { validatePipelineRequest } from '@/core/dna/validators/dna.validators.js'
import { enqueueAndWaitDnaGeneration, enqueueDnaJob } from '@/core/dna/queues/dna.queue.js'
import type { DnaPipelineRunRequest, DnaPipelineRunResult } from '@/core/dna/contracts/dna.contracts.js'

export async function runPipeline(request: DnaPipelineRunRequest): Promise<DnaPipelineRunResult> {
  validatePipelineRequest(request)

  const runId = createRunId()
  const normalizedRequest: DnaPipelineRunRequest = {
    ...request,
    input: {
      ...request.input,
      selectedOutputs: request.input.selectedOutputs ?? [request.type],
    },
  }

  enqueueDnaJob({ id: runId, createdAt: Date.now(), request: normalizedRequest })

  const queueExecution = await enqueueAndWaitDnaGeneration({
    runId,
    request: normalizedRequest,
  })
  if (queueExecution.result) return queueExecution.result

  const route = resolveDnaPipelineRoute({
    contentType: request.type,
    userContext: request.input.userContext,
    userRequest: request.input.userRequest,
    selectedProtocol: request.input.selectedProtocol,
    tone: request.input.tone,
    selectedOutputs: request.input.selectedOutputs,
    transcript: request.input.transcript,
  })

  return executeDnaPipeline({
    request: normalizedRequest,
    runId,
    route,
  })
}
