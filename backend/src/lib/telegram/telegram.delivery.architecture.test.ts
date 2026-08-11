import { execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const GREP_COMMAND =
  "grep -RniE 'ctx\\.reply|telegram\\.sendMessage|telegramBot\\.telegram\\.sendMessage|coachBot\\.telegram\\.sendMessage|sendPhoto|sendAudio' " +
  "--exclude='*.test.ts' --exclude='*.spec.ts' " +
  'backend/src/products/ab-system ' +
  'backend/src/modules/telegram-mentor ' +
  'backend/src/modules/zoom ' +
  'backend/src/services/notifications ' +
  'backend/src/services/scheduler ' +
  'backend/src/modules/admin ' +
  'backend/src/modules/subscriptions || true'

const SAFE_PATH_PATTERNS = [
  'backend/src/modules/telegram-mentor/conversation/delivery/planDelivery.ts',
  'backend/src/lib/telegram.ts',
  'backend/src/lib/telegram/messageFormatter.ts',
  'backend/src/products/ab-system/telegram/abTest.views.ts',
  'backend/src/modules/telegram-mentor/conversation/renderers/telegramConversationRenderer.ts',
]

describe('telegram delivery architecture', () => {
  it('keeps direct bot transport sends constrained to canonical gateways', () => {
    const output = execSync(GREP_COMMAND, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()

    const lines = output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const unsafeBotTransportCalls = lines.filter((line) => {
      const isDirectBotTransport =
        line.includes('telegramBot.telegram.sendMessage')
        || line.includes('coachBot.telegram.sendMessage')
      if (!isDirectBotTransport) {
        return false
      }

      return !SAFE_PATH_PATTERNS.some((pattern) => line.includes(pattern))
    })

    expect(unsafeBotTransportCalls).toEqual([])
  })

  it('keeps formatter ownership canonical', () => {
    const output = execSync(
      "grep -RniE 'messageFormatter|formatTelegramMessage|TelegramContentBlock|blockquote' backend/src || true",
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )

    expect(output).toContain('backend/src/lib/telegram/messageFormatter.ts')
  })
})
