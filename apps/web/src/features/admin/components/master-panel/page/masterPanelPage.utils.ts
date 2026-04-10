import type { MasterPanelSidebarItem, MasterPanelSidebarSectionView, MasterPanelTab } from '@/features/admin/components/master-panel/MasterPanelSidebar'
import type { FunnelEntity } from '@/features/funnels/services/funnels.api'
import {
  type Funnel,
  type FunnelScreen,
  type FunnelScreenType,
  type FunnelTargetSegment,
} from '@/features/funnels/types/funnel.types'
import type { Notification } from '@/features/notifications/config/notificationPreviewFlows'

import { DEFAULT_FUNNEL_SCREEN_TEMPLATES } from './masterPanelPage.constants'

export type MasterTab = MasterPanelTab

export function isMasterTab(value: string | null): value is MasterTab {
  return value === 'prompts' || value === 'notifications' || value === 'funnels'
}

export function normalizeLookup(value: string) {
  return value.toLowerCase().replace(/[\s_\-→:·/]+/g, '')
}

function matchesByTokens(source: string, tokens: readonly string[]) {
  const normalizedSource = normalizeLookup(source)
  return tokens.some((token) => normalizedSource.includes(normalizeLookup(token)))
}

export function isToday(value?: string) {
  if (!value) return false
  const created = new Date(value)
  if (Number.isNaN(created.getTime())) return false
  return created.toDateString() === new Date().toDateString()
}

export type FunnelTrafficGroup = 'cold' | 'warm' | 'hot' | 'reactivation'

const FUNNEL_TRAFFIC_GROUPS: Array<{
  id: FunnelTrafficGroup
  label: string
  tag: 'cold' | 'warm' | 'hot' | 're'
  hint: string
}> = [
  { id: 'cold', label: 'Холодний трафік', tag: 'cold', hint: 'Потрібен контекст і окремий лендінг.' },
  { id: 'warm', label: 'Теплий трафік', tag: 'warm', hint: 'Людина вже в контексті й готова до апсейлу.' },
  { id: 'hot', label: 'Гарячий трафік', tag: 'hot', hint: 'Особистий контакт або пряма конверсія.' },
  { id: 'reactivation', label: 'Реактивація', tag: 're', hint: 'Повернення в систему через сигнали й нагадування.' },
]

function inferFunnelTrafficGroup(funnel: Pick<FunnelEntity, 'name' | 'code'>): FunnelTrafficGroup {
  const source = `${funnel.name} ${funnel.code}`.toLowerCase()
  if (/(pause|пауза|reactivation|повернення|return|d6)/i.test(source)) return 'reactivation'
  if (/(mentor|наставниц|year|річн|personal|особист)/i.test(source)) return 'hot'
  if (/(monthly|місячн|paid|платн|subscription|апсейл)/i.test(source)) return 'warm'
  return 'cold'
}

export function buildFunnelSidebarSections(funnels: FunnelEntity[]): MasterPanelSidebarSectionView[] {
  const groups = new Map<FunnelTrafficGroup, MasterPanelSidebarItem[]>()
  for (const group of FUNNEL_TRAFFIC_GROUPS) groups.set(group.id, [])

  for (const funnel of funnels) {
    const group = inferFunnelTrafficGroup(funnel)
    const meta = FUNNEL_TRAFFIC_GROUPS.find((item) => item.id === group)!
    groups.get(group)?.push({
      id: `funnel.dynamic.${funnel.id}`,
      tab: 'funnels',
      kind: 'funnel',
      label: funnel.name,
      tag: meta.tag,
      hint: funnel.code ? funnel.code.replace(/[_-]+/g, ' · ') : meta.hint,
      funnelAliases: [funnel.name, funnel.code],
      funnelId: funnel.id,
    })
  }

  return FUNNEL_TRAFFIC_GROUPS.map((group) => ({
    id: `funnels-${group.id}`,
    label: group.label,
    items: groups.get(group.id) ?? [],
  })).filter((section) => section.items.length > 0)
}

export function promptMatchesItem(prompt: { name: string; content: string }, item: MasterPanelSidebarItem) {
  const tokens = [item.promptName, item.label, item.hint, ...(item.aliases ?? [])].filter((value): value is string => Boolean(value))
  const source = `${prompt.name} ${prompt.content}`
  return matchesByTokens(source, tokens)
}

export function funnelMatchesItem(funnel: { name: string; code: string }, item: MasterPanelSidebarItem) {
  const tokens = [item.label, item.hint, ...(item.funnelAliases ?? [])].filter((value): value is string => Boolean(value))
  const source = `${funnel.name} ${funnel.code}`
  return matchesByTokens(source, tokens)
}

function parseNotificationTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}

export interface NotificationAnalysisDependency {
  name: string
  severity: 'high' | 'medium' | 'low'
  reason: string
  relatedScreens: string[]
}

export interface NotificationAnalysisCheck {
  title: string
  body: string
  tone: 'info' | 'warning' | 'success'
}

export interface NotificationAnalysisRecord {
  summary: string
  recommendation: string
  warnings: string[]
  dependencies: NotificationAnalysisDependency[]
  checks: NotificationAnalysisCheck[]
  linkedPromptName?: string
}

export function buildNotificationAnalysis(
  notification: Notification | null,
  allNotifications: Notification[],
  promptLookup: Map<string, string>,
  funnels: Funnel[],
): NotificationAnalysisRecord | null {
  if (!notification) return null

  const linkedPromptName = notification.linkedPromptId ? promptLookup.get(notification.linkedPromptId) : undefined
  const timeInMinutes = parseNotificationTime(notification.time)
  const sameRoleConflicts = timeInMinutes == null
    ? []
    : allNotifications.filter((item) => {
        if (item.id === notification.id || !item.active) return false
        if (!item.roles.some((role) => notification.roles.includes(role))) return false
        const itemTime = parseNotificationTime(item.time)
        if (itemTime == null) return false
        return Math.abs(itemTime - timeInMinutes) <= 30
      })

  const warnings: string[] = []
  const relatedFunnels = funnels.filter((funnel) =>
    funnel.screens.some((screen) => {
      if (screen.linkedNotificationId === notification.id) return true
      return notification.triggerScreens?.some((value) => normalizeLookup(value) === normalizeLookup(screen.title)) ?? false
    }),
  )

  if (!notification.bodyText.trim()) warnings.push('Текст повідомлення порожній. Краще додати короткий прямий CTA.')
  if (notification.bodyText.includes('!') || notification.condition.includes('!')) {
    warnings.push('Забагато емоційних знаків. Бренд-voice тут має бути спокійніший.')
  }
  if (sameRoleConflicts.length) {
    warnings.push(`Конфлікт часу з: ${sameRoleConflicts.slice(0, 2).map((item) => item.name).join(' · ')}`)
  }

  const dependencies: NotificationAnalysisDependency[] = [
    {
      name: 'Тригери сценарію',
      severity: notification.triggerScreens?.length ? 'medium' : 'low',
      reason: notification.triggerScreens?.length
        ? 'Цей шаблон прив’язаний до конкретних екранів і станів циклу.'
        : 'Сценарій поки не описаний окремими екранами.',
      relatedScreens: notification.triggerScreens ?? [],
    },
    {
      name: 'Linked prompt',
      severity: notification.linkedPromptId ? 'high' : 'low',
      reason: notification.linkedPromptId
        ? `Шаблон залежить від промпта ${notification.linkedPromptId}.`
        : 'Промпт напряму не підв’язаний.',
      relatedScreens: linkedPromptName ? [linkedPromptName] : [],
    },
    {
      name: 'Воронки',
      severity: relatedFunnels.length ? 'medium' : 'low',
      reason: relatedFunnels.length
        ? 'Шаблон привʼязаний до funnel-сценаріїв.'
        : 'Прямих звʼязків із воронками поки немає.',
      relatedScreens: relatedFunnels.map((funnel) => funnel.name),
    },
  ]

  const checks: NotificationAnalysisCheck[] = [
    {
      title: 'Tone of voice',
      body: notification.bodyText.includes('!')
        ? 'Текст звучить занадто емоційно. Краще зробити його прямішим і спокійнішим.'
        : 'Текст звучить спокійно, по-дорослому і без зайвого тиску.',
      tone: notification.bodyText.includes('!') ? 'warning' : 'success',
    },
    {
      title: 'Час доставки',
      body: timeInMinutes == null
        ? 'Час не має фіксованого формату. Для runtime це може бути окремий кейс.'
        : sameRoleConflicts.length
          ? 'Є близькі по часу нагадування для тих самих ролей. Перевір порядок відправки.'
          : 'Час виглядає чисто і не конфліктує з іншими шаблонами.',
      tone: timeInMinutes == null || sameRoleConflicts.length ? 'warning' : 'success',
    },
  ]

  if (linkedPromptName) {
    checks.unshift({
      title: 'Linked prompt',
      body: `Прив’язка до промпта знайдена: ${linkedPromptName}. Можна відкрити його прямо з правої панелі.`,
      tone: 'info',
    })
  }

  return {
    summary: notification.condition.trim() ? notification.condition : 'Шаблон готовий до перевірки.',
    recommendation: warnings.length
      ? 'Спочатку прибери конфлікти часу або тональності, потім активуй шаблон.'
      : 'Шаблон виглядає стабільно. Можна лишати активним.',
    warnings,
    dependencies,
    checks,
    linkedPromptName,
  }
}

export interface FunnelAnalysisDependency {
  name: string
  severity: 'high' | 'medium' | 'low'
  reason: string
  relatedItems: string[]
}

export interface FunnelAnalysisCheck {
  title: string
  body: string
  tone: 'info' | 'warning' | 'success'
}

export interface FunnelAnalysisRecord {
  summary: string
  recommendation: string
  warnings: string[]
  dependencies: FunnelAnalysisDependency[]
  checks: FunnelAnalysisCheck[]
  connectedNotifications: Notification[]
  linkedPromptName?: string
}

export interface PromptConnectionImpact {
  notifications: Notification[]
  funnelScreens: Array<{ funnelId: string; funnelName: string; screenId: string; screenTitle: string }>
}

export function buildFunnelAnalysis(
  funnel: Funnel | null,
  screen: FunnelScreen | null,
  notifications: Notification[],
  promptLookup: Map<string, string>,
  promptNames: string[],
): FunnelAnalysisRecord | null {
  if (!funnel || !screen) return null

  const linkedPromptName = screen.aiPromptId ? promptLookup.get(screen.aiPromptId) ?? screen.aiPromptId : undefined
  const connectedNotifications = notifications.filter((notification) => {
    if (screen.linkedNotificationId && notification.id === screen.linkedNotificationId) return true
    return notification.triggerScreens?.some((value) => normalizeLookup(value) === normalizeLookup(screen.title)) ?? false
  })

  const warnings: string[] = []
  if (!screen.title.trim()) warnings.push('Екран без назви буде важко підтримувати в потоці.')
  if (!screen.bodyText.trim()) warnings.push('Текст екрана порожній. Flow втратить пояснення.')
  if (!screen.channels.length) warnings.push('Екран без каналів не буде доставлений жодним шляхом.')
  if (!screen.aiPromptId) warnings.push('Для цього екрана ще не підвʼязаний AI-промпт.')
  if (screen.aiPromptId && !promptNames.includes(screen.aiPromptId)) {
    warnings.push('Обраний AI-промпт не знайдено у вкладці "Промпти".')
  }

  const promptCompatibilityByType: Record<FunnelScreenType, string[]> = {
    lead_magnet: ['funnel_analysis', 'daily_ai_insight', 'morning_session'],
    instant_value: ['daily_ai_insight', 'funnel_analysis'],
    cta: ['funnel_analysis', 'trial_conversion'],
    onboarding: ['morning_session', 'evening_session'],
    activation: ['streak_risk', 'evening_session', 'trial_conversion'],
    conversion: ['trial_conversion', 'weekly_report'],
  }

  if (
    screen.aiPromptId &&
    !promptCompatibilityByType[screen.type].some((token) => normalizeLookup(screen.aiPromptId ?? '').includes(normalizeLookup(token)))
  ) {
    warnings.push('AI-промпт може бути слабко сумісним із цим типом екрана.')
  }
  if (screen.type === 'activation' && !connectedNotifications.length) {
    warnings.push('Activation-екран повинен мати хоча б одне підключене нагадування.')
  }

  return {
    summary: screen.bodyText.trim() || 'Екран готовий до перевірки.',
    recommendation: warnings.length
      ? 'Спочатку виправ залежності або тональність, а потім рухай далі.'
      : 'Екран виглядає стабільно. Можна лишати його у flow.',
    warnings,
    dependencies: [
      {
        name: 'AI prompt',
        severity: screen.aiPromptId ? 'medium' : 'low',
        reason: linkedPromptName ? `Підвʼязаний промпт: ${linkedPromptName}.` : 'Підвʼязаний промпт не знайдено або ще не обрано.',
        relatedItems: linkedPromptName ? [linkedPromptName] : [],
      },
      {
        name: 'Нагадування',
        severity: connectedNotifications.length ? 'medium' : screen.type === 'activation' ? 'high' : 'low',
        reason: connectedNotifications.length
          ? 'Доступні авто-підключення до нагадувань з Tab B.'
          : 'Поки що екран не повʼязаний із жодним нагадуванням.',
        relatedItems: connectedNotifications.map((notification) => notification.name),
      },
    ],
    checks: [
      {
        title: 'Tone of voice',
        body: screen.bodyText.includes('!')
          ? 'Текст занадто емоційний. Краще зробити його прямішим і спокійнішим.'
          : 'Текст звучить спокійно і по-дорослому.',
        tone: screen.bodyText.includes('!') ? 'warning' : 'success',
      },
      {
        title: 'Крокова логіка',
        body: screen.order > 1
          ? 'Екран стоїть у середині flow і має логічний перехід від попереднього кроку.'
          : 'Перший екран задає вхід у воронку без зайвого шуму.',
        tone: 'info',
      },
    ],
    connectedNotifications,
    linkedPromptName,
  }
}

export function buildPromptConnections(
  promptName: string | null,
  notifications: Notification[],
  funnels: Funnel[],
): PromptConnectionImpact {
  if (!promptName) return { notifications: [], funnelScreens: [] }

  return {
    notifications: notifications.filter((notification) => notification.linkedPromptId === promptName),
    funnelScreens: funnels.flatMap((funnel) =>
      funnel.screens
        .filter((screen) => screen.aiPromptId === promptName)
        .map((screen) => ({
          funnelId: funnel.id,
          funnelName: funnel.name,
          screenId: screen.id,
          screenTitle: screen.title,
        })),
    ),
  }
}

export function normalizeFunnelStatus(value: string | undefined | null): Funnel['status'] {
  if (value === 'active' || value === 'archived') return value
  return 'draft'
}

export function normalizeFunnelTargetSegment(value: string | undefined | null, sourceText = ''): FunnelTargetSegment {
  const source = `${value ?? ''} ${sourceText}`.toLowerCase()
  if (source.includes('trial')) return 'trial'
  if (source.includes('monthly')) return 'monthly'
  if (source.includes('year')) return 'yearly'
  if (source.includes('mentor')) return 'mentor'
  return 'free_practice'
}

export function createFunnelScreenId(funnelId: string, order: number) {
  return `${funnelId}.screen.${String(order).padStart(2, '0')}`
}

export function buildDefaultFunnelScreens(funnel: FunnelEntity): FunnelScreen[] {
  const stageNames = (funnel.stages ?? []).map((stage) => stage.name).filter(Boolean)
  return DEFAULT_FUNNEL_SCREEN_TEMPLATES.map((template, index) => ({
    ...template,
    id: createFunnelScreenId(funnel.id, index + 1),
    order: index + 1,
    title: stageNames[index] ?? template.title,
    metrics: { opened: 0, passedCta: 0, trialStart: 0, converted: 0 },
  }))
}

export function hydrateFunnelDraft(funnel: FunnelEntity): Funnel {
  return {
    id: funnel.id,
    name: funnel.name,
    status: normalizeFunnelStatus(funnel.status),
    version: funnel.version ?? 'v1',
    targetSegment: normalizeFunnelTargetSegment(funnel.targetSegment, `${funnel.name} ${funnel.code}`),
    screens: Array.isArray(funnel.screens) && funnel.screens.length ? funnel.screens : buildDefaultFunnelScreens(funnel),
    createdAt: funnel.createdAt,
    updatedAt: funnel.updatedAt,
  }
}

export function safeNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

export function buildPromptPanelChecks(promptConnections: PromptConnectionImpact) {
  return [
    {
      title: 'Повʼязані сценарії',
      body:
        promptConnections.notifications.length || promptConnections.funnelScreens.length
          ? `Звʼязки знайдено: ${promptConnections.notifications.length} нагадувань, ${promptConnections.funnelScreens.length} екранів воронок.`
          : 'Прямих звʼязків із нагадуваннями чи воронками не знайдено.',
      tone:
        promptConnections.notifications.length || promptConnections.funnelScreens.length
          ? 'info'
          : 'success',
    },
  ] as const
}
