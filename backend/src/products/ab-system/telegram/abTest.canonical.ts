import type { Prisma } from '@starway/db/prisma-client'
import type { Context } from 'telegraf'

import {
  buildAbTestProgressPatch,
  resolveAbTestStageForAction,
} from '../../../core/state-machine/abTestFoundation.js'
import {
  resolveCanonicalCtaId,
  resolveCanonicalMessageKeyByCtaId,
  type CanonicalCtaId,
} from '../../../core/state-machine/ctaFoundation.js'
import { resolveUserLifecycle } from '../../../modules/flow-control/service.js'
import { absystemButtons } from '../config/absystem.content.js'
import { abTestPaymentsContent } from '../content/abTest.payments.js'
import { trackAbTestEvent } from './abTest.analytics.js'
import { loadAbTestProgress, saveAbTestProgress } from './abTest.progress.js'
import { scheduleFollowups } from './abTest.scheduler.js'

export async function observeAbTestCanonicalAction(
  ctx: Context,
  action: string,
): Promise<boolean> {
  const userId = (ctx.state as { userId?: string | null }).userId ?? null
  if (!userId) {
    return false
  }

  const canonical = resolveCanonicalCtaId(action)
  if (!canonical) {
    return false
  }

  const current = await loadAbTestProgress(userId)
  const lifecycle = await resolveUserLifecycle(userId).catch(() => null)
  const lifecycleStage = lifecycle?.state ?? null

  if (
    current.last_callback_key === action &&
    current.stage === resolveAbTestStageForAction(canonical)
  ) {
    return false
  }

  if (
    canonical === 'OPEN_PLATFORM' &&
    current.stage !== 'S7_PLATFORM_INVITE' &&
    current.stage !== 'S8_PLATFORM_READY'
  ) {
    await trackAbTestEvent({
      userId,
      type: 'AB_TEST_UPGRADE_GUARDRAIL_BLOCKED',
      state: current.stage,
      payload: {
        action,
        lifecycle_stage: lifecycleStage,
      } satisfies Prisma.JsonObject,
    })
    return false
  }

  let next = current
  const stage = resolveAbTestStageForAction(canonical)

  if (canonical === 'OPEN_FOCUS') {
    next = buildAbTestProgressPatch(next, {
      stage,
      status: 'active',
      focus_opened_at: next.focus_opened_at ?? new Date().toISOString(),
      last_callback_key: action,
      last_event_at: new Date().toISOString(),
    })
    next = await scheduleFollowups(userId, next, 'S3_TEST_RESULT')
  } else if (canonical === 'PAY_FOCUS_1M' || canonical === 'PAY_FOCUS_3M') {
    next = buildAbTestProgressPatch(next, {
      stage,
      status: 'active',
      payment_started_at: next.payment_started_at ?? new Date().toISOString(),
      last_callback_key: action,
      last_event_at: new Date().toISOString(),
    })
    next = await scheduleFollowups(userId, next, 'S5_PAYMENT')
  } else if (canonical === 'JOIN_CHANNEL' || canonical === 'OPEN_ZOOM') {
    next = buildAbTestProgressPatch(next, {
      stage,
      status: 'active',
      zoom_registered_at: next.zoom_registered_at ?? new Date().toISOString(),
      last_callback_key: action,
      last_event_at: new Date().toISOString(),
    })
    next = await scheduleFollowups(userId, next, 'S6_ZOOM')
  } else if (canonical === 'OPEN_PLATFORM') {
    next = buildAbTestProgressPatch(next, {
      stage,
      status: 'active',
      platform_invited_at: next.platform_invited_at ?? new Date().toISOString(),
      last_callback_key: action,
      last_event_at: new Date().toISOString(),
    })
    next = await scheduleFollowups(userId, next, 'S7_PLATFORM_INVITE')
  } else if (canonical === 'CONTINUE_FLOW') {
    next = buildAbTestProgressPatch(next, {
      stage,
      status: 'active',
      platform_ready_at: next.platform_ready_at ?? new Date().toISOString(),
      last_callback_key: action,
      last_event_at: new Date().toISOString(),
    })
  } else if (canonical === 'RESTORE_PROGRESS' || canonical === 'START_TEST') {
    next = buildAbTestProgressPatch(next, {
      stage,
      status: next.status === 'completed' ? 'completed' : 'active',
      last_callback_key: action,
      last_event_at: new Date().toISOString(),
    })
  }

  await saveAbTestProgress(userId, next)
  await trackAbTestEvent({
    userId,
    type: 'AB_TEST_CTA_INTERACTION',
    state: next.stage,
    payload: {
      cta_id: canonical,
      source_message: resolveCanonicalMessageKeyByCtaId(canonical),
      source_stage: current.stage,
      target_stage: next.stage,
      readiness_level:
        next.stage === 'S7_PLATFORM_INVITE' ||
        next.stage === 'S8_PLATFORM_READY'
          ? 'high'
          : next.stage === 'S5_PAYMENT'
            ? 'medium'
            : 'low',
      lifecycle_stage: lifecycleStage,
    } satisfies Prisma.JsonObject,
  })

  return false
}

export function resolveAbTestButtonLabel(ctaId: CanonicalCtaId) {
  switch (ctaId) {
    case 'START_TEST':
      return absystemButtons.startTest
    case 'OPEN_FOCUS':
      return absystemButtons.joinFocus
    case 'PAY_FOCUS_1M':
      return abTestPaymentsContent.ctaMonthly
    case 'PAY_FOCUS_3M':
      return abTestPaymentsContent.ctaQuarterly
    case 'JOIN_CHANNEL':
      return absystemButtons.joinChannel
    case 'OPEN_ZOOM':
      return absystemButtons.openZoom
    case 'OPEN_PLATFORM':
      return absystemButtons.openPlatform
    case 'CONTINUE_FLOW':
      return absystemButtons.continue
    case 'RESTORE_PROGRESS':
      return absystemButtons.restoreProgress
    default:
      return String(ctaId)
  }
}
