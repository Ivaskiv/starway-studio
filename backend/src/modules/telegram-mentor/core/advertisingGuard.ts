import { testOrchestrator } from '../../../core/orchestrator/testOrchestrator.js'

export async function canSendAdvertising(userId: string): Promise<boolean> {
  return testOrchestrator.canSendAdvertising(userId)
}
