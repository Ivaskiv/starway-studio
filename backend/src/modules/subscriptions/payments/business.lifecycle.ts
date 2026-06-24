import { abTestFocusContent } from '@/products/ab-system/content/abTest.focus.js'
import { abTestZoomContent } from '@/products/ab-system/content/abTest.zoom.js'
import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import {
  FOCUS_DOJIM_TIMER_IDS,
  LIFECYCLE_STATE_ORDER,
  type FocusActivationPlan,
  type PostZoomBridgePlan,
  type UpgradeOfferPlan,
} from './business.types.js'
import { buildAbsystemAiUpgradeCheckoutUrl } from './business.checkout.js'

function parseOptionalDate(input?: string | Date | null): Date | null {
  if (!input) {
    return null
  }

  const date =
    input instanceof Date ? new Date(input.getTime()) : new Date(input)
  return Number.isFinite(date.getTime()) ? date : null
}

export function resolveFocusChannelInviteLink(input?: string | null) {
  const link =
    input?.trim() ||
    process.env.FOCUS_TELEGRAM_CHANNEL_INVITE_LINK?.trim() ||
    process.env.FOCUS_CHANNEL_INVITE_URL?.trim() ||
    process.env.TELEGRAM_FOCUS_CHANNEL_INVITE_URL?.trim() ||
    process.env.FOCUS_TELEGRAM_INVITE_URL?.trim() ||
    process.env.TELEGRAM_FOCUS_INVITE_URL?.trim() ||
    process.env.TELEGRAM_PUBLIC_FRONTEND_URL?.trim() ||
    'https://t.me/'

  if (!link || link === 'https://t.me/') {
    console.warn(
      '🚨 [PAYMENT:INVITE] Resolved invite link is empty or root domain. Check environment variables.'
    )
  }

  return link
}

export function simulateFocusActivation(
  userId: string,
  input: {
    nextZoomAt?: string | Date | null
    channelInviteLink?: string | null
  } = {}
): FocusActivationPlan {
  const nextZoomAt = parseOptionalDate(input.nextZoomAt)
  const channelInviteLink = resolveFocusChannelInviteLink(
    input.channelInviteLink
  )
  const preZoomReminders = nextZoomAt
    ? [
        {
          timerId: 'ZOOM_REMINDER_24H' as const,
          sendAt: new Date(nextZoomAt.getTime() - 24 * 60 * 60 * 1000),
          body: abTestZoomContent.reminders.preZoom24h,
          ctaText: abTestZoomContent.cta,
        },
        {
          timerId: 'ZOOM_REMINDER_2H' as const,
          sendAt: new Date(nextZoomAt.getTime() - 2 * 60 * 60 * 1000),
          body: abTestZoomContent.reminders.preZoom2h,
          ctaText: abTestZoomContent.cta,
        },
      ]
    : []

  return {
    userId,
    lifecycleState: 'focus_active',
    welcomeMessageSent: true,
    welcomeText: abTestFocusContent.welcome.body,
    welcomeCtaText: abTestFocusContent.welcome.cta,
    channelInviteLink,
    channelLinkPresent: Boolean(channelInviteLink),
    preZoomScheduled: Boolean(nextZoomAt),
    preZoomReminders,
    dojimsCancelled: FOCUS_DOJIM_TIMER_IDS,
  }
}

export function schedulePostZoomBridge(
  userId: string,
  input: {
    zoomCount: number
    lifecycle: string | null | undefined
    bridgeSentAt?: string | Date | null
    productKey?: string | null
  }
): PostZoomBridgePlan {
  const paymentUrl = buildAbsystemAiUpgradeCheckoutUrl(userId)
  const canBridge =
    input.productKey === 'FOCUS' &&
    !input.bridgeSentAt &&
    input.zoomCount >= 1 &&
    input.zoomCount <= 2

  return {
    userId,
    scheduled: canBridge,
    delayMs: 24 * 60 * 60 * 1000,
    ctaText: absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_SOFT_CTA,
    paymentUrl,
  }
}

export function scheduleUpgradeOffer(
  userId: string,
  input: {
    zoomCount: number
    lifecycle: string | null | undefined
    bridgeSentAt?: string | Date | null
    hardBridgeSentAt?: string | Date | null
    productKey?: string | null
  }
): UpgradeOfferPlan {
  const paymentUrl = buildAbsystemAiUpgradeCheckoutUrl(userId)
  const scheduled =
    input.productKey === 'FOCUS' &&
    Boolean(input.bridgeSentAt) &&
    !input.hardBridgeSentAt &&
    input.zoomCount >= 4

  return {
    userId,
    scheduled,
    text: absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_HARD,
    ctaText: absystemContent.UPGRADE_FLOWS.FOCUS_TO_AI_HARD_CTA,
    paymentUrl,
    delayMs: 0,
  }
}

export function resolveLifecycleUpgrade(
  current: string | null | undefined,
  target: string
): string {
  const currentRank = LIFECYCLE_STATE_ORDER.get((current ?? 'new').trim()) ?? 0
  const targetRank = LIFECYCLE_STATE_ORDER.get(target.trim()) ?? currentRank
  return currentRank >= targetRank ? (current ?? 'new') : target
}
