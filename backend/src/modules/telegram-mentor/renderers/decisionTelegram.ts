import type { Context } from 'telegraf'

import type { DecisionOutput } from '../../../core/decision/decision.engine.js'
import { aiMentorStartKeyboard, leadMagnetChoiceKeyboard, openAppKeyboard, trialExpiredKeyboard } from '../keyboards.js'
import { sendProduct } from '../flows/product.flow.js'

export async function renderTelegram(
  ctx: Context,
  decision: DecisionOutput,
  firstName: string,
): Promise<boolean> {
  switch (decision.nextAction) {
    case 'show_funnel_step':
      await ctx.reply(
        [
          `${firstName}, продовжуй свій вхід у систему крок за кроком.`,
          '',
          'Заверши поточний етап, щоб відкрити trial і повний ритм ABsystem.',
        ].join('\n'),
        {
          reply_markup: leadMagnetChoiceKeyboard().reply_markup,
        },
      )
      return true
    case 'show_funnel':
      await ctx.reply(
        'Почни з діагностики стану або відразу переходь до наступного кроку входу.',
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
        [
          `${firstName}, доступ до ABsystemа завершився.`,
          '',
          'Поверни доступ, щоб відновити ритм, звіти й незавершені кроки без втрати інерції.',
        ].join('\n'),
        {
          reply_markup: trialExpiredKeyboard().reply_markup,
        },
      )
      return true
    case 'show_trial_offer':
    case 'show_offer':
    case 'start_trial':
      await ctx.reply(
        [
          `${firstName}, у тебе вже є база для наступного кроку.`,
          '',
          decision.uiTemplate === 'subscription_offer'
            ? 'Продовж доступ, щоб не втратити темп і зберегти свій прогрес.'
            : 'Активуй 7-денний ритм ABsystemа і подивись, як система працює в повному режимі.',
        ].join('\n'),
        {
          reply_markup: decision.nextAction === 'show_trial_offer'
            ? aiMentorStartKeyboard().reply_markup
            : openAppKeyboard('/miniapp?startapp=subscription', '🚀 Відкрити пропозицію').reply_markup,
        },
      )
      return true
    case 'show_paywall':
      await ctx.reply(
        'Для цього кроку потрібен активний доступ до ABsystemа.',
        {
          reply_markup: openAppKeyboard('/miniapp?startapp=subscription', '💎 Відкрити доступ').reply_markup,
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
