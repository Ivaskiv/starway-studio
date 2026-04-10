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

const CONTENT_MACHINE_STEPS: NavItemConfig[] = [
  { id: 'content-step-1', label: 'Контекст', roles: PRODUCT_OWNER_ROLES, path: '/dashboard?section=content&step=1' },
  { id: 'content-step-2', label: 'СТА', roles: PRODUCT_OWNER_ROLES, path: '/dashboard?section=content&step=2' },
  { id: 'content-step-3', label: 'Hook', roles: PRODUCT_OWNER_ROLES, path: '/dashboard?section=content&step=3' },
  { id: 'content-step-4', label: 'Дослідження', roles: PRODUCT_OWNER_ROLES, path: '/dashboard?section=content&step=4' },
  { id: 'content-step-5', label: 'Формула', roles: PRODUCT_OWNER_ROLES, path: '/dashboard?section=content&step=5' },
  { id: 'content-step-6', label: 'API', roles: PRODUCT_OWNER_ROLES, path: '/dashboard?section=content&step=6' },
  { id: 'content-step-7', label: 'Текст × 3', roles: PRODUCT_OWNER_ROLES, path: '/dashboard?section=content&step=7' },
  { id: 'content-step-8', label: 'Банери × 3', roles: PRODUCT_OWNER_ROLES, path: '/dashboard?section=content&step=8' },
  { id: 'content-step-9', label: 'Reels Engine', roles: PRODUCT_OWNER_ROLES, path: '/dashboard?section=content&step=9' },
  { id: 'content-step-10', label: 'Lead magnet', roles: PRODUCT_OWNER_ROLES, path: '/dashboard?section=content&step=10' },
]

export const NAV_CONFIG: NavSectionConfig[] = [
  {
    id: 'profile',
    label: 'ПРОФІЛЬ',
    roles: ALL_ROLES,
    items: [
      { id: 'profile-home', label: 'Профіль', icon: Sparkles, path: '/dashboard/profile', roles: ALL_ROLES },
      { id: 'profile-journal', label: 'Щоденник', icon: BookOpen, path: '/dashboard/journal', roles: ALL_ROLES, requiresPremium: true },
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
              { id: 'user-wheel', label: 'Колесо балансу', icon: Target, path: '/dashboard/wheel', roles: USER_ROLES },
              {
                id: 'user-daily',
                label: 'Щоденний цикл',
                icon: CalendarDays,
                roles: USER_ROLES,
                collapsible: true,
                defaultCollapsed: false,
                children: [
                  { id: 'user-morning', label: 'Ранок', roles: USER_ROLES, requiresPremium: true, path: '/dashboard/cycle?session=morning' },
                  { id: 'user-tasks', label: 'Мікрозавдання', roles: USER_ROLES, requiresPremium: true, path: '/dashboard/microtasks' },
                  { id: 'user-evening', label: 'Вечір', roles: USER_ROLES, requiresPremium: true, path: '/dashboard/cycle?session=evening' },
                  { id: 'user-analysis', label: 'Аналіз дня', roles: USER_ROLES, requiresPremium: true, path: '/dashboard/progress' },
                  { id: 'user-zoom', label: 'Zoom', dynamicLabel: 'zoom', roles: USER_ROLES, requiresPremium: true, path: '/dashboard/journal' },
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
                  { id: 'user-practicum-item', label: 'Практикум', dynamicLabel: 'practicum', roles: USER_ROLES, requiresPremium: true, path: '/dashboard/courses' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'my-reports',
    label: 'МОЇ ЗВІТИ',
    roles: USER_ROLES,
    items: [
      { id: 'weekly', label: 'Тижневий', roles: USER_ROLES, requiresPremium: true, path: '/dashboard/progress' },
      { id: 'monthly', label: 'Місячний', roles: USER_ROLES, requiresPremium: true, path: '/dashboard/progress' },
      { id: 'all', label: 'Загальний', roles: USER_ROLES, requiresPremium: true, path: '/dashboard/progress' },
    ],
  },
  {
    id: 'learning',
    label: 'НАВЧАННЯ',
    roles: USER_ROLES,
    items: [
      { id: 'courses', label: 'Практикуми', icon: GraduationCap, roles: USER_ROLES, requiresPremium: true, path: '/dashboard/courses' },
      { id: 'zoom', label: 'Zoom-сесії', icon: Video, roles: USER_ROLES, requiresPremium: true, path: '/dashboard/journal' },
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
        path: '/dashboard/products',
        roles: PRODUCT_OWNER_ROLES,
        collapsible: true,
        defaultCollapsed: false,
        children: [
          {
            id: 'expert-absystem',
            label: 'ABsystem',
            icon: Sparkles,
            path: '/dashboard/products',
            roles: PRODUCT_OWNER_ROLES,
            collapsible: true,
            defaultCollapsed: false,
            children: [
              { id: 'expert-wheel', label: 'Колесо балансу', icon: Target, path: '/dashboard/wheel', roles: PRODUCT_OWNER_ROLES },
              {
                id: 'expert-daily',
                label: 'Щоденний цикл',
                icon: CalendarDays,
                roles: PRODUCT_OWNER_ROLES,
                collapsible: true,
                defaultCollapsed: false,
                children: [
                  { id: 'expert-morning', label: 'Ранок', roles: PRODUCT_OWNER_ROLES, path: '/dashboard/cycle?session=morning' },
                  { id: 'expert-tasks', label: 'Мікрозавдання', roles: PRODUCT_OWNER_ROLES, path: '/dashboard/microtasks' },
                  { id: 'expert-evening', label: 'Вечір', roles: PRODUCT_OWNER_ROLES, path: '/dashboard/cycle?session=evening' },
                  { id: 'expert-analysis', label: 'Аналіз дня', roles: PRODUCT_OWNER_ROLES, path: '/dashboard/progress' },
                  { id: 'expert-zoom', label: 'Zoom', dynamicLabel: 'zoom', roles: STAFF_ROLES, path: '/dashboard/journal' },
                ],
              },
              { id: 'expert-reports', label: 'Звіти', icon: BarChart3, path: '/dashboard/progress', roles: PRODUCT_OWNER_ROLES },
              { id: 'expert-stats', label: 'Статистика', icon: BarChart3, path: '/dashboard/admin/revenue', roles: PRODUCT_OWNER_ROLES },
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
        path: '/dashboard?section=content',
        roles: PRODUCT_OWNER_ROLES,
        collapsible: true,
        defaultCollapsed: true,
        children: CONTENT_MACHINE_STEPS,
      },
      { id: 'funnel', label: 'Воронка', icon: Workflow, path: '/dashboard/leadmagnet', roles: PRODUCT_OWNER_ROLES },
      { id: 'telegram', label: 'Telegram', icon: Send, path: '/dashboard/telegram', roles: PRODUCT_OWNER_ROLES },
      { id: 'seo', label: 'SEO', icon: Search, path: '/dashboard/ai-seo', roles: PRODUCT_OWNER_ROLES },
    ],
  },
  {
    id: 'analytics-system',
    label: 'АНАЛІТИКА І СИСТЕМА',
    roles: PRODUCT_OWNER_ROLES,
    items: [
      { id: 'studio-prompts', label: 'Промпти', icon: LayoutGrid, path: '/dashboard/admin/studio?tab=prompts', roles: PRODUCT_OWNER_ROLES },
      { id: 'studio-signals', label: 'Сигнали', icon: Send, path: '/dashboard/admin/studio?tab=notifications', roles: PRODUCT_OWNER_ROLES },
      { id: 'studio-funnels', label: 'Воронки', icon: Workflow, path: '/dashboard/admin/studio?tab=funnels', roles: PRODUCT_OWNER_ROLES },
      { id: 'users', label: 'Користувачі', icon: Users, path: '/dashboard/students', roles: SUPERADMIN_ROLES },
      { id: 'analytics', label: 'Аналітика', icon: BarChart3, path: '/dashboard/admin/revenue', roles: SUPERADMIN_ROLES },
      { id: 'calendar', label: 'Календар', icon: CalendarDays, path: '/dashboard/calendar', roles: SUPERADMIN_ROLES },
      { id: 'system', label: 'Система', icon: Settings, path: '/dashboard?section=system', roles: SUPERADMIN_ROLES },
    ],
  },
]

export const NAV_ROLE_GROUPS = {
  user: ['USER'] as const,
  expert: ['EXPERT', 'ADMIN'] as const,
  superadmin: ['SUPERADMIN'] as const,
}
