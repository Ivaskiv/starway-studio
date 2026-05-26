import type { DnaPipelineStage, DnaTelemetryEvent } from '@/core/dna/contracts/dna.contracts.js'

function nowIso(): string {
  return new Date().toISOString()
}

export function createTelemetryCollector(seed: DnaTelemetryEvent[] = []) {
  const events: DnaTelemetryEvent[] = [...seed]

  function push(stage: DnaPipelineStage, event: string, details?: Omit<DnaTelemetryEvent, 'ts' | 'stage' | 'event'>) {
    events.push({ ts: nowIso(), stage, event, ...details })
  }

  function list(): DnaTelemetryEvent[] {
    return [...events]
  }

  function summarizeCost(): { totalTokens: number; estimatedUsd: number; actualUsd: number } {
    return events.reduce(
      (acc, item) => {
        acc.totalTokens += item.tokens ?? 0
        acc.estimatedUsd += item.estimatedCostUsd ?? 0
        acc.actualUsd += Number(item.details?.actualCostUsd ?? 0)
        return acc
      },
      { totalTokens: 0, estimatedUsd: 0, actualUsd: 0 },
    )
  }

  return { push, list, summarizeCost }
}
