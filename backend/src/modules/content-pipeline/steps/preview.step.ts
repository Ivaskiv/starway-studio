import type { Telegraf } from 'telegraf'
import { Markup } from 'telegraf'

import { pipelineContent } from '../pipeline.content.js'
import type { ReelsVariant } from '../pipeline.types.js'

export async function sendVariantsPreview(
  bot: Telegraf,
  chatId: number,
  pipelineId: string,
  variants: ReelsVariant[],
): Promise<void> {
  const message = buildPreviewMessage(variants)
  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback(pipelineContent.buttons.variantA, `pipeline:select:${pipelineId}:A`)],
    [Markup.button.callback(pipelineContent.buttons.variantB, `pipeline:select:${pipelineId}:B`)],
    [Markup.button.callback(pipelineContent.buttons.variantC, `pipeline:select:${pipelineId}:C`)],
    [Markup.button.callback(pipelineContent.buttons.cancel, `pipeline:cancel:${pipelineId}`)],
  ])

  await bot.telegram.sendMessage(chatId, message, {
    parse_mode: 'HTML',
    ...keyboard,
  })
}

function buildPreviewMessage(variants: ReelsVariant[]): string {
  return variants.map((variant) => (
    `<b>${pipelineContent.labels[variant.id]}</b>\n`
    + `<i>Хук:</i> ${variant.hook}\n`
    + `<i>CTA:</i> ${variant.cta}`
  )).join('\n\n──────────\n\n')
}
