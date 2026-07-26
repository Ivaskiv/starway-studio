import { ContextMergeError } from './errors.js'
import type { ContextContribution, ContextSourceKind, IContextMerger, RuntimeContext } from './types.js'
import type { EngineeringArtifact } from '../orchestrator/types.js'

export class DeterministicContextMerger implements IContextMerger {
  async merge(input: {
    contributions: ContextContribution[]
    priorityOrder: ContextSourceKind[]
  }): Promise<RuntimeContext> {
    const orderedContributions = [...input.contributions].sort(
      (left, right) =>
        input.priorityOrder.indexOf(left.source) - input.priorityOrder.indexOf(right.source),
    )

    const sourceOrder: ContextSourceKind[] = []
    const summaryFragments: string[] = []
    const canonicalDocuments = new Set<string>()
    const repositoryEvidence = new Set<string>()
    const priorArtifacts = new Map<string, EngineeringArtifact>()
    const metadata: Record<string, unknown> = {}

    let task: RuntimeContext['task']
    let runtimeState: RuntimeContext['runtimeState']
    let prompt: RuntimeContext['prompt']

    for (const contribution of orderedContributions) {
      if (sourceOrder.includes(contribution.source)) {
        throw new ContextMergeError(`Duplicate context contribution for source '${contribution.source}'.`)
      }

      sourceOrder.push(contribution.source)

      if (contribution.summaryFragment?.trim()) {
        summaryFragments.push(contribution.summaryFragment.trim())
      }

      if (contribution.task) {
        task = task ? { ...task, ...contribution.task } : contribution.task
      }

      if (contribution.runtimeState) {
        runtimeState = runtimeState ? { ...runtimeState, ...contribution.runtimeState } : contribution.runtimeState
      }

      if (contribution.prompt) {
        prompt = prompt ? { ...prompt, ...contribution.prompt } : contribution.prompt
      }

      for (const documentPath of contribution.canonicalDocuments ?? []) {
        canonicalDocuments.add(documentPath)
      }

      for (const evidencePath of contribution.repositoryEvidence ?? []) {
        repositoryEvidence.add(evidencePath)
      }

      for (const artifact of contribution.priorArtifacts ?? []) {
        priorArtifacts.set(artifact.id, artifact)
      }

      Object.assign(metadata, contribution.metadata ?? {})
    }

    return {
      summary: summaryFragments.join('\n\n'),
      sourceOrder,
      task,
      runtimeState,
      prompt,
      canonicalDocuments: canonicalDocuments.size ? [...canonicalDocuments] : undefined,
      repositoryEvidence: repositoryEvidence.size ? [...repositoryEvidence] : undefined,
      priorArtifacts: priorArtifacts.size ? [...priorArtifacts.values()] : undefined,
      metadata: Object.keys(metadata).length ? metadata : undefined,
    }
  }
}
