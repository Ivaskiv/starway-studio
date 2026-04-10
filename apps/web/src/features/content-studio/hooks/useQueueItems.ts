import { useMemo } from 'react'

import { REELS_ENGINE_NODES } from '../config/contentStudio.config'
import { dedupeContentItems } from '../utils/contentTransforms'
import type { ContentStudioItem, PreviewQueueItem, QueueItemWithSource } from '../types/contentStudio.types'

export function useQueueItems(items: ContentStudioItem[], approvedItems: ContentStudioItem[], publishedItems: ContentStudioItem[]) {
  return useMemo(() => {
    const reelItems = dedupeContentItems(items.filter((item) => item.type === 'reel')).slice(0, 3)
    const queueItems: QueueItemWithSource[] = reelItems.map((item) => ({ id: item.id, title: item.title, status: item.status, formatLabel: item.formatLabel, sourceItem: item }))
    const fallbackItems: PreviewQueueItem[] = [
      { id: 'reel-a', title: 'Reels A · "Ти не лінива. Ти просто тримаєш усе на собі."', status: 'approved', formatLabel: 'PAS формула · 15 сек · Instagram Reels' },
      { id: 'reel-b', title: 'Reels B · "Коли руху нема, цифри показують де саме ламається шлях."', status: 'draft', formatLabel: 'AIDA формула · генерується голос…' },
      { id: 'reel-c', title: 'Reels C · "Тобі знайоме це відчуття о 23:58?"', status: 'draft', formatLabel: 'BAB формула · В черзі' },
    ]
    const completedNodeCount = reelItems.length === 0 ? 3 : Math.min(REELS_ENGINE_NODES.length, 3 + (reelItems.some((item) => item.generatedImages?.length) ? 1 : 0) + (reelItems.some((item) => item.audioReady) ? 1 : 0) + (approvedItems.some((item) => item.type === 'reel') ? 1 : 0) + (publishedItems.some((item) => item.type === 'reel') ? 2 : 0))
    return { reelItems, queueItems, fallbackItems, completedNodeCount }
  }, [approvedItems, items, publishedItems])
}
