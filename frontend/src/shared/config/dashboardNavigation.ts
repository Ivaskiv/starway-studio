// frontend/src/shared/config/dashboardNavigation.ts

export interface NavItem {
  label: string
  path: string
  ability?: string
}

export const DASHBOARD_NAVIGATION: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Мої курси', path: '/dashboard/courses', ability: 'courses.view' },
  { label: 'AI Ментор', path: '/dashboard/ai-mentor', ability: 'ai.use' },
  { label: 'Прогрес', path: '/dashboard/progress', ability: 'progress.view' },
  { label: 'Колесо балансу', path: '/dashboard/wheel', ability: 'wheel.view' },
  { label: 'Профіль', path: '/dashboard/profile', ability: 'profile.view' },
  { label: 'Продукти', path: '/dashboard/products', ability: 'products.manage' },
  { label: 'Воронки', path: '/dashboard/funnels', ability: 'funnels.manage' },
  { label: 'Налаштування', path: '/dashboard/settings', ability: 'settings.manage' },
]

export const FOOTER_LINKS = {
  learning: [
    { label: 'Курси', path: '/dashboard/courses' },
    { label: 'Прогрес', path: '/dashboard/progress' },
  ],
  tools: [
    { label: 'Колесо балансу', path: '/dashboard/wheel' },
    { label: 'AI Ментор', path: '/dashboard/ai-mentor' },
  ],
}