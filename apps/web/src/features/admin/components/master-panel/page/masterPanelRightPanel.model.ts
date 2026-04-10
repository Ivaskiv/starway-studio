import type { CompatibilityCheckRequest, PromptImpactAnalysisRecord } from '@/features/admin/services/admin.api'
import type { MasterPanelSidebarItem } from '@/features/admin/components/master-panel/MasterPanelSidebar'
import type {
  MasterPanelRightPanelCheck,
  MasterPanelRightPanelDependency,
  MasterPanelRightPanelWarning,
  RightPanelContext,
} from '@/features/admin/components/master-panel/MasterPanelRightPanel'
import type { FunnelScreen, Funnel } from '@/features/funnels/types/funnel.types'
import type { Notification } from '@/features/notifications/config/notificationPreviewFlows'

import type {
  FunnelAnalysisRecord,
  MasterTab,
  NotificationAnalysisRecord,
  PromptConnectionImpact,
} from './masterPanelPage.utils'

export function buildCompatibilityPayload({
  activeTab,
  activePromptItem,
  selectedNotification,
  notificationAnalysis,
  selectedFunnelScreen,
  selectedFunnelDraft,
  selectedFunnelId,
  funnelAnalysis,
}: {
  activeTab: MasterTab
  activePromptItem: MasterPanelSidebarItem
  selectedNotification: Notification | null
  notificationAnalysis: NotificationAnalysisRecord | null
  selectedFunnelScreen: FunnelScreen | null
  selectedFunnelDraft: Funnel | null
  selectedFunnelId: string | null
  funnelAnalysis: FunnelAnalysisRecord | null
}): CompatibilityCheckRequest {
  if (activeTab === 'prompts') {
    return {
      type: 'compatibility_check',
      item: {
        id: activePromptItem.id,
        promptId: activePromptItem.promptName ?? activePromptItem.id,
        name: activePromptItem.label,
        kind: 'prompt',
      },
      relatedItems: [],
      checkRules: [
        'JSON schema unchanged if prompt has dependents',
        'Tone of Voice: direct, adult, no exclamation marks, Ukrainian',
        'CTA is one action, not informational',
      ],
    }
  }

  if (activeTab === 'notifications' && selectedNotification) {
    return {
      type: 'compatibility_check',
      item: {
        id: selectedNotification.id,
        name: selectedNotification.name,
        kind: 'notification',
        time: selectedNotification.time,
        bodyText: selectedNotification.bodyText,
        roles: selectedNotification.roles,
        channels: selectedNotification.channels,
      },
      relatedItems: (notificationAnalysis?.dependencies ?? []).flatMap((dependency) =>
        dependency.relatedScreens.map((value) => ({
          id: value,
          name: value,
          dependency: dependency.name,
        })),
      ),
      checkRules: [
        'No time conflicts between notifications for same role',
        'Tone of Voice: direct, adult, no exclamation marks, Ukrainian',
        'CTA is one action, not informational',
      ],
    }
  }

  return {
    type: 'compatibility_check',
    item: {
      id: selectedFunnelScreen?.id ?? 'unknown-screen',
      funnelId: selectedFunnelDraft?.id ?? selectedFunnelId ?? 'unknown-funnel',
      kind: 'funnelScreen',
      name: selectedFunnelScreen?.title ?? 'Екран воронки',
      bodyText: selectedFunnelScreen?.bodyText ?? '',
      ctaLabel: selectedFunnelScreen?.ctaLabel ?? '',
      typeLabel: selectedFunnelScreen?.type ?? '',
    },
    relatedItems: (funnelAnalysis?.dependencies ?? []).flatMap((dependency) =>
      dependency.relatedItems.map((value) => ({
        id: value,
        name: value,
        dependency: dependency.name,
      })),
    ),
    checkRules: [
      'Tone of Voice: direct, adult, no exclamation marks, Ukrainian',
      'CTA is one action, not informational',
      'No duplicate screens in funnel',
    ],
  }
}

export function buildMasterPanelRightPanelModel({
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
}: {
  activeTab: MasterTab
  activePromptItem: MasterPanelSidebarItem
  activeNotificationItem: MasterPanelSidebarItem
  compatibilityCheck: PromptImpactAnalysisRecord | null
  compatibilityCheckState: 'idle' | 'loading' | 'ready' | 'error'
  runningCompatibilityCheck: boolean
  canEditPrompts: boolean
  canEditNotifications: boolean
  canEditFunnels: boolean
  promptConnections: PromptConnectionImpact
  notificationAnalysis: NotificationAnalysisRecord | null
  funnelAnalysis: FunnelAnalysisRecord | null
  selectedNotification: Notification | null
  selectedFunnelScreen: FunnelScreen | null
  selectedFunnelDraft: Funnel | null
  selectedFunnelId: string | null
  sharedRightPanelItems: Array<{ title: string; body: string; tone: 'info' | 'warning' | 'success' }>
}) {
  const context: RightPanelContext =
    activeTab === 'prompts'
      ? { type: 'prompt', promptId: activePromptItem.promptName ?? activePromptItem.id }
      : activeTab === 'notifications'
        ? { type: 'notification', notificationId: selectedNotification?.id ?? activeNotificationItem.id }
        : { type: 'funnelScreen', screenId: selectedFunnelScreen?.id ?? 'unselected-screen', funnelId: selectedFunnelDraft?.id ?? selectedFunnelId ?? 'unselected-funnel' }

  const title =
    activeTab === 'prompts'
      ? 'Що потрібно памʼятати'
      : activeTab === 'notifications'
        ? selectedNotification?.name ?? 'Нагадування'
        : selectedFunnelScreen?.title ?? 'Екран воронки'

  const summary =
    activeTab === 'prompts'
      ? compatibilityCheck?.summary ?? 'Натисни кнопку, щоб AI перевірив залежності та ризики цього промпта.'
      : activeTab === 'notifications'
        ? compatibilityCheck?.summary ?? notificationAnalysis?.summary ?? selectedNotification?.condition ?? 'Обери нагадування у списку.'
        : compatibilityCheck?.summary ?? selectedFunnelScreen?.bodyText ?? 'Обери screen у flow-списку, щоб побачити редактор, залежності та попередження.'

  const hintDescription =
    activeTab === 'prompts'
      ? 'Перевіряє, як зміна промпта зачепить залежні сценарії, шаблони й суміжні сімейства.'
      : activeTab === 'notifications'
        ? 'Перевіряємо зв’язки, канали, ролі та тональність. Тут немає окремого backend-аналізу, тому працює локальна інспекція.'
        : 'Права панель редагує конкретний екран поточного flow. Тут дивимось промпт, канали, метрики й залежності.'

  const hintInstruction =
    activeTab === 'prompts'
      ? 'Запускай перед збереженням або активацією, щоб не ламати каскад.'
      : activeTab === 'notifications'
        ? 'Клік по linked prompt переведе тебе у вкладку Промпти.'
        : 'Клік по пов’язаному промпту або нагадуванню переводить тебе в потрібний tab.'

  const dependencies: MasterPanelRightPanelDependency[] =
    compatibilityCheck?.dependencies.length
      ? compatibilityCheck.dependencies.map((dependency) => ({
          name: dependency.name,
          severity: dependency.severity,
          reason: dependency.reason,
          relatedItems: dependency.affectedPrompts,
        }))
      : activeTab === 'prompts'
        ? [
            {
              name: 'Нагадування',
              severity: promptConnections.notifications.length ? 'medium' : 'low',
              reason: promptConnections.notifications.length
                ? 'Цей промпт уже використовується в нагадуваннях.'
                : 'Нагадування напряму не підʼєднані.',
              relatedItems: promptConnections.notifications.map((notification) => notification.name),
            },
            {
              name: 'Екрани воронок',
              severity: promptConnections.funnelScreens.length ? 'medium' : 'low',
              reason: promptConnections.funnelScreens.length
                ? 'Цей промпт використовується у flow-екранах воронок.'
                : 'Екрани воронок напряму не підʼєднані.',
              relatedItems: promptConnections.funnelScreens.map((screen) => `${screen.funnelName} · ${screen.screenTitle}`),
            },
          ]
        : activeTab === 'notifications'
          ? (notificationAnalysis?.dependencies ?? []).map((dependency) => ({
              name: dependency.name,
              severity: dependency.severity,
              reason: dependency.reason,
              relatedItems: dependency.relatedScreens,
            }))
          : (funnelAnalysis?.dependencies ?? []).map((dependency) => ({
              name: dependency.name,
              severity: dependency.severity,
              reason: dependency.reason,
              relatedItems: dependency.relatedItems,
            }))

  const warnings: MasterPanelRightPanelWarning[] =
    compatibilityCheck?.warnings.length
      ? compatibilityCheck.warnings.map((warning) => ({ body: warning, tone: 'warning' as const }))
      : activeTab === 'prompts'
        ? [
            ...sharedRightPanelItems.map((item) => ({ title: item.title, body: item.body, tone: item.tone })),
            ...(promptConnections.notifications.length
              ? [{
                  body: `Зміна промпта вплине на нагадування: ${promptConnections.notifications.map((item) => item.name).join(' · ')}`,
                  tone: 'info' as const,
                }]
              : []),
            ...(promptConnections.funnelScreens.length
              ? [{
                  body: `Зміна промпта вплине на екрани воронок: ${promptConnections.funnelScreens.map((item) => `${item.funnelName} · ${item.screenTitle}`).join(' · ')}`,
                  tone: 'info' as const,
                }]
              : []),
          ]
        : activeTab === 'notifications'
          ? notificationAnalysis?.warnings.length
            ? notificationAnalysis.warnings.map((warning) => ({ body: warning, tone: 'warning' as const }))
            : [{ body: 'Поки що конфліктів немає.', tone: 'success' as const }]
          : funnelAnalysis?.warnings.length
            ? funnelAnalysis.warnings.map((warning) => ({ body: warning, tone: 'warning' as const }))
            : [{ body: 'Поки що конфліктів немає.', tone: 'success' as const }]

  const checks: MasterPanelRightPanelCheck[] =
    compatibilityCheck?.checks.length
      ? compatibilityCheck.checks
      : activeTab === 'prompts'
        ? []
        : activeTab === 'notifications'
          ? (notificationAnalysis?.checks ?? [])
          : (funnelAnalysis?.checks ?? [])

  const recommendation =
    compatibilityCheck?.recommendation
      ? compatibilityCheck.recommendation
      : activeTab === 'prompts'
        ? 'Запусти AI-перевірку перед збереженням, якщо промпт уже використовується в сценаріях.'
        : activeTab === 'notifications'
          ? notificationAnalysis?.recommendation
          : funnelAnalysis?.recommendation

  return {
    context,
    title,
    summary,
    hintDescription,
    hintInstruction,
    dependencies,
    warnings,
    checks,
    checksState: compatibilityCheckState,
    recommendation,
    topAction: {
      label: 'Аналізувати вплив',
      loading: runningCompatibilityCheck,
      disabled:
        activeTab === 'prompts'
          ? !canEditPrompts || runningCompatibilityCheck
          : activeTab === 'notifications'
            ? !canEditNotifications || runningCompatibilityCheck
            : !canEditFunnels || runningCompatibilityCheck,
    },
    footerAction: {
      label: 'Аналізувати вплив',
      loading: runningCompatibilityCheck,
      disabled:
        activeTab === 'prompts'
          ? !canEditPrompts || runningCompatibilityCheck
          : activeTab === 'notifications'
            ? !canEditNotifications || runningCompatibilityCheck
            : !canEditFunnels || runningCompatibilityCheck,
    },
  }
}
