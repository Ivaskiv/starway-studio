import type { Context } from 'telegraf'

import { getAccessAwareAppReplyMarkupForContext } from './start.js'
import { renderDecisionUnlessAllowed } from '../services/delivery/decision-transport.js'
import { resolveBehavioralContinuity, type BehavioralContinuityResolution } from '../../../core/continuity/behavioralContinuity.js'
import { buildAbsystemStatusFlow } from '../../../core/flow-builder/flowBuilder.js'
import { deliverTelegramFlow } from '../../../core/transport/telegramTransport.js'
import { absystemContent } from '@/products/absystem/config/content.js'
import { planMessage } from '../conversation/delivery/planDelivery.js'

export async function handleStatus(ctx: Context) {
  const chatId = String(ctx.chat?.id ?? '')
  const userId = (ctx.state as { userId?: string | null }).userId ?? null
  if (!chatId) return

  try {
    if (await renderDecisionUnlessAllowed(ctx, 'status_requested', [
      'show_product',
      'resume_session',
      'show_offer',
      'show_trial_offer',
      'show_winback',
      'show_paywall',
      'show_funnel_step',
      'show_funnel',
    ])) {
      return
    }
    const replyMarkup = await getAccessAwareAppReplyMarkupForContext(ctx)
    const continuity = userId
      ? await resolveBehavioralContinuity(userId)
      : null
    if (continuity) {
      await deliverTelegramFlow(ctx, buildAbsystemStatusFlow(continuity), 'reply')
      return
    }

    await planMessage(
      ctx,
      'ctx.reply',
      'status_fallback_intro',
      [absystemContent.status.title, '', absystemContent.status.intro].join('\n'),
      replyMarkup,
    )
  } catch {
    const fallback: BehavioralContinuityResolution = {
      snapshot: {
        focusParticipation: false,
        repeatedRollback: false,
        dailyCycleInterrupted: false,
        momentumLevel: 'low',
      },
      signals: {
        unresolvedGoal: null,
        repeatedPostponedAction: null,
        wheelImbalance: null,
        interruptedDailyCycles: false,
        repeatedRollbackPatterns: false,
        focusParticipation: false,
        lastZoomTopic: null,
        inactiveDuration: null,
        unfinishedStrategyNode: null,
        repeatedHesitationPattern: null,
        repeatedUnfinishedDecision: null,
        lastMeaningfulMovement: null,
        emotionalOverload: null,
        movementInstability: 'low',
      },
      interpretation: {
        priority: 'genericFallback',
        interpretation: {
          mainPattern: 'generic',
          priority: 'genericFallback',
          riskLevel: 'low',
          movementState: {
            stalledAfterClarity: false,
            repeatedAvoidance: false,
            unstableRhythm: false,
            unresolvedDecisionLoop: false,
            overloadedActionState: false,
            interruptedMomentum: false,
          },
          recognition: 'Я бачу, де рух зупинився.',
          interpretation: 'Не треба починати спочатку — достатньо повернутись до найближчої дії.',
          nextMovement: 'Почнімо з найближчої простої дії.',
          recommendedNarrative: 'generic_return',
        },
        movementState: {
          stalledAfterClarity: false,
          repeatedAvoidance: false,
          unstableRhythm: false,
          unresolvedDecisionLoop: false,
          overloadedActionState: false,
          interruptedMomentum: false,
        },
        nextMeaningfulAction: 'Почнімо з найближчої простої дії.',
        summary: 'найближчий крок',
      },
      continuityMode: 'generic',
      recommendedNextAction: 'Почнімо з найближчої простої дії.',
      primaryBlock: null,
      unresolvedAction: null,
      repeatedPattern: null,
      inactiveDays: null,
      lastMeaningfulFocus: null,
      lastZoomTopic: null,
      relationship: null,
    }
    await deliverTelegramFlow(ctx, buildAbsystemStatusFlow(fallback), 'reply')
  }
}
