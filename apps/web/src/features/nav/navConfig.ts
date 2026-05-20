import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  CalendarDays,
  BookOpen,
  GraduationCap,
  Package2,
  Search,
  Send,
  Settings,
  Sparkles,
  LayoutGrid,
  Target,
  Users,
  Video,
  Workflow,
} from 'lucide-react'
import { ROUTES, toAppRoutePath } from '@/config/routes'

export type NavRole = 'USER' | 'EXPERT' | 'ADMIN' | 'SUPERADMIN'

export interface NavItemConfig {
  id: string
  label: string
  icon?: LucideIcon
  path?: string
  roles: NavRole[]
  requiresPremium?: boolean
  children?: NavItemConfig[]
  collapsible?: boolean
  defaultCollapsed?: boolean
  dynamicLabel?: 'zoom' | 'practicum'
}

export interface NavSectionConfig {
  id: string
  label: string
  roles: NavRole[]
  items: NavItemConfig[]
}

const ALL_ROLES: NavRole[] = ['USER', 'EXPERT', 'ADMIN', 'SUPERADMIN']
const USER_ROLES: NavRole[] = ['USER']
const STAFF_ROLES: NavRole[] = ['EXPERT', 'ADMIN']
const PRODUCT_OWNER_ROLES: NavRole[] = ['EXPERT', 'ADMIN', 'SUPERADMIN']
const SUPERADMIN_ROLES: NavRole[] = ['SUPERADMIN']
const dashboardSectionPath = (section: string, extraSearch = '') =>
  `${ROUTES.DASHBOARD}?section=${section}${extraSearch}`

const CONTENT_MACHINE_STEPS: NavItemConfig[] = [
  { id: 'content-step-1', label: 'Контекст', roles: PRODUCT_OWNER_ROLES, path: dashboardSectionPath('content', '&step=1') },
  { id: 'content-step-2', label: 'СТА', roles: PRODUCT_OWNER_ROLES, path: dashboardSectionPath('content', '&step=2') },
  { id: 'content-step-3', label: 'Hook', roles: PRODUCT_OWNER_ROLES, path: dashboardSectionPath('content', '&step=3') },
  { id: 'content-step-4', label: 'Дослідження', roles: PRODUCT_OWNER_ROLES, path: dashboardSectionPath('content', '&step=4') },
  { id: 'content-step-5', label: 'Формула', roles: PRODUCT_OWNER_ROLES, path: dashboardSectionPath('content', '&step=5') },
  { id: 'content-step-6', label: 'API', roles: PRODUCT_OWNER_ROLES, path: dashboardSectionPath('content', '&step=6') },
  { id: 'content-step-7', label: 'Текст × 3', roles: PRODUCT_OWNER_ROLES, path: dashboardSectionPath('content', '&step=7') },
  { id: 'content-step-8', label: 'Банери × 3', roles: PRODUCT_OWNER_ROLES, path: dashboardSectionPath('content', '&step=8') },
  { id: 'content-step-9', label: 'Reels Engine', roles: PRODUCT_OWNER_ROLES, path: dashboardSectionPath('content', '&step=9') },
  { id: 'content-step-10', label: 'Lead magnet', roles: PRODUCT_OWNER_ROLES, path: dashboardSectionPath('content', '&step=10') },
]

export const NAV_CONFIG: NavSectionConfig[] = [
  {
    id: 'profile',
    label: 'ПРОФІЛЬ',
    roles: ALL_ROLES,
    items: [
      { id: 'profile-home', label: 'Профіль', icon: Sparkles, path: ROUTES.PROFILE, roles: ALL_ROLES },
      { id: 'profile-journal', label: 'Щоденник', icon: BookOpen, path: ROUTES.JOURNAL, roles: ALL_ROLES, requiresPremium: true },
    ],
  },
  {
    id: 'my-path',
    label: 'МІЙ ШЛЯХ',
    roles: USER_ROLES,
    items: [
      {
        id: 'user-subscriptions',
        label: 'Мої підписки',
        icon: Package2,
        roles: USER_ROLES,
        collapsible: true,
        defaultCollapsed: false,
        children: [
          {
            id: 'user-absystem',
            label: 'ABsystem',
            icon: Sparkles,
            roles: USER_ROLES,
            collapsible: true,
            defaultCollapsed: false,
            children: [
              { id: 'user-wheel', label: 'Колесо балансу', icon: Target, path: ROUTES.WHEEL, roles: USER_ROLES },
              {
                id: 'user-daily',
                label: 'Щоденний цикл',
                icon: CalendarDays,
                roles: USER_ROLES,
                collapsible: true,
                defaultCollapsed: false,
                children: [
                  { id: 'user-morning', label: 'Ранок', roles: USER_ROLES, requiresPremium: true, path: `${ROUTES.CYCLE}?session=morning` },
                  { id: 'user-tasks', label: 'Мікрозавдання', roles: USER_ROLES, requiresPremium: true, path: ROUTES.MICROTASKS },
                  { id: 'user-evening', label: 'Вечір', roles: USER_ROLES, requiresPremium: true, path: `${ROUTES.CYCLE}?session=evening` },
                  { id: 'user-analysis', label: 'Аналіз дня', roles: USER_ROLES, requiresPremium: true, path: ROUTES.JOURNAL },
                  { id: 'user-zoom', label: 'Zoom', dynamicLabel: 'zoom', roles: USER_ROLES, requiresPremium: true, path: ROUTES.JOURNAL },
                ],
              },
              {
                id: 'user-practicums',
                label: 'Практикуми',
                icon: GraduationCap,
                roles: USER_ROLES,
                collapsible: true,
                defaultCollapsed: false,
                children: [
                  { id: 'user-practicum-item', label: 'Практикум', dynamicLabel: 'practicum', roles: USER_ROLES, requiresPremium: true, path: ROUTES.COURSES },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'learning',
    label: 'НАВЧАННЯ',
    roles: USER_ROLES,
    items: [
      { id: 'courses', label: 'Практикуми', icon: GraduationCap, roles: USER_ROLES, requiresPremium: true, path: ROUTES.COURSES },
      { id: 'zoom', label: 'Zoom-сесії', icon: Video, roles: USER_ROLES, requiresPremium: true, path: ROUTES.JOURNAL },
    ],
  },
  {
    id: 'my-cabinet',
    label: 'ПРОФІЛЬ',
    roles: PRODUCT_OWNER_ROLES,
    items: [
      {
        id: 'expert-products',
        label: 'ПРОДУКТИ',
        icon: Package2,
        path: ROUTES.PRODUCTS,
        roles: PRODUCT_OWNER_ROLES,
        collapsible: true,
        defaultCollapsed: false,
        children: [
          {
            id: 'expert-absystem',
            label: 'ABsystem',
            icon: Sparkles,
            path: ROUTES.PRODUCTS,
            roles: PRODUCT_OWNER_ROLES,
            collapsible: true,
            defaultCollapsed: false,
            children: [
              { id: 'expert-wheel', label: 'Колесо балансу', icon: Target, path: ROUTES.WHEEL, roles: PRODUCT_OWNER_ROLES },
              {
                id: 'expert-daily',
                label: 'Щоденний цикл',
                icon: CalendarDays,
                roles: PRODUCT_OWNER_ROLES,
                collapsible: true,
                defaultCollapsed: false,
                children: [
                  { id: 'expert-morning', label: 'Ранок', roles: PRODUCT_OWNER_ROLES, path: `${ROUTES.CYCLE}?session=morning` },
                  { id: 'expert-tasks', label: 'Мікрозавдання', roles: PRODUCT_OWNER_ROLES, path: ROUTES.MICROTASKS },
                  { id: 'expert-evening', label: 'Вечір', roles: PRODUCT_OWNER_ROLES, path: `${ROUTES.CYCLE}?session=evening` },
                  { id: 'expert-analysis', label: 'Аналіз дня', roles: PRODUCT_OWNER_ROLES, path: ROUTES.JOURNAL },
                  { id: 'expert-zoom', label: 'Zoom', dynamicLabel: 'zoom', roles: STAFF_ROLES, path: ROUTES.JOURNAL },
                ],
              },
              { id: 'expert-reports', label: 'Звіти', icon: BarChart3, path: ROUTES.JOURNAL, roles: PRODUCT_OWNER_ROLES },
              { id: 'expert-stats', label: 'Статистика', icon: BarChart3, path: toAppRoutePath('/dashboard/admin/revenue'), roles: PRODUCT_OWNER_ROLES },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'content-sales',
    label: 'КОНТЕНТ І ПРОДАЖІ',
    roles: PRODUCT_OWNER_ROLES,
    items: [
      {
        id: 'content-machine',
        label: 'Content Machine',
        icon: Sparkles,
        path: dashboardSectionPath('content'),
        roles: PRODUCT_OWNER_ROLES,
        collapsible: true,
        defaultCollapsed: true,
        children: CONTENT_MACHINE_STEPS,
      },
      { id: 'funnel', label: 'Воронка', icon: Workflow, path: dashboardSectionPath('leadmagnet'), roles: PRODUCT_OWNER_ROLES },
      { id: 'telegram', label: 'Telegram', icon: Send, path: dashboardSectionPath('telegram'), roles: PRODUCT_OWNER_ROLES },
      { id: 'seo', label: 'SEO', icon: Search, path: dashboardSectionPath('ai-seo'), roles: PRODUCT_OWNER_ROLES },
    ],
  },
  {
    id: 'analytics-system',
    label: 'АНАЛІТИКА І СИСТЕМА',
    roles: PRODUCT_OWNER_ROLES,
    items: [
      { id: 'studio-prompts', label: 'Промпти', icon: LayoutGrid, path: `${ROUTES.ADMIN_STUDIO}?tab=prompts`, roles: PRODUCT_OWNER_ROLES },
      { id: 'studio-signals', label: 'Сигнали', icon: Send, path: `${ROUTES.ADMIN_STUDIO}?tab=notifications`, roles: PRODUCT_OWNER_ROLES },
      { id: 'studio-funnels', label: 'Воронки', icon: Workflow, path: `${ROUTES.ADMIN_STUDIO}?tab=funnels`, roles: PRODUCT_OWNER_ROLES },
      { id: 'users', label: 'Користувачі', icon: Users, path: dashboardSectionPath('students'), roles: SUPERADMIN_ROLES },
      { id: 'analytics', label: 'Аналітика', icon: BarChart3, path: toAppRoutePath('/dashboard/admin/revenue'), roles: SUPERADMIN_ROLES },
      { id: 'calendar', label: 'Календар', icon: CalendarDays, path: ROUTES.CALENDAR, roles: SUPERADMIN_ROLES },
      { id: 'system', label: 'Система', icon: Settings, path: dashboardSectionPath('system'), roles: SUPERADMIN_ROLES },
    ],
  },
]

export const NAV_ROLE_GROUPS = {
  user: ['USER'] as const,
  expert: ['EXPERT', 'ADMIN'] as const,
  superadmin: ['SUPERADMIN'] as const,
}
