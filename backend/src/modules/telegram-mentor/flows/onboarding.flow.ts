import type { Context } from 'telegraf'

export async function sendWaitlist(ctx: Context) {
  await ctx.reply(
    [
      'Ти в early access.',
      '',
      'Доступ відкривається поетапно, тому зараз для тебе активний обмежений rollout.',
      'Як тільки твій доступ буде готовий, ми дамо наступний крок тут.',
    ].join('\n'),
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔥 Early access', callback_data: 'waitlist_early_access' }],
        ],
      },
    },
  )
}
