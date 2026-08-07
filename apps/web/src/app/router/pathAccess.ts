import { ROUTES } from '@/config/routes'
import {
  FOCUS_ALIAS_ROUTE,
  FOCUS_ROUTE,
} from '@/features/landings/focus/content/constants'

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

function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some((prefix) => matchesPathPrefix(pathname, prefix))
}

export function isPublicPath(pathname: string): boolean {
  return (
    pathname === ROUTES.AB_TEST ||
    matchesPathPrefix(pathname, ROUTES.AB_TEST) ||
    pathname === FOCUS_ROUTE ||
    pathname === FOCUS_ALIAS_ROUTE
  )
}
