import type { Telegraf } from 'telegraf'

import { prisma } from '../../db/client.js'
import { pipelineContent } from './pipeline.content.js'
import { generateReelsVariants } from './steps/generate.step.js'
import { produceMediaAssets } from './steps/media.step.js'
import { publishContent } from './steps/publish.step.js'
import { sendVariantsPreview } from './steps/preview.step.js'
import type { ReelsVariant } from './pipeline.types.js'

export async function startPipeline(
  bot: Telegraf,
  chatId: number,
  topic: string,
  inputType: 'command' | 'voice' | 'zoom' = 'command',
): Promise<string> {
  const pipeline = await prisma.contentPipeline.create({
    data: {
      inputType,
      inputText: topic,
      topic,
      status: 'GENERATING',
      createdBy: String(chatId),
    },
  })

  await bot.telegram.sendMessage(chatId, pipelineContent.generating(topic), { parse_mode: 'HTML' })

  try {
    const variants = await generateReelsVariants(topic)

    await prisma.contentPipeline.update({
      where: { id: pipeline.id },
      data: {
        variantA: variants[0] as unknown as object,
        variantB: variants[1] as unknown as object,
        variantC: variants[2] as unknown as object,
        status: 'AWAITING_CHOICE',
      },
    })

    await sendVariantsPreview(bot, chatId, pipeline.id, variants)
  } catch (error) {
    await prisma.contentPipeline.update({
      where: { id: pipeline.id },
      data: { status: 'FAILED' },
    })
    await bot.telegram.sendMessage(chatId, pipelineContent.generationError((error as Error).message))
  }

  return pipeline.id
}

export async function handleVariantSelection(
  bot: Telegraf,
  pipelineId: string,
  variantId: 'A' | 'B' | 'C',
  chatId: number,
): Promise<void> {
  const pipeline = await prisma.contentPipeline.findUniqueOrThrow({ where: { id: pipelineId } })

  const variantsMap = {
    A: pipeline.variantA,
    B: pipeline.variantB,
    C: pipeline.variantC,
  }

  const selected = variantsMap[variantId] as ReelsVariant | null
  if (!selected) {
    throw new Error('Обраний варіант відсутній у pipeline')
  }

  await prisma.contentPipeline.update({
    where: { id: pipelineId },
    data: {
      selectedVariant: variantId,
      status: 'PRODUCING',
    },
  })

  await bot.telegram.sendMessage(chatId, pipelineContent.selected(variantId))

  void produceAndPreview(bot, pipelineId, selected, chatId).catch(async (error) => {
    await prisma.contentPipeline.update({
      where: { id: pipelineId },
      data: { status: 'FAILED' },
    }).catch(() => undefined)

    await bot.telegram.sendMessage(chatId, pipelineContent.producingError((error as Error).message))
  })
}

export async function handlePublish(
  bot: Telegraf,
  pipelineId: string,
  chatId: number,
): Promise<void> {
  const pipeline = await prisma.contentPipeline.findUniqueOrThrow({ where: { id: pipelineId } })

  const selectedKey = pipeline.selectedVariant as 'A' | 'B' | 'C' | null
  if (!selectedKey) {
    throw new Error('selectedVariant ще не обрано')
  }

  const variantField = selectedKey === 'A' ? pipeline.variantA : selectedKey === 'B' ? pipeline.variantB : pipeline.variantC
  const variant = variantField as ReelsVariant | null
  if (!variant) {
    throw new Error('Відсутні дані обраного варіанту')
  }

  await prisma.contentPipeline.update({
    where: { id: pipelineId },
    data: { status: 'PUBLISHING' },
  })
  await bot.telegram.sendMessage(chatId, pipelineContent.publishing)

  const assets = {
    scenes: Array.isArray(pipeline.videoScenes) ? (pipeline.videoScenes as string[]) : [],
    audio: pipeline.audioUrl || '',
    finalVideo: pipeline.videoUrl || undefined,
  }

  const caption = `${variant.hook}\n\n${variant.voiceScript.slice(0, 200)}...\n\n${variant.cta}`

  const results = await publishContent(
    { pipelineId, topic: pipeline.topic, selectedVariant: variant, chatId },
    assets,
    caption,
  )

  await prisma.contentPipeline.update({
    where: { id: pipelineId },
    data: {
      instagramPostId: results.instagram || null,
      telegramMessageId: results.telegram || null,
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  })

  await bot.telegram.sendMessage(
    chatId,
    pipelineContent.publishDone(Boolean(results.instagram), Boolean(results.telegram)),
  )
}

export async function cancelPipeline(pipelineId: string): Promise<void> {
  await prisma.contentPipeline.update({
    where: { id: pipelineId },
    data: { status: 'CANCELLED' },
  })
}

async function produceAndPreview(
  bot: Telegraf,
  pipelineId: string,
  variant: ReelsVariant,
  chatId: number,
): Promise<void> {
  const assets = await produceMediaAssets(variant)

  await prisma.contentPipeline.update({
    where: { id: pipelineId },
    data: {
      videoScenes: assets.scenes as unknown as object,
      audioUrl: assets.audio,
      videoUrl: assets.finalVideo || assets.scenes[0] || null,
      status: 'PREVIEW_SENT',
    },
  })

  await bot.telegram.sendMessage(chatId, pipelineContent.previewReady)

  if (!assets.scenes[0]) {
    throw new Error('Сцени не згенеровано')
  }

  await bot.telegram.sendVideo(chatId, assets.scenes[0], {
    caption: `Хук: ${variant.hook}`,
    reply_markup: {
      inline_keyboard: [
        [{ text: pipelineContent.buttons.publish, callback_data: `pipeline:publish:${pipelineId}` }],
        [{ text: pipelineContent.buttons.editHook, callback_data: `pipeline:edit_hook:${pipelineId}` }],
        [{ text: pipelineContent.buttons.cancel, callback_data: `pipeline:cancel:${pipelineId}` }],
      ],
    },
  })
}
