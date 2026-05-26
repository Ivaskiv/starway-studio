// backend/src/modules/zoom/battle.cron.ts
// Auto-cancels battles that have exceeded their 7-day window without a result

import cron from 'node-cron';
import { cancelStaleBattles } from './battle.service.js';

export function startBattleCron(): void {
  // Run daily at 03:00
  cron.schedule('0 3 * * *', async () => {
    try {
      const count = await cancelStaleBattles(8);
      if (count > 0) console.info(`[battle-cron] cancelled ${count} stale battle(s)`);
    } catch (err) {
      console.error('[battle-cron] error', err);
    }
  });
  console.info('[battle-cron] started');
}
