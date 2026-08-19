import { prisma } from '../../../../db/client.js'
import { bot } from '../../../../lib/telegram.js'
import { sendTelegramMessage } from '../../../../lib/telegram/messageFormatter.js'

export function getSafeName(firstName?: string | null): string {
  if (!firstName) return ''
  return firstName
    .replace(/[<>{}\[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40)
}

function resolveZoomCalendarUrl(): string | null {
  const candidates = [
    process.env.TELEGRAM_WEBAPP_BASE_URL?.trim() ?? '',
    process.env.TELEGRAM_PUBLIC_FRONTEND_URL?.trim() ?? '',
    process.env.PUBLIC_FRONTEND_URL?.trim() ?? '',
    process.env.FRONTEND_URL?.trim() ?? '',
  ].filter(Boolean)

  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate)
      if (!parsed.host) continue
      return `${candidate.replace(/\/$/, '')}/miniapp/zoom-calendar`
    } catch {
      continue
    }
  }

  return null
}

async function sendTelegramMessageWithFallback(
  chatId: string,
  text: string,
  options?: Parameters<typeof bot.telegram.sendMessage>[2],
): Promise<boolean> {
  try {
    await sendTelegramMessage(bot, chatId, text, {
      replyMarkup: options?.reply_markup,
      disableWebPagePreview:
        typeof options?.link_preview_options === 'object'
        && options?.link_preview_options !== null
        && 'is_disabled' in options.link_preview_options
        ? Boolean((options.link_preview_options as { is_disabled?: unknown }).is_disabled)
        : false,
    })
    return true
  } catch (error) {
    console.error('[payment] rich telegram send failed, retrying plain text', {
      chatId,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  try {
    await sendTelegramMessage(bot, chatId, text)
    return true
  } catch (error) {
    console.error('[payment] plain telegram send failed', {
      chatId,
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

async function sendFocusAccessConfirmation(input: {
  chatId: string
  firstName: string | null
  planLabel: string
  accessUntilLine: string
  zoomUrl: string | null
}) {
  const name = getSafeName(input.firstName)
  const greeting = name ? `${name}, ` : ''
  const baseText =
    `${greeting}оплата пройшла успішно ✅\n\n` +
    `Тариф: ${input.planLabel}\n` +
    `${input.accessUntilLine}\n\n` +
    'Що тобі вже доступно:\n' +
    '• календар Zoom-практик\n' +
    '• запис на найближчий Zoom\n' +
    '• канал ФОКУС\n' +
    '• /start відкриває твій екран ФОКУС'

  if (!input.zoomUrl) {
    return sendTelegramMessageWithFallback(
      input.chatId,
      `${baseText}\n\nКалендар тимчасово без кнопки. Напиши /start, щоб продовжити.`
    )
  }

  return sendTelegramMessageWithFallback(
    input.chatId,
    `${baseText}\n\nПочни з календаря практик нижче.`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            process.env.TELEGRAM_WEBAPP_BASE_URL?.trim()
              ? {
                  text: 'ВІДКРИТИ КАЛЕНДАР',
                  web_app: { url: input.zoomUrl },
                }
              : { text: 'ВІДКРИТИ КАЛЕНДАР', url: input.zoomUrl },
          ],
        ],
      },
    },
  )
}

async function sendUpcomingScheduleSummary(input: {
  chatId: string
  lines: string
  zoomUrl: string | null
}) {
  const text =
    `Календар Zoom-практик:\n\n${input.lines}\n\n` +
    'Посилання на підключення надходить автоматично за 2 години до початку кожної сесії.'

  if (!input.zoomUrl) {
    return sendTelegramMessageWithFallback(input.chatId, text)
  }

  return sendTelegramMessageWithFallback(input.chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [
          process.env.TELEGRAM_WEBAPP_BASE_URL?.trim()
            ? {
                text: 'ПЕРЕГЛЯНУТИ КАЛЕНДАР',
                web_app: { url: input.zoomUrl },
              }
            : { text: 'ПЕРЕГЛЯНУТИ КАЛЕНДАР', url: input.zoomUrl },
        ],
      ],
    },
  })
}

type FocusPaymentOnboardingInput = {
  userId: string
  paidUser: {
    id: string
    firstName: string | null
    telegramChatId: string | null
    telegramLinks: Array<{ chatId: string | null }>
  } | null
  focusSubscription: {
    id: string
    focusWelcomedAt: Date | null
    expiresAt: Date | null
  } | null
  canonicalSubscription: {
    currentPeriodEnd: Date | null
  } | null
  planLabel: string
  upcomingLines: string
}

export function resolvePaidTelegramChatId(input: {
  userId: string
  paidUser: FocusPaymentOnboardingInput['paidUser']
  operation: string
}): string | null {
  const paidChatId =
    input.paidUser?.telegramChatId ??
    input.paidUser?.telegramLinks[0]?.chatId ??
    null

  if (!paidChatId) {
    console.warn('[PAYMENT_LIFECYCLE] telegram_notification_skipped', {
      userId: input.userId,
      operation: input.operation,
      reason: 'missing_chat_id',
      hasPaidUser: Boolean(input.paidUser),
      telegramChatId: input.paidUser?.telegramChatId ?? null,
      telegramLinksCount: input.paidUser?.telegramLinks.length ?? 0,
    })
    return null
  }

  return paidChatId
}

export async function sendFocusPaymentOnboardingIfNeeded(
  input: FocusPaymentOnboardingInput
): Promise<boolean> {
  const paidChatId = resolvePaidTelegramChatId({
    userId: input.userId,
    paidUser: input.paidUser,
    operation: 'focus_payment_onboarding',
  })
  if (!paidChatId || !input.paidUser) {
    return false
  }

  if (input.focusSubscription?.focusWelcomedAt) {
    console.info('[PAYMENT_LIFECYCLE] focus onboarding skipped', {
      userId: input.userId,
      reason: 'already_sent',
      sentAt: input.focusSubscription.focusWelcomedAt.toISOString(),
    })
    return false
  }

  const zoomUrl = resolveZoomCalendarUrl()
  const accessUntilDate =
    input.canonicalSubscription?.currentPeriodEnd ??
    input.focusSubscription?.expiresAt ??
    null
  const accessUntilLine = accessUntilDate
    ? `Доступ активний до ${accessUntilDate.toLocaleDateString('uk-UA')}`
    : 'Доступ уже активний'

  const confirmationSent = await sendFocusAccessConfirmation({
    chatId: paidChatId,
    firstName: input.paidUser.firstName,
    planLabel: input.planLabel,
    accessUntilLine,
    zoomUrl,
  })

  if (confirmationSent && input.upcomingLines.trim()) {
    await sendUpcomingScheduleSummary({
      chatId: paidChatId,
      lines: input.upcomingLines,
      zoomUrl,
    })
  }

  if (confirmationSent && input.focusSubscription?.id) {
    await prisma.productSubscription
      .update({
        where: { id: input.focusSubscription.id },
        data: { focusWelcomedAt: new Date() },
      })
      .catch((err) =>
        console.error('[PAYMENT_LIFECYCLE] failed to mark focus onboarding sent', {
          userId: input.userId,
          error: err instanceof Error ? err.message : String(err),
        })
      )
  }

  return confirmationSent
}

export function extractUserIdFromOrderRef(orderReference: string): string | null {
  const normalized = String(orderReference ?? '').trim()
  if (!normalized) return null
  const uuidMatch = normalized.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
  )
  return uuidMatch?.[0] ?? null
}
