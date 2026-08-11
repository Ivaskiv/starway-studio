import type { Telegraf } from 'telegraf'

export const TELEGRAM_CANONICAL_ALLOWED_UPDATES = [
  'message',
  'callback_query',
  'channel_post',
  'edited_channel_post',
  'chat_member',
  'my_chat_member',
] as const

type WebhookInfo = Awaited<ReturnType<Telegraf['telegram']['getWebhookInfo']>>

type SyncTelegramWebhookContractInput = {
  bot: Telegraf
  botName: 'main' | 'coach'
  webhookUrl: string
  webhookSecret?: string
}

export async function syncTelegramWebhookContract({
  bot,
  botName,
  webhookUrl,
  webhookSecret,
}: SyncTelegramWebhookContractInput): Promise<WebhookInfo> {
  await bot.telegram.setWebhook(webhookUrl, {
    drop_pending_updates: false,
    allowed_updates: [...TELEGRAM_CANONICAL_ALLOWED_UPDATES],
    ...(webhookSecret ? { secret_token: webhookSecret } : {}),
  })

  const webhookInfoAfter = await bot.telegram.getWebhookInfo()
  if (webhookInfoAfter.url !== webhookUrl) {
    throw new Error(
      `[TELEGRAM_WEBHOOK_SYNC_MISMATCH] ${botName} webhook url mismatch after sync: expected ${webhookUrl}, got ${webhookInfoAfter.url || '<empty>'}`,
    )
  }

  console.log('[TELEGRAM_WEBHOOK_SYNC]', {
    bot: botName,
    url: webhookUrl,
    hasSecret: Boolean(webhookSecret),
    pendingUpdateCount: webhookInfoAfter.pending_update_count,
    lastErrorDate: webhookInfoAfter.last_error_date ?? null,
    lastErrorMessage: webhookInfoAfter.last_error_message ?? null,
  })

  return webhookInfoAfter
}
