import type { Context } from 'telegraf'
import { stankeyContent } from '@/products/stankey/config/stankey.content.js'

import type { DecisionOutput } from '../../../core/decision/decision.engine.js'
import { aiMentorStartKeyboard, leadMagnetChoiceKeyboard, openAppKeyboard, trialExpiredKeyboard, withDevTestPaymentButton } from '../keyboards.js'
import { sendProduct } from '../flows/product.flow.js'

export async function renderTelegram(
  ctx: Context,
  decision: DecisionOutput,
  firstName: string,
): Promise<boolean> {
  switch (decision.nextAction) {
    case 'show_funnel_step':
      await ctx.reply(
        stankeyContent.telegram.decision.funnelStepLines(firstName).join('\n'),
        {
          reply_markup: leadMagnetChoiceKeyboard().reply_markup,
        },
      )
      return true
    case 'show_funnel':
      await ctx.reply(
        stankeyContent.telegram.decision.showFunnel,
        {
          reply_markup: leadMagnetChoiceKeyboard().reply_markup,
        },
      )
      return true
    case 'show_product':
    case 'resume_session':
      await sendProduct(ctx)
      return true
    case 'show_winback':
      await ctx.reply(
        stankeyContent.telegram.decision.winbackLines(firstName).join('\n'),
        {
          reply_markup: trialExpiredKeyboard().reply_markup,
        },
      )
      return true
    case 'show_trial_offer':
    case 'show_offer':
    case 'start_trial':
      await ctx.reply(
        stankeyContent.telegram.decision
          .offerLines(firstName, decision.uiTemplate === 'subscription_offer')
          .join('\n'),
        {
          reply_markup: decision.nextAction === 'show_trial_offer'
            ? aiMentorStartKeyboard().reply_markup
            : {
                inline_keyboard: withDevTestPaymentButton([[
                  { text: stankeyContent.telegram.buttons.pay, callback_data: 'open_paid_checkout' },
                ]]),
              },
        },
      )
      return true
    case 'show_paywall':
      await ctx.reply(
        stankeyContent.telegram.decision.paywall,
        {
          reply_markup: {
            inline_keyboard: withDevTestPaymentButton([[
              { text: stankeyContent.telegram.buttons.openPaidAccess, callback_data: 'open_paid_checkout' },
            ]]),
          },
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
