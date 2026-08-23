import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { Button } from '@/ui'
import {
  useGetPromptVersionsQuery,
  useRunCompatibilityCheckMutation,
  type CompatibilityCheckRequest,
  type PromptImpactAnalysisRecord,
} from '@/features/admin/services/admin.api'
import { useGetFunnelsQuery, type FunnelEntity } from '@/features/funnels/services/funnels.api'
import {
  FUNNEL_TARGET_SEGMENT_META,
  type Funnel,
  type FunnelScreen,
  type FunnelTargetSegment,
} from '@/features/funnels/types/funnel.types'
import {
  MASTER_PANEL_ITEMS,
  MASTER_PANEL_SECTIONS,
  getDefaultMasterPanelItem,
  MasterPanelSidebar,
  type MasterPanelSidebarItem,
} from '@/features/admin/components/master-panel/MasterPanelSidebar'
import MasterPanelPromptTab from '@/features/admin/components/master-panel/MasterPanelPromptTab'
import MasterPanelNotificationTab from '@/features/admin/components/master-panel/MasterPanelNotificationTab'
import MasterPanelFunnelTab from '@/features/admin/components/master-panel/MasterPanelFunnelTab'
import { AgentControlCenterTab } from '@/features/admin/components/agents/AgentControlCenterTab'
import MasterPanelRightPanel, {
  type MasterPanelRightPanelCheck,
  type MasterPanelRightPanelDependency,
  type MasterPanelRightPanelWarning,
  type RightPanelContext,
} from '@/features/admin/components/master-panel/MasterPanelRightPanel'
import {
  MASTER_NOTIFICATIONS,
  type Notification,
} from '@/features/notifications/config/notificationPreviewFlows'
import { MasterPanelFunnelScreenEditor } from '@/features/admin/components/master-panel/page/MasterPanelFunnelScreenEditor'
import {
  buildFunnelAnalysis,
  buildFunnelSidebarSections,
  buildNotificationAnalysis,
  buildPromptConnections,
  buildPromptPanelChecks,
  buildDefaultFunnelScreens,
  createFunnelScreenId,
  funnelMatchesItem,
  hydrateFunnelDraft,
  isMasterTab,
  isToday,
  normalizeFunnelStatus,
  normalizeFunnelTargetSegment,
  promptMatchesItem,
  type FunnelAnalysisRecord,
  type MasterTab,
  type NotificationAnalysisRecord,
} from '@/features/admin/components/master-panel/page/masterPanelPage.utils'
import { RIGHT_PANEL } from '@/features/admin/components/master-panel/page/masterPanelPage.constants'
import { useMasterPanelFunnels } from '@/features/admin/components/master-panel/page/useMasterPanelFunnels'
import {
  buildCompatibilityPayload,
  buildMasterPanelRightPanelModel,
} from '@/features/admin/components/master-panel/page/masterPanelRightPanel.model'

const TABS: Array<{ id: MasterTab; label: string }> = [
  { id: 'prompts', label: 'Промпти' },
  { id: 'notifications', label: 'Сигнали' },
  { id: 'funnels', label: 'Воронки' },
  { id: 'agents', label: 'Агенти' },
]

function getDefaultItemForTab(tab: MasterTab) {
  return getDefaultMasterPanelItem(tab)
}

export default function MasterPanelPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [compatibilityCheck, setCompatibilityCheck] = useState<PromptImpactAnalysisRecord | null>(null)
  const [compatibilityCheckState, setCompatibilityCheckState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [notifications, setNotifications] = useState<Notification[]>(() => MASTER_NOTIFICATIONS)
  const [selectedNotificationId, setSelectedNotificationId] = useState<string>(MASTER_NOTIFICATIONS[0]?.id ?? '')
  const tabParam = searchParams.get('tab')
  const itemParam = searchParams.get('item')

  const requestedTab: MasterTab = isMasterTab(tabParam) ? tabParam : 'prompts'

  const { data: promptVersionsData } = useGetPromptVersionsQuery(undefined)
  const [runCompatibilityCheck, { isLoading: runningCompatibilityCheck }] = useRunCompatibilityCheckMutation()
  const funnelQueryArgs = useMemo(() => ({ includeAll: Boolean(user?.isSuperAdmin) }), [user?.isSuperAdmin])
  const { data: funnels = [] } = useGetFunnelsQuery(funnelQueryArgs)
  const normalizedRole = String(user?.role ?? '').toUpperCase()
  const isSuperAdmin = normalizedRole === 'SUPERADMIN' || user?.isSuperAdmin === true
  const isExpertRole = normalizedRole === 'EXPERT' || normalizedRole === 'ADMIN'
  const isCoachRole = normalizedRole === 'COACH'
  const canAccessMasterPanel = isSuperAdmin || isExpertRole || isCoachRole
  const canEditPrompts = isSuperAdmin || isExpertRole || isCoachRole
  const canEditNotifications = isSuperAdmin || isExpertRole
  const canManageNotifications = isSuperAdmin
  const canEditFunnels = isSuperAdmin || isExpertRole
  const canManageFunnels = isSuperAdmin
  const canReorderFunnelScreens = isSuperAdmin
  const canEditFunnelTextOnly = isExpertRole && !isSuperAdmin

  const prompts = useMemo(
    () =>
      [...(promptVersionsData?.prompts ?? [])].sort((left, right) => {
        if (left.name === right.name) return right.version - left.version
        return left.name.localeCompare(right.name, 'uk')
      }),
    [promptVersionsData?.prompts],
  )
  const promptLookup = useMemo(() => {
    const lookup = new Map<string, string>()
    for (const item of MASTER_PANEL_ITEMS) {
      if (item.kind === 'prompt' && item.promptName) {
        lookup.set(item.promptName, item.label)
      }
    }
    return lookup
  }, [])
  const promptOptions = useMemo(() => {
    const seen = new Set<string>()
    return prompts
      .filter((prompt) => {
        if (seen.has(prompt.name)) return false
        seen.add(prompt.name)
        return true
      })
      .map((prompt) => ({
        value: prompt.name,
        label: `${promptLookup.get(prompt.name) ?? prompt.name} · v${prompt.version}`,
      }))
  }, [promptLookup, prompts])
  const promptNames = useMemo(() => promptOptions.map((option) => option.value), [promptOptions])
  const dynamicFunnelSidebarSections = useMemo(() => buildFunnelSidebarSections(funnels), [funnels])
  const dynamicFunnelItems = useMemo(
    () => dynamicFunnelSidebarSections.flatMap((section) => section.items),
    [dynamicFunnelSidebarSections],
  )
  const availableItems = useMemo(() => {
    const staticItems = MASTER_PANEL_ITEMS.filter((item) => item.kind !== 'funnel')
    const fallbackFunnelItems = MASTER_PANEL_ITEMS.filter((item) => item.kind === 'funnel')
    return [...staticItems, ...(dynamicFunnelItems.length ? dynamicFunnelItems : fallbackFunnelItems)]
  }, [dynamicFunnelItems])
  const defaultItemForTab = (tab: MasterTab) =>
    availableItems.find((item) => item.tab === tab) ?? getDefaultItemForTab(tab)
  const selectedItem = availableItems.find((item) => item.id === itemParam) ?? defaultItemForTab(requestedTab)
  const activeTab: MasterTab = selectedItem.tab
  const activePromptItem = activeTab === 'prompts' ? selectedItem : defaultItemForTab('prompts')
  const activeNotificationItem = activeTab === 'notifications' ? selectedItem : defaultItemForTab('notifications')
  const activeFunnelItem = activeTab === 'funnels' ? selectedItem : defaultItemForTab('funnels')
  const selectedFunnelId =
    activeTab === 'funnels'
      ? activeFunnelItem.funnelId ?? funnels.find((item) => funnelMatchesItem(item, activeFunnelItem))?.id ?? funnels[0]?.id ?? null
      : null

  const promptFamilyCount = useMemo(() => new Set(prompts.map((prompt) => prompt.name)).size, [prompts])
  const promptVersionsCount = prompts.length
  const changedTodayCount = prompts.filter((prompt) => isToday(prompt.createdAt)).length
  const activePromptCount = prompts.filter((item) => item.isActive).length
  const activeFunnelCount = funnels.filter((item) => item.status === 'active').length

  const selectedNotification =
    notifications.find((notification) => notification.id === selectedNotificationId) ??
    notifications[0] ??
    MASTER_NOTIFICATIONS[0] ??
    null
  const {
    funnelDrafts,
    selectedFunnelDraft,
    selectedFunnelScreen,
    selectFunnelScreen,
    moveFunnelScreen,
    duplicateFunnelScreen,
    deleteFunnelScreen,
    addFunnelScreen,
    updateFunnelScreen,
    updateSelectedFunnelMetric,
  } = useMasterPanelFunnels({
    activeTab,
    funnels,
    selectedFunnelId,
  })

  useEffect(() => {
    setCompatibilityCheck(null)
    setCompatibilityCheckState('idle')
  }, [activeTab, selectedItem.id, selectedNotification?.id, selectedFunnelScreen?.id])
  const allFunnelDrafts = useMemo(
    () =>
      funnels.map((funnel) => {
        const draft = funnelDrafts[funnel.id]
        return draft ?? hydrateFunnelDraft(funnel)
      }),
    [funnelDrafts, funnels],
  )
  const selectedPromptName = activeTab === 'prompts' ? activePromptItem.promptName ?? null : null
  const promptConnections = useMemo(
    () => buildPromptConnections(selectedPromptName, notifications, allFunnelDrafts),
    [allFunnelDrafts, notifications, selectedPromptName],
  )

  const funnelAnalysis = useMemo(
    () => buildFunnelAnalysis(selectedFunnelDraft, selectedFunnelScreen, notifications, promptLookup, promptNames),
    [notifications, promptLookup, promptNames, selectedFunnelDraft, selectedFunnelScreen],
  )
  const connectedFunnelNotifications: Notification[] = funnelAnalysis?.connectedNotifications ?? []

  const notificationAnalysis = useMemo(
    () => buildNotificationAnalysis(selectedNotification, notifications, promptLookup, allFunnelDrafts),
    [allFunnelDrafts, notifications, promptLookup, selectedNotification],
  )
  const sharedRightPanelItems = RIGHT_PANEL[activeTab]
  const linkedFunnelPromptItem = useMemo(
    () =>
      selectedFunnelScreen?.aiPromptId
        ? MASTER_PANEL_ITEMS.find((item) => item.kind === 'prompt' && item.promptName === selectedFunnelScreen.aiPromptId)
        : null,
    [selectedFunnelScreen?.aiPromptId],
  )

  const itemCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {}

    for (const section of MASTER_PANEL_SECTIONS) {
      for (const item of section.items) {
        if (item.kind === 'prompt') {
          counts[item.id] = prompts.filter((prompt) => promptMatchesItem(prompt, item)).length
          continue
        }

        if (item.kind === 'notification') {
          counts[item.id] = notifications.filter((notification) => item.notificationIds?.includes(notification.id)).length
          continue
        }

        if (item.kind === 'funnel') {
          counts[item.id] = item.funnelId ? 1 : funnels.filter((funnel) => funnelMatchesItem(funnel, item)).length
        }
      }
    }

    return counts
  }, [funnels, prompts])

  const selectItem = (item: MasterPanelSidebarItem) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('tab', item.tab)
    nextParams.set('item', item.id)
    setSearchParams(nextParams, { replace: true })
    if (item.kind === 'notification') {
      setSelectedNotificationId(item.notificationIds?.[0] ?? MASTER_NOTIFICATIONS[0]?.id ?? '')
    }
  }

  const selectTab = (next: MasterTab) => {
    const nextItem = defaultItemForTab(next)
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('tab', next)
    nextParams.set('item', nextItem.id)
    setSearchParams(nextParams, { replace: true })
    if (next === 'notifications') {
      setSelectedNotificationId(nextItem.notificationIds?.[0] ?? MASTER_NOTIFICATIONS[0]?.id ?? '')
    }
  }

  const canEdit = canEditPrompts

  useEffect(() => {
    if (activeTab !== 'notifications') return
    if (!notifications.length) return
    if (notifications.some((notification) => notification.id === selectedNotificationId)) return
    setSelectedNotificationId(activeNotificationItem.notificationIds?.[0] ?? notifications[0]?.id ?? MASTER_NOTIFICATIONS[0]?.id ?? '')
  }, [activeNotificationItem.notificationIds, activeTab, notifications, selectedNotificationId])

  const handleRunCompatibilityCheck = async () => {
    try {
      setCompatibilityCheckState('loading')
      const result = await runCompatibilityCheck(
        buildCompatibilityPayload({
          activeTab,
          activePromptItem,
          selectedNotification,
          notificationAnalysis,
          selectedFunnelScreen,
          selectedFunnelDraft,
          selectedFunnelId,
          funnelAnalysis,
        }),
      ).unwrap()
      setCompatibilityCheck(result)
      setCompatibilityCheckState('ready')
      toast.success('AI-перевірка готова')
    } catch (error) {
      setCompatibilityCheckState('error')
      toast.error('Не вдалося виконати AI-перевірку')
      console.error('[MasterPanel] compatibility check failed', error)
    }
  }

  const rightPanelModel = activeTab === 'agents'
    ? null
    : buildMasterPanelRightPanelModel({
        activeTab,
        activePromptItem,
        activeNotificationItem,
        compatibilityCheck,
        compatibilityCheckState,
        runningCompatibilityCheck,
        canEditPrompts,
        canEditNotifications,
        canEditFunnels,
        promptConnections,
        notificationAnalysis,
        funnelAnalysis,
        selectedNotification,
        selectedFunnelScreen,
        selectedFunnelDraft,
        selectedFunnelId,
        sharedRightPanelItems,
      })

  const rightPanelChecks: MasterPanelRightPanelCheck[] =
    activeTab === 'prompts' && !compatibilityCheck?.checks.length
      ? [...buildPromptPanelChecks(promptConnections)]
      : rightPanelModel?.checks ?? []

  const rightPanelTopAction = rightPanelModel
    ? {
        ...rightPanelModel.topAction,
        onClick: () => void handleRunCompatibilityCheck(),
      }
    : null

  const rightPanelLinkedAction =
    activeTab === 'notifications' && selectedNotification?.linkedPromptId
      ? {
          label: 'Відкрити linked prompt',
          onClick: () => {
            const linkedPromptItem = MASTER_PANEL_ITEMS.find(
              (item) => item.kind === 'prompt' && item.promptName === selectedNotification.linkedPromptId,
            )
            if (!linkedPromptItem) {
              toast.error('Не вдалося знайти пов’язаний промпт')
              return
            }
            selectTab('prompts')
            selectItem(linkedPromptItem)
          },
        }
      : activeTab === 'funnels' && linkedFunnelPromptItem
        ? {
            label: 'Відкрити AI-промпт',
            onClick: () => {
              selectTab('prompts')
              selectItem(linkedFunnelPromptItem)
            },
          }
        : undefined

  const rightPanelSupplementalContent =
    activeTab === 'funnels' && selectedFunnelScreen
      ? (
          <MasterPanelFunnelScreenEditor
            screen={selectedFunnelScreen}
            canEditFunnels={canEditFunnels}
            canManageFunnels={canManageFunnels}
            canEditFunnelTextOnly={canEditFunnelTextOnly}
            promptOptions={promptOptions}
            connectedNotifications={connectedFunnelNotifications}
            onUpdateScreen={updateFunnelScreen}
            onUpdateMetric={updateSelectedFunnelMetric}
            onOpenNotification={(notification) => {
              const notificationItem = MASTER_PANEL_ITEMS.find(
                (item) => item.kind === 'notification' && item.notificationIds?.includes(notification.id),
              )
              if (!notificationItem) {
                toast.error('Не вдалося знайти пов’язане нагадування')
                return
              }
              selectTab('notifications')
              selectItem(notificationItem)
            }}
          />
        )
      : null

  const sidebarSections = useMemo(() => {
    if (activeTab === 'funnels') {
      return dynamicFunnelSidebarSections.length
        ? dynamicFunnelSidebarSections
        : MASTER_PANEL_SECTIONS.filter((section) => section.id === 'funnels')
    }

    if (activeTab === 'agents') {
      return MASTER_PANEL_SECTIONS.filter((section) => section.id === 'agents')
    }

    return MASTER_PANEL_SECTIONS
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.tab === activeTab),
      }))
      .filter((section) => section.items.length > 0)
  }, [activeTab, dynamicFunnelSidebarSections])

  const roleBadgeLabel = isSuperAdmin
    ? 'Superadmin'
    : isCoachRole
      ? 'Coach'
      : 'Expert'

  if (!canAccessMasterPanel) {
    return (
      <div className="px-4 py-6 lg:px-6">
        <div className="rounded-[28px] border border-[var(--border)] bg-[var(--bg-secondary)] p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
            Master Panel
          </p>
          <h1 className="mt-3 text-[1.6rem] font-semibold text-[var(--text-primary)]">
            Доступ обмежено
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
            Цей модуль доступний для `SUPERADMIN`, `EXPERT` / `ADMIN` і `COACH`. Для звичайного користувача він прихований.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 lg:px-6">
      <div className={`grid items-start gap-5 ${activeTab === 'agents' ? 'xl:grid-cols-[320px_minmax(0,1fr)]' : 'xl:grid-cols-[320px_minmax(0,1fr)_340px]'}`}>
        <MasterPanelSidebar
          activeTab={activeTab}
          tabs={TABS.map((tab) => ({ id: tab.id, label: tab.label }))}
          sections={sidebarSections}
          roleLabel={roleBadgeLabel}
          activeItemId={selectedItem.id}
          counts={{
            totalPrompts: promptFamilyCount,
            changedToday: changedTodayCount,
            versionsSaved: promptVersionsCount,
          }}
          itemCounts={itemCounts}
          onSelectTab={selectTab}
          onSelectItem={selectItem}
        />

        <section className="min-w-0 space-y-5">
          {activeTab === 'prompts' ? (
            <MasterPanelPromptTab
              canEdit={canEditPrompts}
              prompts={prompts}
              isLoading={!promptVersionsData}
              selectedItem={activePromptItem}
            />
          ) : null}
          {activeTab === 'notifications' ? (
            <MasterPanelNotificationTab
              canEdit={canEditNotifications}
              canManageAll={canManageNotifications}
              notifications={notifications}
              selectedNotificationId={selectedNotification?.id ?? ''}
              onSelectNotification={setSelectedNotificationId}
              onChangeNotifications={setNotifications}
            />
          ) : null}
          {activeTab === 'funnels' ? (
            <MasterPanelFunnelTab
              selectedFunnelId={selectedFunnelId}
              funnels={funnels}
              screens={selectedFunnelDraft?.screens ?? []}
              selectedScreenId={selectedFunnelScreen?.id ?? null}
              canEdit={canEditFunnels}
              canManageAll={canManageFunnels}
              canReorderScreens={canReorderFunnelScreens}
              isLoading={!funnels.length}
              onSelectScreen={selectFunnelScreen}
              onMoveScreen={moveFunnelScreen}
              onDuplicateScreen={duplicateFunnelScreen}
              onDeleteScreen={deleteFunnelScreen}
              onAddScreen={addFunnelScreen}
            />
          ) : null}
          {activeTab === 'agents' ? (
            <AgentControlCenterTab canEdit={canEditPrompts} />
          ) : null}
        </section>

        {rightPanelModel ? (
          <MasterPanelRightPanel
            context={rightPanelModel.context}
            title={rightPanelModel.title}
            summary={rightPanelModel.summary}
            hintDescription={rightPanelModel.hintDescription}
            hintInstruction={rightPanelModel.hintInstruction}
            supplementalContent={rightPanelSupplementalContent}
            topAction={rightPanelTopAction ?? undefined}
            linkedAction={rightPanelLinkedAction}
            dependencies={rightPanelModel.dependencies}
            warnings={rightPanelModel.warnings}
            checks={rightPanelChecks}
            checksState={rightPanelModel.checksState}
            recommendation={rightPanelModel.recommendation}
            footerAction={{
              ...rightPanelModel.footerAction,
              onClick: () => void handleRunCompatibilityCheck(),
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
