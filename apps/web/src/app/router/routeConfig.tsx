import type { AccessKey } from '@/features/auth/types/auth.types'
import ProtectedRoute from '@/features/auth/components/ProtectedRoute'
import { ROUTES, toAppRoutePath } from '@/config/routes'
import {
  ActionsPage,
  AdminAnalyticsPage,
  AiMentorDashboardPage,
  CoursesPage,
  DashboardPage,
  MasterPanelPage,
  MentorLandingPage,
  MentorSetupPage,
  NotificationsPage,
  PlatformPage,
  ProductCreationPage,
  ProductsPage,
  ProfilePage,
  SalesAssistantPage,
  SettingsPage,
  SubscriptionPage,
  TelegramPage,
  ZoomCalendarPage,
  TransferOwnershipPage,
  TrialMirrorPage,
  VisionPage,
  WeeklyMirrorPage,
  WheelPage,
  GoalsPage,
  JournalPage,
} from '@/app/router/routePages'
import type { ReactElement } from 'react'
import { Navigate } from 'react-router-dom'

export type RouteConfig = {
  path: string
  element: ReactElement
  ability?: AccessKey
  showDeniedScreen?: boolean
}

export const devMode =
  import.meta.env.DEV || import.meta.env.VITE_AUTH_BYPASS === 'true'

export function withGuard(route: RouteConfig): ReactElement {
  if (devMode || !route.ability) {
    return route.element
  }

  return (
    <ProtectedRoute
      ability={route.ability}
      showDeniedScreen={route.showDeniedScreen}
    >
      {route.element}
    </ProtectedRoute>
  )
}

export function toLegacyRouteRedirect(path: string): ReactElement {
  return <Navigate to={toAppRoutePath(path)} replace />
}

export const DASHBOARD_ROUTES: RouteConfig[] = [
  { path: '/dashboard', element: <DashboardPage />, ability: 'dashboard.view' },
  {
    path: '/dashboard/ai-mentor',
    element: <AiMentorDashboardPage />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/cycle',
    element: <AiMentorDashboardPage />,
    ability: 'dashboard.view',
  },
  { path: '/dashboard/wheel', element: <WheelPage />, ability: 'dashboard.view' },
  { path: '/dashboard/journal', element: <JournalPage />, ability: 'dashboard.view' },
  {
    path: '/dashboard/calendar',
    element: <AiMentorDashboardPage />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/microtasks',
    element: <AiMentorDashboardPage />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/tasks',
    element: <AiMentorDashboardPage />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/progress',
    element: <Navigate to={toAppRoutePath('/dashboard/journal')} replace />,
    ability: 'progress.view',
  },
  {
    path: '/dashboard/vision',
    element: <VisionPage />,
    ability: 'dashboard.view',
    showDeniedScreen: true,
  },
  { path: '/dashboard/goals', element: <GoalsPage />, ability: 'dashboard.view' },
  {
    path: '/dashboard/goals/trial-mirror',
    element: <TrialMirrorPage />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/goals/weekly-mirror',
    element: <WeeklyMirrorPage />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/actions',
    element: <ActionsPage />,
    ability: 'mentor.actions',
    showDeniedScreen: true,
  },
  {
    path: '/dashboard/courses',
    element: <CoursesPage />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/ai-seo',
    element: <Navigate to={`${toAppRoutePath('/dashboard')}?section=ai-seo`} replace />,
    ability: 'products.manage',
  },
  {
    path: '/dashboard/ads',
    element: <Navigate to={`${toAppRoutePath('/dashboard')}?section=content`} replace />,
    ability: 'products.manage',
  },
  {
    path: '/dashboard/leadmagnet',
    element: <Navigate to={`${toAppRoutePath('/dashboard')}?section=leadmagnet`} replace />,
    ability: 'funnels.manage',
  },
  {
    path: '/dashboard/students',
    element: <Navigate to={`${toAppRoutePath('/dashboard')}?section=students`} replace />,
    ability: 'admin.clients.view',
  },
  {
    path: '/dashboard/admin/users',
    element: <Navigate to={toAppRoutePath('/dashboard/students')} replace />,
    ability: 'admin.clients.view',
  },
  {
    path: '/dashboard/admin/revenue',
    element: <AdminAnalyticsPage />,
    ability: 'admin.revenue.view',
  },
  {
    path: '/dashboard/admin/studio',
    element: <MasterPanelPage />,
    ability: 'products.manage',
    showDeniedScreen: true,
  },
  {
    path: '/dashboard/admin/roles',
    element: <Navigate to={toAppRoutePath('/dashboard/admin/transfer-ownership')} replace />,
    ability: 'admin.roles.manage',
  },
  {
    path: '/dashboard/admin/transfer-ownership',
    element: <TransferOwnershipPage />,
    ability: 'admin.roles.manage',
  },
  {
    path: '/dashboard/sessions',
    element: <Navigate to={toAppRoutePath('/dashboard/zoom')} replace />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/products',
    element: <ProductsPage />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/product-create',
    element: <ProductCreationPage />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/profile',
    element: <ProfilePage />,
    ability: 'profile.view',
  },
  {
    path: '/dashboard/settings',
    element: <SettingsPage />,
    ability: 'settings.manage',
  },
  {
    path: '/dashboard/notifications',
    element: <NotificationsPage />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/telegram',
    element: <TelegramPage />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/subscription',
    element: <SubscriptionPage />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/zoom',
    element: <ZoomCalendarPage />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/consultation',
    element: <SubscriptionPage />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/mentorship',
    element: <SubscriptionPage />,
    ability: 'dashboard.view',
  },
  {
    path: '/dashboard/mentor/landing',
    element: <MentorLandingPage />,
    ability: 'mentor.core',
  },
  {
    path: '/dashboard/mentor/setup',
    element: <MentorSetupPage />,
    ability: 'mentor.core',
  },
  {
    path: '/dashboard/mentor/workspace',
    element: <AiMentorDashboardPage />,
    ability: 'mentor.core',
  },
  {
    path: '/platform',
    element: <PlatformPage />,
    ability: 'dashboard.view',
  },
  {
    path: '/platform/*',
    element: <PlatformPage />,
    ability: 'dashboard.view',
  },
]

export const ADMIN_ROUTES: RouteConfig[] = [
  {
    path: '/admin/ai-assistant',
    element: <SalesAssistantPage />,
    ability: 'products.manage',
    showDeniedScreen: true,
  },
]

export const PROTECTED_ALIASES: RouteConfig[] = [
  {
    path: ROUTES.APP,
    element: <Navigate to={toAppRoutePath('/dashboard')} replace />,
    ability: 'dashboard.view',
  },
  {
    path: '/settings',
    element: <Navigate to={ROUTES.SETTINGS} replace />,
    ability: 'settings.manage',
  },
  {
    path: '/settings/*',
    element: <Navigate to={ROUTES.SETTINGS} replace />,
    ability: 'settings.manage',
  },
  {
    path: '/subscription',
    element: <Navigate to={ROUTES.SUBSCRIPTION} replace />,
    ability: 'dashboard.view',
  },
  {
    path: '/subscriptions',
    element: <Navigate to={ROUTES.SUBSCRIPTION} replace />,
    ability: 'dashboard.view',
  },
  {
    path: '/subscriptions/*',
    element: <Navigate to={ROUTES.SUBSCRIPTION} replace />,
    ability: 'dashboard.view',
  },
  {
    path: '/wheel/private',
    element: <Navigate to={ROUTES.WHEEL} replace />,
    ability: 'dashboard.view',
  },
  {
    path: '/wheel/private/*',
    element: <Navigate to={ROUTES.WHEEL} replace />,
    ability: 'dashboard.view',
  },
  {
    path: '/goals/private',
    element: <Navigate to={ROUTES.GOALS} replace />,
    ability: 'dashboard.view',
  },
  {
    path: '/goals/private/*',
    element: <Navigate to={ROUTES.GOALS} replace />,
    ability: 'dashboard.view',
  },
  {
    path: '/progress/private',
    element: <Navigate to={ROUTES.PROGRESS} replace />,
    ability: 'progress.view',
  },
  {
    path: '/progress/private/*',
    element: <Navigate to={ROUTES.PROGRESS} replace />,
    ability: 'progress.view',
  },
]
