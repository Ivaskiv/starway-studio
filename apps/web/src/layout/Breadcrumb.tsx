import { useEffect, useMemo } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { ROUTES, normalizeDashboardRoutePath } from '@/config/routes'
import { buildContentStudioStepDefinitions } from '@/features/content-studio/config/contentStudio.steps'
import type { ContentStudioStep } from '@/features/content-studio/config/contentStudio.config'
import { useSessionOrchestrator } from '@/features/auth/context/SessionOrchestratorContext'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGetMyProductsQuery } from '@/features/products/services/products.api'
import { useGetLatestWheelAssessmentQuery, useGetWheelCooldownQuery } from '@/features/wheel/services/wheel.api'
import { cn } from '@/lib/utils'

export type BreadcrumbSegment = {
  label: string
  path?: string
}

type WheelStatus = {
  completedAt: string | null
  nextDueAt: string | null
}

const CONTENT_STEP_LABELS = new Map(
  buildContentStudioStepDefinitions(true)
    .filter(step => step.step > 0)
    .map(step => [step.step, step.title] as const),
)

const MINI_COURSE_TITLES: Record<string, string> = {
  'ai-mentor': 'Ментор',
  'five-points': '5 точок опори',
  'system-21': 'Система 21',
  fears: 'Страхи',
  'code-of-change': 'Код змін',
  'state-mastery': 'Стан — ключ до успіху',
  consultation: 'Консультація з Надею',
}

const DASHBOARD_ROOT = '/dashboard'
const DASHBOARD_ROOT_CANONICAL = ROUTES.DASHBOARD
const dashboardSectionPath = (section: string) => `${ROUTES.DASHBOARD}?section=${section}`

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9а-яіїєґ-]+/gi, '')
}

function humanizeSlug(value: string) {
  return value
    .replace(/[-_/]+/g, ' ')
    .replace(/\b\p{L}/gu, char => char.toUpperCase())
    .trim()
}

function parseStep(searchParams: URLSearchParams) {
  const raw = searchParams.get('step')
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function getSlugFromPath(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  return segments[segments.length - 1] ?? ''
}

function resolvePracticumTitle(pathname: string, products: Array<{ id: string; name: string; title: string }>) {
  const routeSlug = normalizeSlug(getSlugFromPath(pathname))
  if (!routeSlug) return ''

  const cachedProduct = products.find(item => {
    const candidates = [
      item.id,
      item.name,
      item.title,
      (item as any)?.slug,
      (item as any)?.sendpulseTitle,
      (item as any)?.practicum?.sendpulseTitle,
      (item as any)?.practicum?.slug,
      (item as any)?.practicum?.sendpulseSlug,
    ]

    return candidates.some(candidate => normalizeSlug(String(candidate ?? '')) === routeSlug)
  })

  if (cachedProduct) {
    const label =
      (cachedProduct as any)?.practicum?.sendpulseTitle
      ?? (cachedProduct as any)?.sendpulseTitle
      ?? cachedProduct.title
      ?? cachedProduct.name
      ?? ''
    return typeof label === 'string' ? label.trim() : ''
  }

  return MINI_COURSE_TITLES[routeSlug] ?? humanizeSlug(routeSlug)
}

function createSegment(label: string, path?: string): BreadcrumbSegment {
  return { label, ...(path ? { path } : {}) }
}

export function shouldShowWheel(wheelStatus: WheelStatus) {
  if (wheelStatus.completedAt === null) return true
  if (!wheelStatus.nextDueAt) return false

  const dueDate = new Date(wheelStatus.nextDueAt)
  if (Number.isNaN(dueDate.getTime())) return false
  return dueDate <= new Date()
}

export function resolveSegments(
  pathname: string,
  searchParams: URLSearchParams,
  _wheelStatus: WheelStatus,
  practicumTitle?: string,
): BreadcrumbSegment[] {
  const section = searchParams.get('section')
  const step = parseStep(searchParams)
  const session = searchParams.get('session')

  const isDashboardRoot = pathname === DASHBOARD_ROOT && !section
  const isContentRoute = pathname === '/content-studio' || (pathname === DASHBOARD_ROOT && section === 'content')
  const isWheelRoute = pathname === '/wheel' || pathname === '/dashboard/wheel' || (pathname === DASHBOARD_ROOT && section === 'wheel')
  const isJournalRoute = pathname === '/journal' || pathname === '/dashboard/journal' || pathname === '/dashboard/calendar' || (pathname === DASHBOARD_ROOT && section === 'journal')
  const isPracticumRoute = pathname === '/practicums' || pathname === '/dashboard/courses' || pathname.startsWith('/practicums/') || pathname.startsWith('/dashboard/courses/')
  const isReportsRoute = pathname === '/reports/weekly' || pathname === '/reports/monthly' || pathname === '/reports/all' || pathname === '/dashboard/progress' || pathname === '/dashboard/journal' || (pathname === DASHBOARD_ROOT && section === 'reports')
  const isProfileRoute = pathname === '/profile' || pathname === '/dashboard/profile' || (pathname === DASHBOARD_ROOT && section === 'profile')
  const isProductsRoute = pathname === '/products' || pathname === '/dashboard/products' || pathname.startsWith('/dashboard/products/')
  if (isDashboardRoot) {
    return [createSegment('Мій кабінет')]
  }

  if (isWheelRoute) {
    return [
      createSegment('Мій шлях', DASHBOARD_ROOT_CANONICAL),
      createSegment('Колесо балансу'),
    ]
  }

  if (pathname === '/wheel/start') {
    return [
      createSegment('Мій шлях', DASHBOARD_ROOT_CANONICAL),
      createSegment('Колесо балансу', ROUTES.WHEEL),
      createSegment('Старт'),
    ]
  }

  if (
    pathname === '/daily/morning'
    || (pathname === '/dashboard/cycle' && session === 'morning')
  ) {
    return [
      createSegment('ABsystem', dashboardSectionPath('products')),
      createSegment('Щоденний цикл', ROUTES.CYCLE),
      createSegment('Ранок'),
    ]
  }

  if (
    pathname === '/daily/tasks'
    || pathname === '/dashboard/microtasks'
    || pathname === '/dashboard/tasks'
    || (pathname === '/dashboard/cycle' && session === 'tasks')
  ) {
    return [
      createSegment('ABsystem', dashboardSectionPath('products')),
      createSegment('Щоденний цикл', ROUTES.CYCLE),
      createSegment('Мікрозавдання'),
    ]
  }

  if (
    pathname === '/daily/evening'
    || (pathname === '/dashboard/cycle' && session === 'evening')
  ) {
    return [
      createSegment('ABsystem', dashboardSectionPath('products')),
      createSegment('Щоденний цикл', ROUTES.CYCLE),
      createSegment('Вечір'),
    ]
  }

  if (
    pathname === '/daily/analysis'
    || (pathname === '/dashboard/cycle' && session === 'analysis')
  ) {
    return [
      createSegment('ABsystem', dashboardSectionPath('products')),
      createSegment('Щоденний цикл', ROUTES.CYCLE),
      createSegment('Аналіз дня'),
    ]
  }

  if (pathname === '/dashboard/cycle') {
    return [
      createSegment('ABsystem', dashboardSectionPath('products')),
      createSegment('Щоденний цикл'),
    ]
  }

  if (pathname === '/dashboard/goals') {
    return [
      createSegment('Мій шлях', DASHBOARD_ROOT_CANONICAL),
      createSegment('Цілі'),
    ]
  }

  if (pathname === '/dashboard/vision') {
    return [
      createSegment('Мій шлях', DASHBOARD_ROOT_CANONICAL),
      createSegment('WEB-Карта'),
    ]
  }

  if (pathname === '/dashboard/actions') {
    return [
      createSegment('Мій шлях', DASHBOARD_ROOT_CANONICAL),
      createSegment('Дії'),
    ]
  }

  if (pathname === '/journal/zoom') {
    return [
      createSegment('Мій шлях', DASHBOARD_ROOT_CANONICAL),
      createSegment('Щоденник', ROUTES.JOURNAL),
      createSegment('Zoom-сесії'),
    ]
  }

  if (isJournalRoute) {
    return [
      createSegment('Мій шлях', DASHBOARD_ROOT_CANONICAL),
      createSegment('Щоденник'),
    ]
  }

  if (pathname.startsWith('/practicums/') || pathname.startsWith('/dashboard/courses/')) {
    const title = practicumTitle?.trim() || resolvePracticumTitle(pathname, [])
    if (!title) return []

    return [
      createSegment('Мій шлях', DASHBOARD_ROOT_CANONICAL),
      createSegment('Практикуми', ROUTES.COURSES),
      createSegment(title),
    ]
  }

  if (pathname === '/practicums' || pathname === '/dashboard/courses') {
    return [
      createSegment('Мій шлях', DASHBOARD_ROOT_CANONICAL),
      createSegment('Практикуми'),
    ]
  }

  if (pathname === '/reports/weekly') {
    return [
      createSegment('Шлях', ROUTES.JOURNAL),
      createSegment('Тижневий'),
    ]
  }

  if (pathname === '/reports/monthly') {
    return [
      createSegment('Шлях', ROUTES.JOURNAL),
      createSegment('Місячний'),
    ]
  }

  if (isReportsRoute) {
    return [
      createSegment('Шлях', ROUTES.JOURNAL),
      createSegment('Загальний'),
    ]
  }

  if (isProfileRoute) {
    return [createSegment('Профіль')]
  }

  if (pathname === '/dashboard/settings') {
    return [
      createSegment('Профіль', ROUTES.PROFILE),
      createSegment('Налаштування'),
    ]
  }

  if (pathname === '/dashboard/subscription') {
    return [
      createSegment('Мій кабінет', DASHBOARD_ROOT_CANONICAL),
      createSegment('Підписка'),
    ]
  }

  if (pathname === '/dashboard/notifications') {
    return [
      createSegment('Мій кабінет', DASHBOARD_ROOT_CANONICAL),
      createSegment('Сповіщення'),
    ]
  }

  if (isContentRoute) {
    const baseSegments = [
      createSegment('Контент і продажі', DASHBOARD_ROOT_CANONICAL),
      createSegment('Content Machine', dashboardSectionPath('content')),
    ]

    if (step === null || step === 0) return baseSegments

    const stepLabel = CONTENT_STEP_LABELS.get(step as ContentStudioStep)
    if (!stepLabel) return []

    return [...baseSegments, createSegment(stepLabel)]
  }

  if (pathname === '/funnel' || pathname === '/dashboard/leadmagnet' || (pathname === DASHBOARD_ROOT && section === 'leadmagnet')) {
    return [
      createSegment('Контент і продажі', DASHBOARD_ROOT_CANONICAL),
      createSegment('Воронка'),
    ]
  }

  if (pathname === '/telegram' || pathname === '/dashboard/telegram' || (pathname === DASHBOARD_ROOT && section === 'telegram')) {
    return [
      createSegment('Контент і продажі', DASHBOARD_ROOT_CANONICAL),
      createSegment('Telegram'),
    ]
  }

  if (pathname === '/seo' || pathname === '/dashboard/ai-seo' || (pathname === DASHBOARD_ROOT && section === 'ai-seo')) {
    return [
      createSegment('Контент і продажі', DASHBOARD_ROOT_CANONICAL),
      createSegment('SEO'),
    ]
  }

  if (isProductsRoute || (pathname === DASHBOARD_ROOT && section === 'products')) {
    if (pathname.startsWith('/dashboard/products/')) {
      const title = resolvePracticumTitle(pathname, [])
      if (!title) return []

      return [
        createSegment('Мій кабінет', DASHBOARD_ROOT_CANONICAL),
        createSegment('Продукти', ROUTES.PRODUCTS),
        createSegment(title),
      ]
    }

    return [
      createSegment('Мій кабінет', DASHBOARD_ROOT_CANONICAL),
      createSegment('Продукти'),
    ]
  }

  if (pathname === '/users' || pathname === '/dashboard/students' || (pathname === DASHBOARD_ROOT && section === 'students')) {
    return [
      createSegment('Аналітика і система', DASHBOARD_ROOT_CANONICAL),
      createSegment('Користувачі'),
    ]
  }

  if (pathname === '/analytics' || pathname === '/dashboard/admin/revenue') {
    return [
      createSegment('Аналітика і система', DASHBOARD_ROOT_CANONICAL),
      createSegment('Аналітика'),
    ]
  }

  if (pathname === '/calendar' || pathname === '/dashboard/calendar') {
    return [
      createSegment('Аналітика і система', DASHBOARD_ROOT_CANONICAL),
      createSegment('Календар'),
    ]
  }

  if (pathname === '/system' || (pathname === DASHBOARD_ROOT && section === 'system')) {
    return [
      createSegment('Аналітика і система', DASHBOARD_ROOT_CANONICAL),
      createSegment('Система'),
    ]
  }

  return []
}

export default function Breadcrumb() {
  const { user } = useAuth()
  const { appState: sessionStatus } = useSessionOrchestrator()
  const shouldSkipProtectedQueries = sessionStatus !== 'authenticated'
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const normalizedPathname = useMemo(() => normalizeDashboardRoutePath(pathname), [pathname])

  const userId = user?.id ?? ''
  const stableQueryOptions = {
    skip: shouldSkipProtectedQueries || !userId,
    refetchOnFocus: false,
    refetchOnReconnect: false,
    refetchOnMountOrArgChange: false,
  } as const
  const { data: latestWheel } = useGetLatestWheelAssessmentQuery(userId, stableQueryOptions)
  const { data: wheelCooldown } = useGetWheelCooldownQuery(userId, stableQueryOptions)
  const { data: products = [] } = useGetMyProductsQuery(undefined, stableQueryOptions)

  useEffect(() => {
    console.log('[AUTH][frontend] session status', sessionStatus)
    if (shouldSkipProtectedQueries) {
      console.log('[AUTH][frontend] protected queries skipped')
    }
  }, [sessionStatus, shouldSkipProtectedQueries])

  const wheelStatus = useMemo<WheelStatus>(() => ({
    completedAt: latestWheel?.completedAt ?? null,
    nextDueAt: wheelCooldown?.nextWheelAt ?? null,
  }), [latestWheel?.completedAt, wheelCooldown?.nextWheelAt])

  const practicumTitle = useMemo(() => {
    if (
      normalizedPathname.startsWith('/practicums/')
      || normalizedPathname.startsWith('/dashboard/courses/')
    ) {
      return resolvePracticumTitle(normalizedPathname, products)
    }
    return ''
  }, [normalizedPathname, products])

  const segments = useMemo(
    () => resolveSegments(normalizedPathname, searchParams, wheelStatus, practicumTitle),
    [normalizedPathname, practicumTitle, searchParams, wheelStatus],
  )

  if (!segments.length) return null

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-y-2 px-3 py-2 text-sm">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1

        return (
          <span key={`${segment.label}-${index}`} className="inline-flex items-center">
            {index > 0 ? <span className="mx-2 text-[var(--text-muted)]">›</span> : null}
            {segment.path && !isLast ? (
              <Link
                to={segment.path}
                className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
              >
                {segment.label}
              </Link>
            ) : (
              <span
                className={cn(
                  'font-medium',
                  isLast
                    ? 'text-[rgb(var(--accent-soft-rgb))] underline decoration-[rgba(var(--accent-rgb),0.62)] decoration-2 underline-offset-4'
                    : 'text-[var(--text-muted)]',
                )}
              >
                {segment.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
