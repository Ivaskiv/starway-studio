import type { Telegraf } from 'telegraf'

import { prisma, withRetry } from '../../db/client.js'
import { generateWeeklyReport } from '../ai-mentor/services.js'
import { sendTelegramMessage } from '../../lib/telegram/messageFormatter.js'

const WEEKLY_REPORT_THROTTLE_MS = 3000

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function runWeeklyReports(): Promise<void> {
  console.log('[Scheduler] Starting weekly reports...')

  const owners = await withRetry(() => prisma.user.findMany({
    where: {
      ownedProducts: {
        some: {
          botConfig: { isNot: null },
        },
      },
    },
    include: {
      ownedProducts: {
        where: { botConfig: { isNot: null } },
        include: { botConfig: true },
        take: 1,
      },
    },
  }))

  console.log(`[Scheduler] ${owners.length} owners to process`)
  let success = 0
  let failed = 0

  for (const owner of owners) {
    const product = owner.ownedProducts[0]
    if (!product) continue

    try {
      await generateWeeklyReport(owner.id, product.id)
      success += 1

      const telegramId = owner.telegramUserId
      if (telegramId && product.botConfig?.botToken) {
        try {
          const { Telegraf: TelegrafCtor } = await import('telegraf')
          const ownerBot: Telegraf = new TelegrafCtor(product.botConfig.botToken)
          await sendTelegramMessage(
            ownerBot,
            telegramId,
            '✅ Твій щотижневий AI-звіт готовий → Dashboard / Content',
          )
        } catch (telegramError) {
          console.error(`[Scheduler] Telegram failed for ${owner.id}:`, telegramError)
        }
      }
    } catch (error) {
      failed += 1
      console.error(`[Scheduler] Failed for owner ${owner.id}:`, error)
    }

    await sleep(WEEKLY_REPORT_THROTTLE_MS)
  }

  console.log(`[Scheduler] Done. success=${success} failed=${failed}`)
}
