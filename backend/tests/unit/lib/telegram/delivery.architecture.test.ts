import { execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const GREP_COMMAND =
  "rg -n '\\.telegram\\.send(Message|Photo|Voice|Video|Document|Audio)\\(' " +
  "backend/src -g '*.ts' || true"

const SAFE_PATH_PATTERNS = [
  'backend/src/lib/telegram.ts',
  'backend/src/lib/telegram/messageFormatter.ts',
]

describe('telegram delivery architecture', () => {
  it('keeps direct telegram transport sends constrained to canonical gateways', () => {
    const output = execSync(GREP_COMMAND, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()

    const lines = output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const unsafeBotTransportCalls = lines.filter(
      (line) => !SAFE_PATH_PATTERNS.some((pattern) => line.includes(pattern)),
    )

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
