// backend/src/modules/zoom/battle.cron.ts
// Canonical scheduler handler for stale battle cleanup.

import { cancelStaleBattles } from './battle.service.js'

export async function cancelStaleBattlesCron(): Promise<void> {
  const count = await cancelStaleBattles(8)
  if (count > 0) {
    console.info(`[battle-cron] cancelled ${count} stale battle(s)`)
  }
}
