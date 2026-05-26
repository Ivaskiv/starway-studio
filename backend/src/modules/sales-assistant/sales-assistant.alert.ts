import { sendDedupedTelegramMessage } from "@/lib/telegram.js"
import { normalizeProviderError } from "@/modules/ai-assistant/utils/normalizeProviderError.js"
import { ADMIN_ALERT_DEBOUNCE_MS, ALERT_WORTHY_CODES, PROVIDER_EMOJI } from "@/modules/sales-assistant/sales-assistant.constants.js"

let lastAdminAlertAt = 0

export async function sendAdminAlert(
  error: ReturnType<typeof normalizeProviderError>
): Promise<void> {
  if (!ALERT_WORTHY_CODES.has(error.code)) return

  const now = Date.now()
  if (now - lastAdminAlertAt < ADMIN_ALERT_DEBOUNCE_MS) {
    console.warn('[DNA][admin-alert] debounced', {
      code: error.code,
      provider: error.provider,
      nextAlertIn: Math.round((ADMIN_ALERT_DEBOUNCE_MS - (now - lastAdminAlertAt)) / 1000) + 's',
    })
    return
  }
  lastAdminAlertAt = now

  const adminChatId = process.env.ADMIN_TELEGRAM_CHAT_ID
  if (!adminChatId) {
    console.warn('[DNA][admin-alert] ADMIN_TELEGRAM_CHAT_ID not set — skipped')
    return
  }

  const emoji = PROVIDER_EMOJI[error.provider] ?? '⚠️'
  const text = [
    `${emoji} *DNA STARWAY — AI Alert*`,
    ``,
    `Провайдер: \`${error.provider.toUpperCase()}\``,
    `Код: \`${error.code}\``,
    `Статус: \`${error.status}\``,
    ``,
    `📋 ${error.message.slice(0, 400)}`,
    ``,
    `🕐 ${new Date().toISOString()}`,
  ].join('\n')

  try {
    await sendDedupedTelegramMessage(adminChatId, text)
    console.info('[DNA][admin-alert] sent', { code: error.code, provider: error.provider })
  } catch (err) {
    console.error('[DNA][admin-alert] failed to send', err)
  }
}