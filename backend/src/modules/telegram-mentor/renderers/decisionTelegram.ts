import type { Context } from 'telegraf'
import { stankeyContent } from '@/products/stankey/config/stankey.content.js'

import type { DecisionOutput } from '../../../core/decision/decision.engine.js'
import { aiMentorStartKeyboard, leadMagnetChoiceKeyboard, openAppKeyboard, trialExpiredKeyboard, withDevTestPaymentButton } from '../keyboards.js'
import { sendProduct } from '../flows/product.flow.js'
import { planMessage } from '../conversation/delivery/planDelivery.js'

export async function renderTelegram(
  ctx: Context,
  decision: DecisionOutput,
  firstName: string,
): Promise<boolean> {
  switch (decision.nextAction) {
    case 'show_funnel_step':
      await planMessage(
        ctx,
        'ctx.reply',
        'decision_show_funnel_step',
        stankeyContent.telegram.decision.funnelStepLines(firstName).join('\n'),
        leadMagnetChoiceKeyboard().reply_markup,
      )
      return true
    case 'show_funnel':
      await planMessage(
        ctx,
        'ctx.reply',
        'decision_show_funnel',
        stankeyContent.telegram.decision.showFunnel,
        leadMagnetChoiceKeyboard().reply_markup,
      )
      return true
    case 'show_product':
    case 'resume_session':
      await sendProduct(ctx)
      return true
    case 'show_winback':
      await planMessage(
        ctx,
        'ctx.reply',
        'decision_show_winback',
        stankeyContent.telegram.decision.winbackLines(firstName).join('\n'),
        trialExpiredKeyboard().reply_markup,
      )
      return true
    case 'show_trial_offer':
    case 'show_offer':
    case 'start_trial':
      await planMessage(
        ctx,
        'ctx.reply',
        'decision_show_offer',
        stankeyContent.telegram.decision
          .offerLines(firstName, decision.uiTemplate === 'subscription_offer')
          .join('\n'),
        decision.nextAction === 'show_trial_offer'
          ? aiMentorStartKeyboard().reply_markup
          : {
              inline_keyboard: withDevTestPaymentButton([[
                { text: stankeyContent.telegram.buttons.pay, callback_data: 'open_paid_checkout' },
              ]]),
            },
      )
      return true
    case 'show_paywall':
      await planMessage(
        ctx,
        'ctx.reply',
        'decision_show_paywall',
        stankeyContent.telegram.decision.paywall,
        {
          inline_keyboard: withDevTestPaymentButton([[
            { text: stankeyContent.telegram.buttons.openPaidAccess, callback_data: 'open_paid_checkout' },
          ]]),
        },
      )
      return true
    default:
      return false
  }
}

export async function renderTelegramDecision(
  ctx: Context,
  decision: DecisionOutput,
  firstName: string,
): Promise<boolean> {
  return renderTelegram(ctx, decision, firstName)
}
