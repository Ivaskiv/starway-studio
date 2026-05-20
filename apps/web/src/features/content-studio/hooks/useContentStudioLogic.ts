import { useState } from 'react'

import { withMinimumDelay } from '@/ui'
import { approveItem, replaceItem, replaceItemContent, setGeneratedBundle } from '../slice/contentStudio.slice'
import type { ContentStudioAIStrategy, ContentStudioInputs, ContentStudioItem } from '../types/contentStudio.types'
import { mergeContentItems } from '../utils/contentTransforms'

export function useContentStudioLogic({
  dispatch,
  inputs,
  items,
  approvedItems,
  autoReels,
  setActiveTab,
  generateBundle,
  generateContentImages,
  regenerateContentItem,
  publishContentItem,
  setBusyItemId: syncBusyItemId,
  setImageBusyItemId: syncImageBusyItemId,
  setBundleBusyKey: syncBundleBusyKey,
  setStatusTone: syncStatusTone,
  setStatusText: syncStatusText,
  setProgress: syncProgress,
  generationStrategy,
}: {
  dispatch: (action: unknown) => void
  inputs: ContentStudioInputs
  items: ContentStudioItem[]
  approvedItems: ContentStudioItem[]
  autoReels: boolean
  setActiveTab: (value: 'input' | 'scripts' | 'publish') => void
  generateBundle: (args: { inputs: ContentStudioInputs; formats?: Array<'reels' | 'stories' | 'ad' | 'post' | 'podcast' | 'dm'>; strategy?: ContentStudioAIStrategy | null }) => { unwrap: () => Promise<{ items: ContentStudioItem[]; generatedAt: string }> }
  generateContentImages: (args: { item: ContentStudioItem; count: number }) => { unwrap: () => Promise<{ item: ContentStudioItem }> }
  regenerateContentItem: (args: { item: ContentStudioItem; inputs: ContentStudioInputs; strategy?: ContentStudioAIStrategy | null }) => { unwrap: () => Promise<ContentStudioItem> }
  publishContentItem: (args: { item: ContentStudioItem }) => { unwrap: () => Promise<{ item: ContentStudioItem }> }
  setBusyItemId?: (value: string | null) => void
  setImageBusyItemId?: (value: string | null) => void
  setBundleBusyKey?: (value: string | null) => void
  setStatusTone?: (value: 'idle' | 'run' | 'done' | 'err') => void
  setStatusText?: (value: string) => void
  setProgress?: (value: number) => void
  generationStrategy: ContentStudioAIStrategy | null
}) {
  const [busyItemId, setBusyItemId] = useState<string | null>(null)
  const [imageBusyItemId, setImageBusyItemId] = useState<string | null>(null)
  const [bundleBusyKey, setBundleBusyKey] = useState<string | null>(null)
  const [statusTone, setStatusTone] = useState<'idle' | 'run' | 'done' | 'err'>('idle')
  const [statusText, setStatusText] = useState('')
  const [progress, setProgress] = useState(0)
  const updateBusyItemId = (value: string | null) => {
    setBusyItemId(value)
    syncBusyItemId?.(value)
  }
  const updateImageBusyItemId = (value: string | null) => {
    setImageBusyItemId(value)
    syncImageBusyItemId?.(value)
  }
  const updateBundleBusyKey = (value: string | null) => {
    setBundleBusyKey(value)
    syncBundleBusyKey?.(value)
  }
  const updateStatusTone = (value: 'idle' | 'run' | 'done' | 'err') => {
    setStatusTone(value)
    syncStatusTone?.(value)
  }
  const updateStatusText = (value: string) => {
    setStatusText(value)
    syncStatusText?.(value)
  }
  const updateProgress = (value: number) => {
    setProgress(value)
    syncProgress?.(value)
  }

  const runGenerate = async (
  formats?: Array<
    | 'reels'
    | 'stories'
    | 'ad'
    | 'post'
    | 'podcast'
    | 'dm'
  >,
) => {
  try {
    updateBundleBusyKey(
      formats?.join(',') ?? 'all',
    )

    updateStatusTone('run')

    updateStatusText(
      formats?.length
        ? `Генерую формат: ${formats.join(', ')}...`
        : 'Генерую весь пакет: Reels, реклама, Stories, Podcast, DM і Telegram...',
    )

    updateProgress(12)

    const result = await withMinimumDelay(
      generateBundle({
        inputs,
        formats,
        strategy: generationStrategy,
      }).unwrap(),
      1050,
    )

    dispatch(
      setGeneratedBundle({
        items: formats?.length
          ? mergeContentItems(
              items,
              result.items,
            )
          : result.items,
        generatedAt: result.generatedAt,
      }),
    )

    updateProgress(
      autoReels ? 52 : 40,
    )

    updateStatusTone('done')

    updateStatusText(
      formats?.length
        ? `Готово: ${result.items.length} одиниць контенту зібрано для вибраного формату.`
        : `Пакет готовий: ${result.items.length} одиниць контенту зібрано для всіх каналів.`,
    )

    setActiveTab('scripts')

    return result.items
  } catch (error) {
    console.error(
      '[content-studio] generate failed',
      error,
    )

    updateStatusTone('err')

    updateStatusText(
      'Помилка генерації',
    )

    return null
  } finally {
    updateBundleBusyKey(null)
  }
}

  const publishApprovedItems = async () => {
    for (const item of approvedItems) {
      try {
        updateBusyItemId(item.id)
        const result = await publishContentItem({ item }).unwrap()
        dispatch(replaceItem(result.item))
      } catch (error) {
        console.error('[content-studio] bulk publish failed', error)
      } finally {
        updateBusyItemId(null)
      }
    }
  }

  const handleLaunchSales = async (allItems: ContentStudioItem[]) => {
    if (allItems.length === 0) return runGenerate()
    if (approvedItems.length === 0) {
      setActiveTab('scripts')
      updateStatusTone('run')
      updateStatusText('Підтвердь хоча б один сильний матеріал у пакеті, і тоді можна запускати продаж.')
      updateProgress(66)
      return null
    }
    setActiveTab('publish')
    updateStatusTone('run')
    updateStatusText('Запускаю весь пакет: publish + payload activation + Telegram sync…')
    updateProgress(82)
    await publishApprovedItems()
    updateStatusTone('done')
    updateStatusText('Продажний пакет запущено. Далі дивись DM, trial і conversions по payload.')
    updateProgress(100)
    return null
  }

  const publishOne = async (item: ContentStudioItem) => {
    try {
      updateBusyItemId(item.id)
      const result = await publishContentItem({ item }).unwrap()
      dispatch(replaceItem(result.item))
    } catch (error) {
      console.error('[content-studio] publish failed', error)
    } finally {
      updateBusyItemId(null)
    }
  }

  const regenerateOne = async (item: ContentStudioItem) => {
    try {
      updateBusyItemId(item.id)
      const nextItem = await regenerateContentItem({ item, inputs, strategy: generationStrategy }).unwrap()
      dispatch(replaceItem(nextItem))
      return nextItem
    } catch (error) {
      console.error('[content-studio] regenerate failed', error)
      return null
    } finally {
      updateBusyItemId(null)
    }
  }

  const generateImagesForItem = async (item: ContentStudioItem) => {
    try {
      updateImageBusyItemId(item.id)
      const result = await withMinimumDelay(generateContentImages({ item, count: 5 }).unwrap(), 1200)
      dispatch(replaceItem(result.item))
      return result.item
    } catch (error) {
      console.error('[content-studio] generate images failed', error)
      return null
    } finally {
      updateImageBusyItemId(null)
    }
  }

  return {
    busyItemId,
    imageBusyItemId,
    bundleBusyKey,
    statusTone,
    statusText,
    progress,
    setStatusText: updateStatusText,
    runGenerate,
    publishApprovedItems,
    handleLaunchSales,
    publishOne,
    regenerateOne,
    generateImagesForItem,
    approveOne: (id: string) => dispatch(approveItem(id)),
    replaceContent: (id: string, content: string[]) => dispatch(replaceItemContent({ id, content })),
  }
}
