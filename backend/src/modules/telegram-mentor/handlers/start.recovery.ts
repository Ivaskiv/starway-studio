import { absystemContent } from '@/products/absystem/config/content.js'
import { stankeyContent } from '@/products/stankey/config/stankey.content.js'
import type { Context } from 'telegraf'

import { getTelegramProductContext } from '@/content/telegram.product-context.js'
import { sendWaitlist } from '../flows/onboarding.flow.js'
import { withDevTestPaymentButton } from '../keyboards.js'
import { planMessage } from '../conversation/delivery/planDelivery.js'
import { type InterruptionRecoveryType, type StartContextRecord, type StartScenario, type StateMessage, type TelegramInlineButton, type UserContext, type UserState, asString, isSameUtcDay, normalizeMemoryFlowContent, resolveReferralButton } from './start.shared.js'
import { resolveComeback, resolveStartContext } from './start.context.js'
import { resolveUserLifecycle as resolveRuntimeLifecycle } from '../../users/runtime/resolveUserLifecycle.js'

function resolveInterruptionRecoveryFromContext(context: StartContextRecord): {
  type: InterruptionRecoveryType
  context: Record<string, string | number>
} | null {
  if (context.primaryProductKey === 'STANKEY') {
    return null
  }

  const now = new Date()
  const latestDailyCycle = context.latestDailyCycleDate
  if (
    latestDailyCycle &&
    isSameUtcDay(latestDailyCycle, now) &&
    !context.latestDailyCycleSummary
  ) {
    return {
      type: 'DAILY_INCOMPLETE',
      context: {},
    }
  }

  if (context.wheelAnsweredCount > 0 && context.wheelAnsweredCount < 8) {
    return {
      type: 'WHEEL_INCOMPLETE',
      context: { n: context.wheelAnsweredCount },
    }
  }

  if (
    context.latestGoalsSetAt &&
    isSameUtcDay(context.latestGoalsSetAt, now) &&
    context.latestGoalsCount > 0 &&
    context.latestGoalsCompleted < context.latestGoalsCount
  ) {
    const remaining = Math.max(
      0,
      context.latestGoalsCount - context.latestGoalsCompleted
    )
    return {
      type: 'GOALS_INCOMPLETE',
      context: {
        n: context.latestGoalsCompleted,
        remaining,
      },
    }
  }

  return null
}

export async function resolveInterruptionRecovery(
  userId: string,
  context?: StartContextRecord | null
): Promise<{
  type: InterruptionRecoveryType
  context: Record<string, string | number>
} | null> {
  const resolvedContext = context ?? (await resolveStartContext(userId))
  if (!resolvedContext) {
    return null
  }

  return resolveInterruptionRecoveryFromContext(resolvedContext)
}

async function sendMemoryFlow(
  ctx: Context,
  flow: {
    text: string
    cta: string
    ctaUrl?: string | null
    callbackData?: string | null
  },
  extraButton?: { text: string; url: string } | null
): Promise<void> {
  const buttons: Array<Array<TelegramInlineButton>> = [
    [
      flow.ctaUrl
        ? { text: flow.cta, url: flow.ctaUrl }
        : {
            text: flow.cta,
            callback_data: flow.callbackData ?? 'return_main_menu',
          },
    ],
  ]

  if (extraButton) {
    buttons.push([{ text: extraButton.text, url: extraButton.url }])
  }

  await planMessage(ctx, 'ctx.reply', 'start_memory_flow', flow.text, {
    inline_keyboard: buttons,
  })
}

export async function handleMemoryAwareStartFlow(
  ctx: Context,
  context: StartContextRecord,
  userId?: string
): Promise<boolean> {
  if (context.primaryProductKey === 'STANKEY') {
    return false
  }

  const memoryFlow = resolveMemoryFlowCopy(context)
  if (!memoryFlow) {
    return false
  }

  await sendMemoryFlow(
    ctx,
    memoryFlow,
    userId ? resolveReferralButton(context, userId) : null
  )
  return true
}

function resolveMemoryFlowCopy(context: StartContextRecord): {
  text: string
  cta: string
  ctaUrl?: string | null
  callbackData?: string | null
} | null {
  const interruption = resolveInterruptionRecoveryFromContext(context)
  if (interruption) {
    if (interruption.type === 'WHEEL_INCOMPLETE') {
      return normalizeMemoryFlowContent(
        absystemContent.INTERRUPTION_RECOVERY.WHEEL_INCOMPLETE(
          Number(interruption.context.n ?? 0)
        )
      )
    }

    if (interruption.type === 'GOALS_INCOMPLETE') {
      return normalizeMemoryFlowContent(
        absystemContent.INTERRUPTION_RECOVERY.GOALS_INCOMPLETE(
          Number(interruption.context.n ?? 0),
          Number(interruption.context.remaining ?? 0)
        )
      )
    }

    return normalizeMemoryFlowContent(
      absystemContent.INTERRUPTION_RECOVERY[interruption.type]
    )
  }

  const comeback = resolveComeback({
    lastActivityDays: context.inactivityDays ?? 0,
    lifecycle: context.lifecycle,
    primaryProductKey: context.primaryProductKey,
  })

  if (comeback) {
    const copy = absystemContent.COMEBACK_FLOWS[comeback]
    if (typeof copy === 'function') {
      const action =
        context.lastAction ??
        context.lastGoal ??
        context.repeatedPostponedActions?.[0] ??
        ''
      return normalizeMemoryFlowContent(copy(action))
    }
    return normalizeMemoryFlowContent(copy)
  }

  if (
    context.lifecycle === 'platform_active' &&
    (context.repeatedPostponedActions?.length ?? 0) >= 2
  ) {
    return normalizeMemoryFlowContent({
      text: absystemContent.START_FLOWS.REPEATED_ROLLBACK.text(
        context.lastAction ?? context.lastGoal ?? ''
      ),
      cta: absystemContent.START_FLOWS.REPEATED_ROLLBACK.cta,
      callbackData: 'open_platform',
    })
  }

  return null
}

export function resolveStartScenario(user: UserContext): StartScenario {
  const lifecycle = resolveRuntimeLifecycle({
    currentState: user.lifecycle,
    currentStep: null,
    funnelStage: null,
    lifecycleState: null,
  }).value
  const testResultType = asString(user.testResultType)
  const inactivityDays =
    typeof user.inactivityDays === 'number' ? user.inactivityDays : 0
  const repeatedPostponedActions = user.repeatedPostponedActions ?? []

  if (!lifecycle || lifecycle === 'new') {
    return 'FIRST_TIME_USER'
  }

  if (
    testResultType &&
    lifecycle !== 'focus_active' &&
    lifecycle !== 'platform_active'
  ) {
    return 'POST_TEST'
  }

  if (lifecycle === 'focus_active') {
    return 'FOCUS_PARTICIPANT'
  }

  if (lifecycle === 'platform_active' && inactivityDays < 3) {
    return 'ACTIVE_PLATFORM'
  }

  if (
    lifecycle === 'platform_active' &&
    inactivityDays >= 3 &&
    inactivityDays < 7
  ) {
    return 'DAILY_GAP'
  }

  if (
    lifecycle === 'platform_active' &&
    inactivityDays >= 7 &&
    inactivityDays < 30
  ) {
    return 'MEDIUM_GAP'
  }

  if (lifecycle === 'platform_active' && inactivityDays >= 30) {
    return 'LONG_GAP'
  }

  if (repeatedPostponedActions.length >= 2) {
    return 'REPEATED_ROLLBACK'
  }

  return testResultType ? 'POST_TEST' : 'FIRST_TIME_USER'
}

export async function getStateMessage(
  state: UserState,
  _name = '',
  mentor: {
    insight?: string | null
    stage?: string | null
    blocker?: string | null
  } | null = null,
  trialDay?: string,
  _nudgeCount = 0
): Promise<StateMessage> {
  const roomContext = getTelegramProductContext('stankey')
  const insight = mentor?.insight ? `\n\n${mentor.insight}` : ''

  switch (state) {
    case 'lm_started':
    case 'lm_engaged':
    case 'lm_almost_done':
    case 'lm_completed':
    case 'lm_exited':
      return {
        text: stankeyContent.telegram.product.activeLeadMagnet('', insight),
        buttons: [
          [
            {
              text: stankeyContent.telegram.buttons.continue,
              callback_data: 'lm_continue',
            },
          ],
        ],
      }
    case 'in_trial':
      return {
        text: stankeyContent.telegram.product.activeTrial(
          trialDay,
          '',
          insight
        ),
        buttons: [
          [
            {
              text: stankeyContent.telegram.buttons.continue,
              callback_data: 'continue_ai_mentor',
            },
          ],
        ],
      }
    case 'subscribed':
      return {
        text: stankeyContent.telegram.product.activeSubscription('', insight),
        buttons: [
          [
            {
              text: stankeyContent.telegram.buttons.continue,
              callback_data: 'continue_ai_mentor',
            },
          ],
        ],
      }
    case 'paused':
      return {
        text: roomContext.copy.restore.join('\n') + insight,
        buttons: withDevTestPaymentButton([
          [
            {
              text: roomContext.cta.restore,
              callback_data: 'open_paid_checkout',
            },
          ],
        ]),
      }
    case 'active':
      return {
        text: roomContext.copy.welcome.join('\n') + insight,
        buttons: [
          [
            {
              text: roomContext.cta.continue,
              callback_data: 'continue_ai_mentor',
            },
          ],
        ],
      }
    case 'new':
    default:
      return {
        text: roomContext.copy.welcome.join('\n') + insight,
        buttons: [
          [
            {
              text: roomContext.cta.activateTrial,
              callback_data: 'start_trial',
            },
          ],
        ],
      }
  }
}

export async function sendEntryOffer(ctx: Context): Promise<void> {
  await sendWaitlist(ctx)
}
