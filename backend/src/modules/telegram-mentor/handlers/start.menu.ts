import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import { stankeyContent } from '@/products/stankey/config/stankey.content.js'
import type { Context } from 'telegraf'
import { getTelegramProductContext } from '@/content/telegram.product-context.js'
import { resolveBehavioralContinuity } from '../../../core/continuity/behavioralContinuity.js'
import { resolveDecision } from '../../../core/decision/decision.resolver.js'
import { buildAbsystemStartFlow } from '../../../core/flow-builder/flowBuilder.js'
import { resolveRelationshipMemory } from '../../../core/memory/relationshipMemory.js'
import { buildRelationshipContinuityLead, resolveConversationProfile } from '../../../core/state-machine/conversationPresentation.js'
import { deliverTelegramFlow } from '../../../core/transport/telegramTransport.js'
import { prisma } from '../../../db/client.js'
import { bot } from '../../../lib/telegram.js'
import { trackEvent } from '../../events/service.js'
import { getUserAccessState } from '../../subscriptions/payments/focus.access.js'
import { isExplicitWaitlistUser, resolveLinkedUserIdFromContext, resolveUserState as resolveCoreUserState, type UserState as CoreUserState } from '../core/state.service.js'
import { sendWaitlist } from '../flows/onboarding.flow.js'
import { getTelegramAppUrl, openAppKeyboard, withDevTestPaymentButton } from '../keyboards.js'
import { renderTelegramDecision } from '../renderers/decisionTelegram.js'
import { resolveTelegramAccessOrchestration, resolveTelegramRoomLaunch } from '../services/product-room.service.js'
import { resolveTelegramProductSummary } from '../services/productSummary.service.js'
import { getOrCreateFocusInviteLink } from '@/products/focus/payments/inviteLink.js'
import { planMessage } from '../conversation/delivery/planDelivery.js'
import { type StartContextRecord, type StartScenario, type TelegramInlineButton, resolveReferralButton } from './start.shared.js'
import { resolveStartScenario } from './start.recovery.js'
function toPlatformProductId(productKey: 'FOCUS' | 'STANKEY' | 'ABsystem') {
  return productKey === 'STANKEY'
    ? 'stankey'
    : productKey === 'FOCUS'
      ? 'focus'
      : 'absystem'
}
function resolvePolicyCtaLabel(
  raw: string,
  productId: 'stankey' | 'focus' | 'absystem'
) {
  const context = getTelegramProductContext(productId)
  return raw in context.cta ? context.cta[raw as keyof typeof context.cta] : raw
}
function buildPolicyButton(
  product: Awaited<
    ReturnType<typeof resolveTelegramProductSummary>
  >['allProducts'][number]
) {
  const productId = toPlatformProductId(product.key)
  const label = resolvePolicyCtaLabel(
    String(product.behaviorPolicy.primaryCta),
    productId
  )
  if (
    product.behaviorPolicy.primaryCta === 'activateGift' ||
    product.activationState === 'gifted' ||
    product.activationState === 'bonus'
  ) {
    return { text: label, callback_data: 'restart_flow' } as const
  }
  if (product.behaviorPolicy.primaryCta === 'restore') {
    return product.paymentUrl
      ? ({ text: label, url: product.paymentUrl } as const)
      : ({ text: label, callback_data: 'open_paid_checkout' } as const)
  }
  if (product.behaviorState === 'mentor_candidate') {
    return { text: label, callback_data: 'continue_ai_mentor' } as const
  }
  if (product.behaviorPolicy.primaryCta === 'activateTrial') {
    return { text: label, callback_data: 'start_trial' } as const
  }
  if (product.behaviorPolicy.primaryCta === 'waitlist') {
    return { text: label, callback_data: 'waitlist_early_access' } as const
  }
  if (product.openUrl) {
    return { text: label, web_app: { url: product.openUrl } } as const
  }
  if (product.paymentUrl) {
    return { text: label, url: product.paymentUrl } as const
  }
  return { text: label, callback_data: 'return_main_menu' } as const
}
async function getProductPolicy(
  userId: string,
  summary?: Awaited<ReturnType<typeof resolveTelegramProductSummary>>
) {
  const resolvedSummary =
    summary ?? (await resolveTelegramProductSummary(userId))
  const primaryProduct =
    resolvedSummary.primary ?? resolvedSummary.allProducts[0] ?? null
  return {
    summary: resolvedSummary,
    product: primaryProduct,
    policy: primaryProduct?.behaviorPolicy ?? null,
  }
}
async function sendPolicyMenu(
  ctx: Context,
  userId: string,
  summary?: Awaited<ReturnType<typeof resolveTelegramProductSummary>>,
  relationship?: Awaited<ReturnType<typeof resolveRelationshipMemory>> | null
) {
  const { product, policy } = await getProductPolicy(userId, summary)
  if (!product || !policy) {
    await sendWaitlist(ctx)
    return
  }
  if (product.key === 'ABsystem') {
    const continuity = await resolveBehavioralContinuity(userId)
    await deliverTelegramFlow(ctx, buildAbsystemStartFlow(continuity), 'reply')
    return
  }
  const continuityLead =
    relationship && relationship.available
      ? buildRelationshipContinuityLead(
          resolveConversationProfile(
            product.key === 'FOCUS'
              ? 'focus'
              : product.key === 'STANKEY'
                ? 'stankey'
                : 'absystem'
          ),
          relationship
        )
      : []
  const text =
    product.behaviorState === 'low_activity' && policy.mentorMessage
      ? [
          ...continuityLead,
          '',
          policy.mentorMessage,
          ...stankeyContent.telegram.product.continueFromCurrentLesson(
            product.progressState.currentLesson
          ),
        ].join('\n')
      : product.behaviorState === 'upsell_ready' && policy.softUpsellMessage
        ? [
            ...continuityLead,
            '',
            product.lines.join('\n'),
            '',
            policy.softUpsellMessage,
          ].join('\n')
        : [
            ...continuityLead,
            ...(continuityLead.length ? [''] : []),
            product.lines.join('\n'),
          ].join('\n')
  await planMessage(ctx, 'ctx.reply', 'start_policy_menu', text, {
    inline_keyboard: withDevTestPaymentButton([[buildPolicyButton(product)]]),
  })
}
export async function sendStateMenu(
  ctx: Context,
  userId: string
): Promise<void> {
  const { decision } = await resolveDecision(userId, 'menu_open')
  const firstName = ctx.from?.first_name ?? ''
  const relationship = await resolveRelationshipMemory(userId).catch(() => null)
  if (decision.nextAction === 'show_trial_offer') {
    const today = new Date().toISOString().slice(0, 10)
    const dedupeKey = `start_trial_welcome_${userId}_${today}`
    const existing = await prisma.runtimeOutbox.findUnique({
      where: { dedupeKey },
      select: { id: true },
    })
    if (existing) {
      await sendPolicyMenu(ctx, userId, undefined, relationship)
      return
    }
  }
  if (await renderTelegramDecision(ctx, decision, firstName)) {
    return
  }
  await sendPolicyMenu(ctx, userId, undefined, relationship)
}
const START_SCENARIO_CALLBACKS: Record<StartScenario, string> = {
  FIRST_TIME_USER: 'ab_test:start',
  POST_TEST: 'open_focus_portal',
  FOCUS_PARTICIPANT: 'open_platform',
  ACTIVE_PLATFORM: 'open_platform',
  DAILY_GAP: 'open_platform',
  MEDIUM_GAP: 'open_platform',
  LONG_GAP: 'open_platform',
  REPEATED_ROLLBACK: 'open_platform',
}
function resolveStartScenarioText(
  scenario: StartScenario,
  context: StartContextRecord
): string {
  switch (scenario) {
    case 'ACTIVE_PLATFORM':
      return absystemContent.START_FLOWS.ACTIVE_PLATFORM.text(
        context.lastGoal ?? context.lastAction ?? ''
      )
    case 'REPEATED_ROLLBACK':
      return absystemContent.START_FLOWS.REPEATED_ROLLBACK.text(
        context.lastAction ?? context.lastGoal ?? ''
      )
    default:
      return absystemContent.START_FLOWS[scenario].text as string
  }
}
async function sendStartScenarioMenu(
  ctx: Context,
  userId: string,
  context: StartContextRecord
): Promise<void> {
  const scenario = resolveStartScenario(context)
  const copy = absystemContent.START_FLOWS[scenario]
  const text = resolveStartScenarioText(scenario, context)
  const referralButton = resolveReferralButton(context, userId)
  const buttons: Array<Array<TelegramInlineButton>> = [
    [
      {
        text: copy.cta,
        callback_data: START_SCENARIO_CALLBACKS[scenario],
      },
    ],
  ]
  if (scenario === 'FOCUS_PARTICIPANT') {
    const inviteLink = await getOrCreateFocusInviteLink(userId).catch(() => null)
    if (inviteLink) {
      buttons.push([{ text: 'ПЕРЕЙТИ В КАНАЛ ФОКУС', url: inviteLink }])
    }
  }
  if (referralButton) {
    buttons.push([referralButton])
  }
  await planMessage(ctx, 'ctx.reply', 'start_scenario_menu', text, {
    inline_keyboard: buttons,
  })
}
async function handleStankeyStart(
  ctx: Context,
  userId: string,
  payload: string,
  firstName: string
): Promise<void> {
  const rolloutEnabled = process.env.STANKEY_ROLLOUT_ENABLED !== 'false'
  const explicitWaitlist =
    !rolloutEnabled || (await isExplicitWaitlistUser(userId))
  const summary = await resolveTelegramProductSummary(userId)
  const relationship = await resolveRelationshipMemory(
    userId,
    summary.primary?.key === 'FOCUS'
      ? 'focus'
      : summary.primary?.key === 'STANKEY'
        ? 'stankey'
        : 'absystem'
  ).catch(() => null)
  const orchestration = resolveTelegramAccessOrchestration({
    summary: {
      activeProducts: summary.activeProducts,
      trialProducts: summary.trialProducts,
      pausedProducts: summary.pausedProducts,
      products: summary.products.map((product) => ({
        key: product.key,
        state: product.state,
        accessSource: product.accessSource,
      })),
      primary: summary.primary
        ? {
            key: summary.primary.key,
            state: summary.primary.state,
          }
        : null,
    },
    explicitWaitlist,
    rolloutEnabled,
    payload,
  })
  const roomLaunch = resolveTelegramRoomLaunch({
    payload,
    summary: {
      activeProducts: summary.activeProducts,
      trialProducts: summary.trialProducts,
      pausedProducts: summary.pausedProducts,
      products: summary.products.map((product) => ({
        key: product.key,
        state: product.state,
        accessSource: product.accessSource,
      })),
      primary: summary.primary
        ? {
            key: summary.primary.key,
            state: summary.primary.state,
          }
        : null,
    },
    firstName,
  })
  console.info('[STANKEY_START_FLOW]', { userId, orchestration, roomLaunch })
  const runtimeKey = `tg:start:${userId}`
const existingRuntime = await prisma.runtimeOutbox.findFirst({
  where: {
    dedupeKey: runtimeKey,
    createdAt: {
      gte: new Date(Date.now() - 1000 * 15),
    },
  },
})
if (existingRuntime) {
  console.warn('[TG START] duplicate prevented', {
    userId,
    runtimeKey,
  })
  return
}
await prisma.runtimeOutbox.create({
  data: {
    userId,
    type: 'telegram_start_flow',
    scope: 'telegram',
    source: 'telegram_start',
    status: 'PENDING',
    dedupeKey: runtimeKey,
    payload: {
      payload,
    },
  },
})
}
async function hasOpenStarwayAccess(userId: string | null): Promise<boolean> {
  if (!userId) return false
  try {
    const access = await getUserAccessState(userId)
    return (
      access.state === 'FOCUS_ACTIVE' ||
      access.isActive === true ||
      access.hasFocus === true
    )
  } catch {
    return false
  }
}
function withTimeout<T>(promise: Promise<T>, ms = 4000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)
    ),
  ])
}

export async function syncAccessAwareChatMenuButton(
  chatId: string | number,
  userId: string | null
): Promise<void> {
  const normalizedChatId = typeof chatId === 'string' ? Number(chatId) : chatId
  if (!Number.isFinite(normalizedChatId)) return
  try {
    await withTimeout(bot.telegram.setChatMenuButton({
      chatId: normalizedChatId,
      menuButton: { type: 'default' },
    }))
  } catch {
    // silent — timeout or API error
  }
}
export async function syncAccessAwareChatCommands(
  chatId: string | number,
  userId: string | null
): Promise<void> {
  const normalizedChatId = typeof chatId === 'string' ? Number(chatId) : chatId
  if (!Number.isFinite(normalizedChatId)) return
  void userId
  try {
    await withTimeout(bot.telegram.setMyCommands(
      [{ command: 'privacy', description: absystemContent.commands.privacy }],
      {
        scope: { type: 'chat', chat_id: normalizedChatId },
      }
    ))
  } catch {
    // silent — timeout or API error
  }
}
export async function syncAccessAwareChatEntryPoints(
  chatId: string | number,
  userId: string | null
): Promise<void> {
  await Promise.all([
    syncAccessAwareChatMenuButton(chatId, userId),
    syncAccessAwareChatCommands(chatId, userId),
  ])
}
export async function getAccessAwareAppReplyMarkupForContext(
  ctx: Context
): Promise<ReturnType<typeof openAppKeyboard>['reply_markup'] | undefined> {
  const userId = await resolveLinkedUserIdFromContext(ctx)
  if (!(await hasOpenStarwayAccess(userId))) {
    return undefined
  }
  return openAppKeyboard(
    '/miniapp?startapp=ai',
    'Starway'
  ).reply_markup
}
async function trackLeadPayloadEntry(
  userId: string,
  payload: string,
  accessState: CoreUserState
) {
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
async function sendProductPriorityChoice(
  ctx: Context,
  userId: string,
  payload: string
) {
  await trackLeadPayloadEntry(
    userId,
    payload,
    await resolveCoreUserState(userId)
  )
  const replyMarkup = openAppKeyboard(
    '/miniapp?startapp=ai',
    'Starway'
  ).reply_markup
  await planMessage(
    ctx,
    'ctx.reply',
    'start_product_priority_choice',
    stankeyContent.telegram.product.productPriorityLines.join('\n'),
    {
      inline_keyboard: [
        [
          {
            text: stankeyContent.telegram.buttons.continueMaterial,
            callback_data: 'lm_continue_material',
          },
        ],
      ],
    },
  )
}
function buildSyncNotice(): string {
  return [
    '🔒 **Синхронізація**',
    'Прогрес тесту синхронізується між Telegram і Web, якщо ти заходиш в один і той самий акаунт (один `userId`).',
  ].join('\n')
}
