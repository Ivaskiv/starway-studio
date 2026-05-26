import { randomUUID } from 'node:crypto'
import type { DnaGenerationLifecycleStatus } from '@/core/dna/contracts/dna.contracts.js'

export type DnaLifecycleEntry = {
  status: DnaGenerationLifecycleStatus
  at: string
  reason?: string
}

export function createRunId(): string {
  return `dna_${randomUUID()}`
}

export function createLifecycle(initial: DnaGenerationLifecycleStatus): DnaLifecycleEntry[] {
  return [{ status: initial, at: new Date().toISOString() }]
}

export function pushLifecycle(
  lifecycle: DnaLifecycleEntry[],
  status: DnaGenerationLifecycleStatus,
  reason?: string,
): DnaLifecycleEntry[] {
  return [...lifecycle, { status, at: new Date().toISOString(), reason }]
}
