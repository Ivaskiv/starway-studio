import { useEffect, useMemo, useState } from 'react'

import type { FunnelEntity } from '@/features/funnels/services/funnels.api'
import type { Funnel, FunnelScreen } from '@/features/funnels/types/funnel.types'

import {
  DEFAULT_FUNNEL_SCREEN_TEMPLATES,
} from './masterPanelPage.constants'
import {
  buildDefaultFunnelScreens,
  createFunnelScreenId,
  hydrateFunnelDraft,
} from './masterPanelPage.utils'

export function useMasterPanelFunnels({
  activeTab,
  funnels,
  selectedFunnelId,
}: {
  activeTab: 'prompts' | 'notifications' | 'funnels'
  funnels: FunnelEntity[]
  selectedFunnelId: string | null
}) {
  const [funnelDrafts, setFunnelDrafts] = useState<Record<string, Funnel>>({})
  const [selectedFunnelScreenId, setSelectedFunnelScreenId] = useState<string | null>(null)

  useEffect(() => {
    setFunnelDrafts((current) => {
      const next: Record<string, Funnel> = { ...current }

      for (const funnel of funnels) {
        const existing = next[funnel.id]
        const hydrated = hydrateFunnelDraft(funnel)

        next[funnel.id] = existing
          ? {
              ...existing,
              name: funnel.name,
              status: funnel.status === 'active' || funnel.status === 'archived' ? funnel.status : 'draft',
              createdAt: funnel.createdAt,
              updatedAt: funnel.updatedAt,
              version: existing.version ?? hydrated.version,
              targetSegment: existing.targetSegment ?? hydrated.targetSegment,
              screens: existing.screens.length ? existing.screens : hydrated.screens,
            }
          : hydrated
      }

      for (const id of Object.keys(next)) {
        if (!funnels.some((funnel) => funnel.id === id)) {
          delete next[id]
        }
      }

      return next
    })
  }, [funnels])

  const selectedFunnelDraft = useMemo(() => {
    if (!selectedFunnelId) return null
    const source = funnels.find((funnel) => funnel.id === selectedFunnelId)
    return funnelDrafts[selectedFunnelId] ?? (source ? hydrateFunnelDraft(source) : null)
  }, [funnelDrafts, funnels, selectedFunnelId])

  const selectedFunnelScreen = useMemo(() => {
    if (!selectedFunnelDraft) return null
    return (
      selectedFunnelDraft.screens.find((screen) => screen.id === selectedFunnelScreenId) ??
      selectedFunnelDraft.screens[0] ??
      null
    )
  }, [selectedFunnelDraft, selectedFunnelScreenId])

  useEffect(() => {
    if (activeTab !== 'funnels') return
    const screenIds = selectedFunnelDraft?.screens.map((screen) => screen.id) ?? []
    setSelectedFunnelScreenId((current) => {
      if (current && screenIds.includes(current)) return current
      return screenIds[0] ?? null
    })
  }, [activeTab, selectedFunnelDraft?.id, selectedFunnelDraft?.screens])

  const updateSelectedFunnelScreens = (updater: (screens: FunnelScreen[]) => FunnelScreen[]) => {
    if (!selectedFunnelId) return

    setFunnelDrafts((current) => {
      const sourceFunnel = funnels.find((funnel) => funnel.id === selectedFunnelId)
      const currentDraft = current[selectedFunnelId] ?? (sourceFunnel ? hydrateFunnelDraft(sourceFunnel) : null)
      if (!currentDraft) return current

      return {
        ...current,
        [selectedFunnelId]: {
          ...currentDraft,
          screens: updater(currentDraft.screens),
          updatedAt: new Date().toISOString(),
        },
      }
    })
  }

  const selectFunnelScreen = (screenId: string) => {
    setSelectedFunnelScreenId(screenId)
  }

  const moveFunnelScreen = (screenId: string, direction: 'up' | 'down') => {
    updateSelectedFunnelScreens((screens) => {
      const index = screens.findIndex((screen) => screen.id === screenId)
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (index < 0 || targetIndex < 0 || targetIndex >= screens.length) return screens

      const next = [...screens]
      const [current] = next.splice(index, 1)
      next.splice(targetIndex, 0, current)

      return next.map((screen, orderIndex) => ({
        ...screen,
        order: orderIndex + 1,
      }))
    })
  }

  const duplicateFunnelScreen = (screenId: string) => {
    updateSelectedFunnelScreens((screens) => {
      const index = screens.findIndex((screen) => screen.id === screenId)
      if (index < 0) return screens

      const source = screens[index]
      const duplicate: FunnelScreen = {
        ...source,
        id: `${source.id}-copy-${Math.random().toString(36).slice(2, 7)}`,
        order: source.order + 1,
        title: `${source.title} (копія)`,
        metrics: { ...(source.metrics ?? { opened: 0, passedCta: 0, trialStart: 0, converted: 0 }) },
      }

      const next = [...screens]
      next.splice(index + 1, 0, duplicate)

      return next.map((screen, orderIndex) => ({
        ...screen,
        order: orderIndex + 1,
      }))
    })
  }

  const deleteFunnelScreen = (screenId: string) => {
    updateSelectedFunnelScreens((screens) => {
      const next = screens.filter((screen) => screen.id !== screenId)
      return next.map((screen, orderIndex) => ({
        ...screen,
        order: orderIndex + 1,
      }))
    })
    setSelectedFunnelScreenId((current) => (current === screenId ? null : current))
  }

  const addFunnelScreen = () => {
    const nextId = `${selectedFunnelId ?? 'funnel'}.screen.${String((selectedFunnelDraft?.screens.length ?? 0) + 1).padStart(2, '0')}`

    updateSelectedFunnelScreens((screens) => {
      const nextOrder = screens.length + 1
      const kind = nextOrder % 6
      const template = DEFAULT_FUNNEL_SCREEN_TEMPLATES[kind === 0 ? 5 : kind - 1]
      const nextScreen: FunnelScreen = {
        ...template,
        id: nextId,
        order: nextOrder,
        title: `${template.title}${nextOrder > DEFAULT_FUNNEL_SCREEN_TEMPLATES.length ? ` ${nextOrder}` : ''}`,
        metrics: { opened: 0, passedCta: 0, trialStart: 0, converted: 0 },
      }
      return [...screens, nextScreen]
    })
    setSelectedFunnelScreenId(nextId)
  }

  const updateFunnelScreen = (screenId: string, patch: Partial<FunnelScreen>) => {
    updateSelectedFunnelScreens((screens) =>
      screens.map((screen) =>
        screen.id !== screenId
          ? screen
          : {
              ...screen,
              ...patch,
              channels: patch.channels ?? screen.channels,
              metrics: patch.metrics
                ? { ...(screen.metrics ?? { opened: 0, passedCta: 0, trialStart: 0, converted: 0 }), ...patch.metrics }
                : screen.metrics,
            },
      ),
    )
  }

  const updateSelectedFunnelMetric = (
    screenId: string,
    metric: keyof NonNullable<FunnelScreen['metrics']>,
    value: number,
  ) => {
    updateSelectedFunnelScreens((screens) =>
      screens.map((screen) =>
        screen.id !== screenId
          ? screen
          : {
              ...screen,
              metrics: {
                ...(screen.metrics ?? { opened: 0, passedCta: 0, trialStart: 0, converted: 0 }),
                [metric]: Number.isFinite(value) && value >= 0 ? value : 0,
              },
            },
      ),
    )
  }

  return {
    funnelDrafts,
    selectedFunnelDraft,
    selectedFunnelScreen,
    selectedFunnelScreenId,
    setSelectedFunnelScreenId,
    selectFunnelScreen,
    moveFunnelScreen,
    duplicateFunnelScreen,
    deleteFunnelScreen,
    addFunnelScreen,
    updateFunnelScreen,
    updateSelectedFunnelMetric,
  }
}
