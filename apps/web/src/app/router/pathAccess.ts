import { ROUTES } from '@/config/routes'

const PUBLIC_INFO_ROUTES = [
  '/help',
  '/about',
  '/blog',
  '/careers',
  '/contact',
  '/faq',
  '/privacy',
  '/terms',
  '/cookies',
] as const

const PROTECTED_PATH_PREFIXES = [
  ROUTES.APP,
  '/admin',
  '/dashboard',
  '/settings',
  '/subscriptions',
  '/subscription',
  '/platform',
  '/wheel/private',
  '/goals/private',
  '/progress/private',
] as const

const PUBLIC_PATH_PREFIXES = [
  ROUTES.MINIAPP,
  ROUTES.AB_TEST,
  '/test',
  '/focus',
  '/products',
  ...PUBLIC_INFO_ROUTES,
] as const

const PUBLIC_EXACT_PATHS = new Set<string>([
  ROUTES.HOME,
  ROUTES.PRICING,
  ROUTES.LOGIN,
  '/register',
  '/task',
  '/tasks',
  '/planner',
  '/content',
  '/zoom',
  '/zoom-calendar',
  '/miniapp/zoom-calendar',
  ROUTES.MAGIC_LOGIN,
  ROUTES.TELEGRAM_SUCCESS,
  ROUTES.ONBOARDING_START,
  ROUTES.ONBOARDING_CONTINUE,
  ROUTES.AB_TEST,
  ROUTES.WHEEL_START,
  ROUTES.RESET_PASSWORD,
  ROUTES.DEV_ROUTES,
])

function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some((prefix) => matchesPathPrefix(pathname, prefix))
}

export function isPublicPath(pathname: string): boolean {
  if (PUBLIC_EXACT_PATHS.has(pathname)) {
    return true
  }

  return PUBLIC_PATH_PREFIXES.some((prefix) => matchesPathPrefix(pathname, prefix))
}

export { PUBLIC_INFO_ROUTES }
