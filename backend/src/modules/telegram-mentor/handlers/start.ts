import type { Context } from 'telegraf'

import { bot } from '../../../lib/telegram.js'
import { getAccessControlState } from '../../access/service.js'
import { resolveOrCreateTelegramGuestUser } from '../../user/identity.service.js'
import { resolveDeepLinkToken } from '../../deeplinks/service.js'
import { trackEvent } from '../../events/service.js'
import { isContentMachinePayload, trackContentPayloadEntry } from '../../events/contentAttribution.service.js'
import { verifyTelegramLinkCode } from '../../social/service.js'
import { findLinkedUserId, upsertTelegramBinding } from '../services/linking.service.js'
import { getTelegramAppUrl, openAppKeyboard, trialExpiredKeyboard } from '../keyboards.js'
import {
  isLeadMagnetPayload,
  isLockedState as isCoreLockedState,
  resolveLinkedUserIdFromContext,
  resolveUserState as resolveCoreUserState,
  type UserState as CoreUserState,
} from '../core/state.service.js'
import { startLeadMagnet } from '../flows/leadMagnet.flow.js'
import { sendWaitlist } from '../flows/onboarding.flow.js'
import { sendProduct } from '../flows/product.flow.js'
import { resolveDecision } from '../../../core/decision/decision.resolver.js'
import { renderTelegramDecision } from '../renderers/decisionTelegram.js'

export type StartContext = Context & {
  startPayload?: string
}

export type UserState =
  | 'new'
  | 'lm_started'
  | 'lm_engaged'
  | 'lm_almost_done'
  | 'lm_completed'
  | 'lm_exited'
  | 'active'
  | 'in_trial'
  | 'subscribed'
  | 'paused'

export type StateMessage = {
  text: string
  buttons: Array<Array<{ text: string; callback_data: string } | { text: string; url: string } | { text: string; web_app: { url: string } }>>
}

export { resolveLinkedUserIdFromContext }

export const GENERIC_DEEPLINK_PREFIX = 'dl_'

function getStartPayload(ctx: StartContext): string {
  if (ctx.startPayload) {
    return ctx.startPayload.trim()
  }

  const text = 'message' in ctx && ctx.message && 'text' in ctx.message ? ctx.message.text : ''
  return String(text ?? '').replace('/start', '').trim()
}

function mapStateToLegacy(state: CoreUserState): UserState {
  switch (state) {
    case 'LEAD_MAGNET':
      return 'lm_engaged'
    case 'TRIAL':
      return 'in_trial'
    case 'ACTIVE':
      return 'subscribed'
    case 'PAUSED':
      return 'paused'
    case 'ONBOARDING':
      return 'active'
    case 'WAITLIST':
    default:
      return 'new'
  }
}

export function isLeadMagnetActive(state: UserState | null | undefined): boolean {
  return state === 'lm_started'
    || state === 'lm_engaged'
    || state === 'lm_almost_done'
    || state === 'lm_completed'
    || state === 'lm_exited'
}

export function isLockedState(state: UserState | null | undefined): boolean {
  return isLeadMagnetActive(state)
}

export async function resolveUserState(userId: string): Promise<UserState> {
  return mapStateToLegacy(await resolveCoreUserState(userId))
}

export async function getStateMessage(
  state: UserState,
  _name = '',
  mentor: { insight?: string | null; stage?: string | null; blocker?: string | null } | null = null,
  trialDay?: string,
  _nudgeCount = 0,
): Promise<StateMessage> {
  const insight = mentor?.insight ? `\n\n${mentor.insight}` : ''
  const stage = mentor?.stage ? `\nСтан: ${mentor.stage}` : ''

  switch (state) {
    case 'lm_started':
    case 'lm_engaged':
    case 'lm_almost_done':
    case 'lm_completed':
    case 'lm_exited':
      return {
        text: `Lead magnet активний.${stage}${insight}\n\nПродовжуй практикум у поточному flow.`,
        buttons: [[{ text: '▶️ Продовжити', callback_data: 'lm_continue' }]],
      }
    case 'in_trial':
      return {
        text: `Сесія активна.\nПідписка: тріал · день ${trialDay ?? '?'} із 7.${stage}${insight}`,
        buttons: [[{ text: '▶️ Продовжити', callback_data: 'continue_ai_mentor' }]],
      }
    case 'subscribed':
      return {
        text: `Сесія активна.\nПідписка: активна.${stage}${insight}`,
        buttons: [[{ text: '▶️ Продовжити', callback_data: 'continue_ai_mentor' }]],
      }
    case 'paused':
      return {
        text: `Доступ до ABsystemа зараз на паузі.${stage}${insight}\n\nТвоя історія, звіти й аналіз уже збережені. Щоб повернути ранкові й вечірні сесії, віднови доступ.`,
        buttons: [
          [
            {
              text: '🚀 Відновити доступ',
              web_app: { url: getTelegramAppUrl('/miniapp?startapp=subscription') ?? 'https://starway-frontend.vercel.app/miniapp?startapp=subscription' },
            },
          ],
        ],
      }
    case 'active':
      return {
        text: `Онбординг активний.${stage}${insight}`,
        buttons: [[{ text: '🔥 Early access', callback_data: 'waitlist_early_access' }]],
      }
    case 'new':
    default:
      return {
        text: `Ранній доступ активний.${insight}\n\nДочекайся відкриття продуктового доступу.`,
        buttons: [[{ text: '🔥 Early access', callback_data: 'waitlist_early_access' }]],
      }
  }
}

export async function sendEntryOffer(ctx: Context): Promise<void> {
  await sendWaitlist(ctx)
}

export async function sendStateMenu(ctx: Context, userId: string): Promise<void> {
  const { decision } = await resolveDecision(userId, 'menu_open')
  const firstName = ctx.from?.first_name ?? 'Привіт'

  if (await renderTelegramDecision(ctx, decision, firstName)) {
    return
  }

  const state = await resolveCoreUserState(userId)

  if (state === 'LEAD_MAGNET') {
    const menu = await getStateMessage('lm_engaged')
    await ctx.reply(menu.text, {
      reply_markup: { inline_keyboard: menu.buttons },
    })
    return
  }

  if (state === 'WAITLIST' || state === 'ONBOARDING') {
    await sendWaitlist(ctx)
    return
  }

  if (state === 'PAUSED') {
    const menu = await getStateMessage('paused')
    await ctx.reply(menu.text, {
      reply_markup: trialExpiredKeyboard().reply_markup,
    })
    return
  }

  if (state === 'TRIAL' || state === 'ACTIVE') {
    await sendProduct(ctx)
  }
}

async function hasOpenStarwayAccess(userId: string | null): Promise<boolean> {
  if (!userId) return false

  try {
    const access = await getAccessControlState(userId)
    return access.hasRequiredContacts
  } catch {
    return false
  }
}

export async function syncAccessAwareChatMenuButton(chatId: string | number, userId: string | null): Promise<void> {
  const normalizedChatId = typeof chatId === 'string' ? Number(chatId) : chatId
  if (!Number.isFinite(normalizedChatId)) return

  try {
    if (await hasOpenStarwayAccess(userId)) {
      const appUrl = getTelegramAppUrl('/miniapp?startapp=ai')
      if (!appUrl) {
        await bot.telegram.setChatMenuButton({
          chatId: normalizedChatId,
          menuButton: { type: 'default' },
        })
        return
      }

      await bot.telegram.setChatMenuButton({
        chatId: normalizedChatId,
        menuButton: {
          type: 'web_app',
          text: 'Відкрити Starway',
          web_app: { url: appUrl },
        },
      })
      return
    }

    await bot.telegram.setChatMenuButton({
      chatId: normalizedChatId,
      menuButton: { type: 'default' },
    })
  } catch {
    // silent
  }
}

export async function syncAccessAwareChatCommands(chatId: string | number, userId: string | null): Promise<void> {
  const normalizedChatId = typeof chatId === 'string' ? Number(chatId) : chatId
  if (!Number.isFinite(normalizedChatId)) return
  void userId

  try {
    await bot.telegram.setMyCommands([
      { command: 'privacy', description: 'Політика конфіденційності чат-бота' },
    ], {
      scope: { type: 'chat', chat_id: normalizedChatId },
    })
  } catch {
    // silent
  }
}

export async function syncAccessAwareChatEntryPoints(chatId: string | number, userId: string | null): Promise<void> {
  await Promise.all([
    syncAccessAwareChatMenuButton(chatId, userId),
    syncAccessAwareChatCommands(chatId, userId),
  ])
}

export async function getAccessAwareAppReplyMarkupForContext(
  ctx: Context,
): Promise<ReturnType<typeof openAppKeyboard>['reply_markup'] | undefined> {
  const userId = await resolveLinkedUserIdFromContext(ctx)
  if (!(await hasOpenStarwayAccess(userId))) {
    return undefined
  }

  return openAppKeyboard('/miniapp?startapp=ai', '🌐 Відкрити Starway').reply_markup
}

async function trackLeadPayloadEntry(userId: string, payload: string, accessState: CoreUserState) {
  await trackEvent({
    userId,
    type: 'telegram_lead_payload_entry',
    source: 'telegram',
    state: accessState,
    payload: {
      payload,
      source: 'sendpulse_or_external',
    },
  })
}

async function sendProductPriorityChoice(ctx: Context, userId: string, payload: string) {
  await trackLeadPayloadEntry(userId, payload, await resolveCoreUserState(userId))

  const replyMarkup = openAppKeyboard('/miniapp?startapp=ai', '🌐 Відкрити Starway').reply_markup

  await ctx.reply(
    [
      'У тебе вже є активний доступ до ABsystem.',
      '',
      'Можеш або продовжити роботу в Starway, або пройти матеріал безкоштовного практикуму ще раз як додаткову практику.',
    ].join('\n'),
    {
      reply_markup: {
        inline_keyboard: [
          ...(replyMarkup.inline_keyboard ?? []),
          [{ text: '🎁 Пройти матеріал ще раз', callback_data: 'lm_continue_material' }],
        ],
      },
    },
  )
}

export async function handleStart(ctx: StartContext) {
  const rawChatId = ctx.chat?.id
  if (!rawChatId) {
    return
  }

  const chatId = String(rawChatId)
  const payload = getStartPayload(ctx)
  const firstName = ctx.from?.first_name ?? 'Привіт'
  const telegramUserId = ctx.from?.id ? String(ctx.from.id) : chatId
  const telegramUserName = ctx.from?.username ?? null

  let linkedUserId = await findLinkedUserId({
    chatId,
    telegramUserId,
    telegramUserName,
  })

  if (payload.startsWith(GENERIC_DEEPLINK_PREFIX)) {
    const resolvedDeepLink = await resolveDeepLinkToken({ token: payload, consume: true })
    if (resolvedDeepLink?.userId) {
      linkedUserId = resolvedDeepLink.userId
    }
  }

  const verifiedLegacyUserId = payload ? await verifyTelegramLinkCode(payload) : null
  if (verifiedLegacyUserId) {
    linkedUserId = verifiedLegacyUserId
  }

  const userId = await resolveOrCreateTelegramGuestUser({
    linkedUserId,
    telegramUserId,
    telegramUserName,
    chatId,
    firstName,
  })

  await upsertTelegramBinding({
    userId,
    chatId,
    telegramUserId,
    telegramUserName,
    firstName,
  })

  ;(ctx.state as { userId?: string }).userId = userId

  const state = await resolveCoreUserState(userId)
  ;(ctx.state as { userState?: CoreUserState }).userState = state

  const decisionEvent = payload && isLeadMagnetPayload(payload) ? 'lead_magnet_entry' : 'start'
  const { decision } = await resolveDecision(
    userId,
    decisionEvent,
    payload ? { payload } : undefined,
  )

  await syncAccessAwareChatEntryPoints(chatId, userId)

  if (payload && isContentMachinePayload(payload)) {
    await trackContentPayloadEntry(userId, payload, 'telegram', state)
  }

  if (payload && isLeadMagnetPayload(payload)) {
    if (await hasOpenStarwayAccess(userId)) {
      await sendProductPriorityChoice(ctx, userId, payload)
      return
    }

    const started = await startLeadMagnet(userId, chatId, payload)
    if (!started) {
      await sendStateMenu(ctx, userId)
    }
    return
  }

  if (await renderTelegramDecision(ctx, decision, firstName)) {
    return
  }

  if (state === 'WAITLIST' || state === 'ONBOARDING') {
    await sendWaitlist(ctx)
    return
  }

  if (state === 'PAUSED') {
    await ctx.reply(
      [
        `${firstName}, доступ до ABsystemа зараз на паузі.`,
        '',
        'Історія, звіти й аналіз за попередній період уже збережені.',
        'Щоб продовжити ранкові та вечірні сесії, віднови підписку.',
      ].join('\n'),
      {
        reply_markup: trialExpiredKeyboard().reply_markup,
      },
    )
    return
  }

  if (isCoreLockedState(state)) {
    return
  }

  await sendProduct(ctx)
}
