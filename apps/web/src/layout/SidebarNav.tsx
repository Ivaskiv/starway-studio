import { NAV_CONFIG, type NavItemConfig, type NavSectionConfig } from '@/features/nav/navConfig'
import { useNavAccess } from '@/features/nav/useNavAccess'
import { useUserProgress } from '@/features/user/hooks/useUserProgress'
import type { UserRole } from '@/features/user/types/user.types'
import { useSmartNavigation } from '@/hooks/useSmartNavigation'
import { cn } from '@/lib/utils'
import { ChevronDown, Lock, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { useLocation } from 'react-router-dom'

export interface SidebarNavItem {
  id: string
  label: string
  icon: ReactNode
  path: string
  visibleTo: UserRole[]
  requiresPaid?: boolean
  requiresEnrollment?: string
  badge?: string
  highlight?: boolean
}

export interface SidebarNavSection {
  id: string
  label: string | null
  visibleTo: UserRole[]
  items: SidebarNavItem[]
  accent?: boolean
}

export const isVisibleFor = (visibleTo: UserRole[], role: UserRole) =>
  visibleTo.length === 0 || visibleTo.includes(role)

const STEP_GROUP_IDS = new Set(['content-machine', 'user-daily', 'expert-daily'])

const iconNode = (Icon?: LucideIcon) => (Icon ? <Icon className="h-4 w-4" /> : null)

const flattenLegacyItems = (items: NavItemConfig[]): SidebarNavItem[] =>
  items.flatMap((item) => {
    const current = item.path
      ? [{
          id: item.id,
          label: item.label,
          icon: iconNode(item.icon),
          path: item.path,
          visibleTo: item.roles as UserRole[],
          requiresPaid: item.requiresPremium,
        }]
      : []

    return [...current, ...(item.children?.length ? flattenLegacyItems(item.children) : [])]
  })

const toLegacy = (sections: NavSectionConfig[]): SidebarNavSection[] =>
  sections.map(section => ({
    id: section.id,
    label: section.label,
    visibleTo: section.roles as UserRole[],
    items: flattenLegacyItems(section.items),
  }))

function matchesPath(currentPath: string, currentSearch: string, href: string) {
  if (href.includes('?')) {
    const [pathname, search = ''] = href.split('?')
    if (currentPath !== pathname) return false
    const currentParams = new URLSearchParams(currentSearch)
    const itemParams = new URLSearchParams(search)
    return Array.from(itemParams.entries()).every(([key, value]) => currentParams.get(key) === value)
  }

  return currentPath === href || currentPath.startsWith(`${href}/`) || `${currentPath}${currentSearch}` === href
}

function resolveDynamicLabel(node: NavItemConfig, zoomLabel: string | null, practicumLabel: string) {
  if (node.dynamicLabel === 'zoom') return zoomLabel ? `Zoom · ${zoomLabel}` : null
  if (node.dynamicLabel === 'practicum') return practicumLabel || null
  return node.label
}

function journeyKeyFor(nodeId: string): 'wheel' | 'morning' | 'tasks' | 'evening' | 'report' | null {
  if (nodeId.includes('wheel')) return 'wheel'
  if (nodeId.includes('morning')) return 'morning'
  if (nodeId.includes('tasks')) return 'tasks'
  if (nodeId.includes('evening')) return 'evening'
  if (nodeId.includes('analysis')) return 'report'
  if (nodeId.includes('report') && !nodeId.includes('reports')) return 'report'
  return null
}

function resolveStatus({
  node,
  role,
  hasPremium,
  active,
  journeyStatus,
  applyJourneyFlow,
  zoomLabel,
  isReportsItem,
}: {
  node: NavItemConfig
  role: UserRole
  hasPremium: boolean
  active: boolean
  journeyStatus: Record<string, 'done' | 'active' | 'locked'>
  applyJourneyFlow: boolean
  zoomLabel: string | null
  isReportsItem: boolean
}): 'done' | 'active' | 'locked' {
  const locked = Boolean(node.requiresPremium && role === 'USER' && !hasPremium)
  if (locked) return 'locked'

  const journeyKey = journeyKeyFor(node.id)
  if (applyJourneyFlow && journeyKey && journeyStatus[journeyKey]) return journeyStatus[journeyKey]
  if (node.dynamicLabel === 'zoom' && zoomLabel) return active ? 'active' : 'done'
  if (isReportsItem) return active ? 'active' : 'done'
  return active ? 'active' : 'done'
}

function renderIndicator({
  kind,
  status,
  icon,
  stepNumber,
}: {
  kind: 'default' | 'reports' | 'step'
  status: 'done' | 'active' | 'locked'
  icon?: LucideIcon
  stepNumber?: number
}) {
  if (kind === 'reports') return null

  const className = cn(
    'inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors',
    status === 'done'
      ? 'border-[rgba(34,197,94,0.35)] bg-[rgba(34,197,94,0.14)] text-[rgb(74,222,128)]'
      : status === 'active'
        ? 'border-[rgba(59,130,246,0.42)] bg-[rgba(59,130,246,0.16)] text-[rgb(96,165,250)]'
        : 'border-[var(--admin-sidebar-border)] bg-[var(--admin-sidebar-item-hover)] text-[var(--admin-sidebar-text-muted)]',
  )

  if (kind === 'step') {
    return <span className={className}>{stepNumber ?? ''}</span>
  }

  const Icon = icon
  return <span className={className}>{Icon ? <Icon className="h-3.5 w-3.5" /> : null}</span>
}

type RenderContext = {
  kind: 'default' | 'reports' | 'step'
  stepNumber?: number
}

function SidebarNode({
  node,
  context,
  collapsed,
  depth,
  currentPath,
  currentSearch,
  openState,
  setOpenState,
  navigateTo,
  openUpgradeModal,
  role,
  hasPremium,
  isLocked,
  applyJourneyFlow,
  zoomLabel,
  practicumLabel,
  journeyStatus,
  weeklyReportAvailable,
}: {
  node: NavItemConfig
  context: RenderContext
  collapsed: boolean
  depth: number
  currentPath: string
  currentSearch: string
  openState: Record<string, boolean>
  setOpenState: Dispatch<SetStateAction<Record<string, boolean>>>
  navigateTo: (path: string, options?: { requiresAuth?: boolean }) => boolean
  openUpgradeModal: () => void
  role: UserRole
  hasPremium: boolean
  isLocked: (item: Pick<NavItemConfig, 'requiresPremium'>) => boolean
  applyJourneyFlow: boolean
  zoomLabel: string | null
  practicumLabel: string
  journeyStatus: Record<string, 'done' | 'active' | 'locked'>
  weeklyReportAvailable: boolean
}) {
  if (!isVisibleFor(node.roles as UserRole[], role)) return null
  if (node.dynamicLabel === 'zoom' && !zoomLabel) return null
  if (node.dynamicLabel === 'practicum' && !practicumLabel) return null
  if (node.id === 'weekly' && !weeklyReportAvailable) return null

  const children = (node.children ?? []).filter(child => isVisibleFor(child.roles as UserRole[], role))
  const visibleChildren = children.filter(child => {
    if (child.dynamicLabel === 'zoom') return Boolean(zoomLabel)
    if (child.dynamicLabel === 'practicum') return Boolean(practicumLabel)
    return true
  })
  const hasChildren = visibleChildren.length > 0
  if (!hasChildren && !node.path) return null

  const resolvedLabel = resolveDynamicLabel(node, zoomLabel, practicumLabel)
  if (!resolvedLabel) return null

  const active = node.path ? matchesPath(currentPath, currentSearch, node.path) : false
  const locked = isLocked(node)
  const isStepGroup = STEP_GROUP_IDS.has(node.id)
  const groupChildActive = isStepGroup
    ? visibleChildren.some(child => child.path ? matchesPath(currentPath, currentSearch, child.path) : false)
    : false
  const status = resolveStatus({
    node,
    role,
    hasPremium,
    active: isStepGroup ? groupChildActive || active : active,
    journeyStatus,
    applyJourneyFlow,
    zoomLabel,
    isReportsItem: context.kind === 'reports',
  })

  const isOpen = openState[node.id] ?? node.defaultCollapsed === false
  const rowClass = cn(
    'group flex w-full items-center rounded-xl border border-transparent transition-all duration-200',
    collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2.5',
    status === 'active'
      ? isStepGroup
        ? 'border-[var(--admin-sidebar-accent-border)] bg-[var(--admin-sidebar-item-active)] text-[var(--admin-sidebar-text-primary)]'
        : 'border-[var(--admin-sidebar-accent-border)] bg-[var(--admin-sidebar-item-active)] text-[var(--admin-sidebar-text-primary)]'
      : status === 'done'
        ? 'text-[var(--admin-sidebar-text-secondary)] hover:bg-[var(--admin-sidebar-item-hover)] hover:text-[var(--admin-sidebar-text-primary)]'
        : 'text-[var(--admin-sidebar-text-muted)] opacity-70',
  )

  const handleNavigate = () => {
    if (locked) {
      openUpgradeModal()
      return
    }
    if (node.path) {
      navigateTo(node.path, { requiresAuth: true })
      return
    }
    if (hasChildren && !isStepGroup) {
      setOpenState(current => ({ ...current, [node.id]: !isOpen }))
    }
  }

  const childContext: RenderContext =
    STEP_GROUP_IDS.has(node.id)
      ? { kind: 'step', stepNumber: 1 }
      : context.kind === 'reports'
        ? { kind: 'reports' }
        : { kind: 'default' }

  return (
    <div className="space-y-1">
      <div className={cn(depth > 0 && context.kind !== 'reports' ? 'pl-5' : '', context.kind === 'reports' ? 'pl-0' : '')}>
        <div className={cn('flex items-center gap-1', collapsed && 'justify-center')}>
          <button
            type="button"
            onClick={handleNavigate}
            className={cn(rowClass, node.path ? 'cursor-pointer' : 'cursor-default')}
          >
            {renderIndicator({
              kind: context.kind,
              status,
              icon: node.icon,
              stepNumber: context.stepNumber,
            })}
            {!collapsed && (
              <>
                <span className={cn('flex-1 truncate text-left leading-5', context.kind === 'reports' ? 'text-[13px] font-medium' : depth > 0 ? 'text-[12px] font-medium' : 'text-[13px] font-medium')}>
                  {resolvedLabel}
                </span>
                {locked && (
                  <span className="flex items-center gap-1 text-[10px] text-[var(--admin-sidebar-text-muted)]">
                    <Lock className="h-3 w-3" />
                  </span>
                )}
              </>
            )}
          </button>

          {hasChildren && !collapsed && !isStepGroup && (
            <button
              type="button"
              onClick={() => setOpenState(current => ({ ...current, [node.id]: !isOpen }))}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-[var(--admin-sidebar-text-muted)] transition-colors hover:bg-[var(--admin-sidebar-item-hover)] hover:text-[var(--admin-sidebar-text-primary)]"
              aria-label={isOpen ? 'Згорнути' : 'Розгорнути'}
            >
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isOpen ? 'rotate-180' : '')} />
            </button>
          )}
        </div>
      </div>

      {hasChildren && (isOpen || isStepGroup) && (
        <div className={cn('space-y-1', depth === 0 ? 'pl-0' : 'pl-4')}>
          {visibleChildren.map((child, childIndex) => (
            <SidebarNode
              key={child.id}
              node={child}
              context={child.children?.length ? { kind: 'default' } : childContext.kind === 'step' ? { kind: 'step', stepNumber: childIndex + 1 } : childContext}
              collapsed={collapsed}
              depth={depth + 1}
              currentPath={currentPath}
              currentSearch={currentSearch}
              openState={openState}
              setOpenState={setOpenState}
              navigateTo={navigateTo}
              openUpgradeModal={openUpgradeModal}
              role={role}
              hasPremium={hasPremium}
              isLocked={isLocked}
              applyJourneyFlow={applyJourneyFlow}
              zoomLabel={zoomLabel}
              practicumLabel={practicumLabel}
              journeyStatus={journeyStatus}
              weeklyReportAvailable={weeklyReportAvailable}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SidebarNavView({ collapsed }: { collapsed: boolean }) {
  const location = useLocation()
  const { navigateTo, openUpgradeModal } = useSmartNavigation()
  const { journeySteps, weeklyReportAvailable, hasUpcomingZoomToday } = useUserProgress()
  const {
    canSee,
    isLocked,
    getZoomSession,
    getPracticumLabel,
    primaryProductId,
    role,
    hasPremium,
  } = useNavAccess()
  const applyJourneyFlow = role === 'USER'

  const currentPath = location.pathname
  const currentSearch = location.search
  const zoomSession = getZoomSession()
  const zoomLabel = zoomSession?.time ?? null
  const practicumLabel = getPracticumLabel(primaryProductId)

  const journeyStatus = useMemo(
    () => (applyJourneyFlow
      ? Object.fromEntries(journeySteps.map(step => [step.id, step.status] as const)) as Record<string, 'done' | 'active' | 'locked'>
      : {}),
    [applyJourneyFlow, journeySteps],
  )

  const visibleSections = useMemo(
    () => NAV_CONFIG.filter(section => canSee(section)),
    [canSee],
  )

  const [openState, setOpenState] = useState<Record<string, boolean>>({})
  const routeKeyRef = useRef<string>('')

  useEffect(() => {
    const routeKey = `${currentPath}${currentSearch}`
    if (routeKeyRef.current === routeKey) return
    routeKeyRef.current = routeKey

    const next: Record<string, boolean> = {}
    const walk = (nodes: NavItemConfig[]) => {
      nodes.forEach((node) => {
        if (!isVisibleFor(node.roles as UserRole[], role)) return
        if (node.dynamicLabel === 'zoom' && !zoomLabel) return
        if (node.dynamicLabel === 'practicum' && !practicumLabel) return
        if (node.id === 'weekly' && !weeklyReportAvailable) return

        const active = node.path ? matchesPath(currentPath, currentSearch, node.path) : false
        const childActive = node.children?.some(child => child.path ? matchesPath(currentPath, currentSearch, child.path) : false) ?? false
        if (node.collapsible && (node.defaultCollapsed === false || active || childActive)) {
          next[node.id] = true
        }
        if (node.children?.length) walk(node.children)
      })
    }

    walk(visibleSections.flatMap(section => section.items))
    setOpenState(current => {
      const merged = { ...current }
      Object.entries(next).forEach(([key, value]) => {
        if (value) merged[key] = true
      })
      return merged
    })
  }, [currentPath, currentSearch, practicumLabel, role, visibleSections, weeklyReportAvailable, zoomLabel])

  const renderSection = (section: NavSectionConfig) => {
    if (!canSee(section)) return null
    const isReports = section.id === 'my-reports'

    return (
      <section key={section.id} className="space-y-1">
        {!collapsed && (
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">
              {section.label}
            </p>
          </div>
        )}

        <div className="space-y-1">
          {section.items.map(item => (
            <SidebarNode
              key={item.id}
              node={item}
              context={{ kind: isReports ? 'reports' : 'default' }}
              collapsed={collapsed}
              depth={0}
              currentPath={currentPath}
              currentSearch={currentSearch}
              openState={openState}
              setOpenState={setOpenState}
              navigateTo={navigateTo}
              openUpgradeModal={openUpgradeModal}
              role={role}
              hasPremium={hasPremium}
              isLocked={isLocked}
              applyJourneyFlow={applyJourneyFlow}
              zoomLabel={zoomLabel}
              practicumLabel={practicumLabel}
              journeyStatus={journeyStatus}
              weeklyReportAvailable={weeklyReportAvailable}
            />
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className={collapsed ? 'space-y-2' : 'space-y-3'}>
      {visibleSections.map(renderSection)}
      {!collapsed && (
        <div className="pt-2 text-[10px] text-[var(--admin-sidebar-text-muted)]">
          {weeklyReportAvailable ? 'Тижневий звіт доступний' : 'Тижневий звіт з’явиться після накопичення даних'}
          {hasUpcomingZoomToday ? ' · Zoom на сьогодні заплановано' : ''}
        </div>
      )}
    </div>
  )
}

export default function SidebarNav(props: { collapsed: boolean }) {
  return <SidebarNavView {...props} />
}

export const SIDEBAR_NAV: SidebarNavSection[] = toLegacy(NAV_CONFIG)
