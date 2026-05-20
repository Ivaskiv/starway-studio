import { prisma } from '../../../db/client.js'
import { sendDedupedTelegramMessage } from '../../../lib/telegram.js'
import { stankeyManifest } from '@/products/stankey/product.manifest.js'
import { createWayForPayCheckout, type StankeyPlanId } from '../../subscriptions/payments/wayforpay.checkout.js'
import type { Context } from 'telegraf'
import { getTelegramProductContext } from '@/content/telegram.product-context.js'
import { buildRecoveryCopy, resolveConversationProfile } from '../../../core/state-machine/conversationPresentation.js'
import { resolveRelationshipMemory } from '../../../core/memory/relationshipMemory.js'
import { absystemContent } from '@/products/absystem/config/absystem.content.js'
import { withDevTestPaymentButton } from '../keyboards.js'

function buildPlansKeyboard() {
  const context = getTelegramProductContext('stankey')
  return {
    inline_keyboard: withDevTestPaymentButton(stankeyManifest.pricing.plans.map((plan) => ([
      {
        text: `${context.cta.buy} · ${plan.title} · ${plan.price} ${stankeyManifest.pricing.currency}`,
        callback_data: `pay_stankey_${plan.id}`,
      },
    ]))),
  }
}

export async function handleBillingPaywall(ctx: Context, userId: string) {
  const context = getTelegramProductContext('stankey')
  const profile = resolveConversationProfile('stankey')
  const relationship = await resolveRelationshipMemory(userId, 'stankey').catch(() => null)
  await ctx.reply([
    absystemContent.subscription.restore,
    ...(relationship?.lastMeaningfulGoal ? [`Пам'ятаю твій фокус: ${relationship.lastMeaningfulGoal}`] : []),
    ...(relationship?.repeatedPostponedAction ? [`Повторюється вузол: ${relationship.repeatedPostponedAction}`] : []),
    ...context.copy.payment,
    profile.upgradeLead,
  ].join('\n'), {
    reply_markup: buildPlansKeyboard(),
  })
}

export async function handleBillingCheckout(ctx: Context, userId: string, planId: StankeyPlanId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  })

  const checkout = createWayForPayCheckout({
    user: {
      id: userId,
      email: user?.email ?? null,
    },
    product: {
      id: stankeyManifest.productId,
      title: stankeyManifest.title,
    },
    plan: planId,
  })

  const context = getTelegramProductContext('stankey')
  const relationship = await resolveRelationshipMemory(userId, 'stankey').catch(() => null)
  const copy = buildRecoveryCopy('payment_interrupted', resolveConversationProfile('stankey'), {
    relationship,
  })
  await ctx.reply(`${absystemContent.errors.paymentInterrupted.title}\n${copy.body}\nОплата відкривається зараз: ${checkout.amount} ${checkout.currency}.`, {
    reply_markup: {
      inline_keyboard: withDevTestPaymentButton([[
        {
          text: context.cta.buy,
          url: checkout.checkoutUrl,
        },
      ]]),
    },
  })

  return checkout
}

export async function sendBillingSuccessTelegramMessage(userId: string) {
  const context = getTelegramProductContext('stankey')
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      telegramChatId: true,
      telegramLinks: {
        where: { isActive: true, chatId: { not: null } },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { chatId: true },
      },
    },
  })

  const chatId = user?.telegramChatId ?? user?.telegramLinks[0]?.chatId ?? null
  if (!chatId) {
    return false
  }

  return sendDedupedTelegramMessage(
    chatId,
    context.copy.activation.join('\n'),
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: context.cta.openRoom, callback_data: 'open_course' }],
          [{ text: context.cta.continue, callback_data: 'continue_ai_mentor' }],
          [{ text: context.cta.continueLesson, callback_data: 'open_practices' }],
        ],
      },
    },
  )
}
