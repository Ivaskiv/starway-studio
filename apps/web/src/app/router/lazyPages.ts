import { lazy } from 'react'

export const HomePage = lazy(() => import('@/pages/HomePage'))
export const TestPage = lazy(() => import('@/features/ab-test/pages/TestPage'))
export const AbTestLandingRouteView = lazy(
  () => import('@/features/ab-test-landing/page/AbTestLandingRouteView')
)
export const WelcomeTestPage = lazy(
  () => import('@/features/welcome-test/pages/WelcomeTestPage')
)
export const FocusRouteView = lazy(
  () => import('@/features/landings/focus/pages/FocusRouteView')
)
export const LoginPage = lazy(() => import('@/pages/LoginPage'))
export const TelegramSuccessPage = lazy(
  () => import('@/pages/auth/TelegramSuccessPage')
)
export const StartFlowPage = lazy(() => import('@/pages/onboarding/StartFlowPage'))
export const ContinueFlowPage = lazy(
  () => import('@/pages/onboarding/ContinueFlowPage')
)
export const DashboardPage = lazy(
  () => import('@/features/dashboard/pages/DashboardPage')
)
export const SettingsPage = lazy(
  () => import('@/features/settings/pages/SettingsPage')
)
export const TelegramPage = lazy(
  () => import('@/features/telegram/pages/TelegramPage')
)
export const WheelPage = lazy(() => import('@/features/wheel/pages/WheelPage'))
export const WheelStartPage = lazy(
  () => import('@/features/wheel/pages/WheelStartPage')
)
export const JournalPage = lazy(() => import('@/features/journal/JournalPage'))
export const VisionPage = lazy(() => import('@/features/vision/pages/VisionPage'))
export const GoalsPage = lazy(() => import('@/features/goals/pages/GoalsPage'))
export const TrialMirrorPage = lazy(
  () => import('@/features/goals/pages/TrialMirrorPage')
)
export const WeeklyMirrorPage = lazy(
  () => import('@/features/goals/pages/WeeklyMirrorPage')
)
export const ActionsPage = lazy(
  () => import('@/features/actions/pages/ActionsPage')
)
export const CoursesPage = lazy(
  () => import('@/features/mini-courses/pages/CoursesPage')
)
export const ProductInfoPage = lazy(
  () => import('@/features/mini-courses/pages/ProductInfoPage')
)
export const SubscriptionPage = lazy(
  () => import('@/features/subscription/pages/SubscriptionPage')
)
export const ZoomCalendarPage = lazy(
  () => import('@/features/zoom/pages/ZoomCalendarPage')
)
export const AiMentorDashboardPage = lazy(
  () => import('@/features/daily-cycle/pages/AiMentorDashboardPage')
)
export const ProductsPage = lazy(
  () => import('@/features/products/pages/ProductsPage')
)
export const ProductCreationPage = lazy(
  () => import('@/features/products/pages/ProductCreationPage')
)
export const UserProfilePage = lazy(
  () => import('@/features/user/pages/UserProfilePage')
)
export const InfoPage = lazy(() => import('@/pages/InfoPage'))
export const MentorLandingPage = lazy(
  () => import('@/features/ai-mentor/pages/MentorLanding')
)
export const MentorSetupPage = lazy(
  () => import('@/features/ai-mentor/pages/MentorSetup')
)
export const ResetPasswordPage = lazy(
  () => import('@/features/auth/pages/ResetPasswordPage')
)
export const DevRoutesPage = lazy(() => import('@/pages/dev/DevRoutes'))
export const TransferOwnershipPage = lazy(
  () => import('@/features/admin/pages/TransferOwnershipPage')
)
export const MasterPanelPage = lazy(
  () => import('@/features/admin/pages/MasterPanelPage')
)
export const AdminAnalyticsPage = lazy(
  () => import('@/features/analytics/pages/AdminAnalytics')
)
export const MiniAppPage = lazy(
  () => import('@/features/social/pages/MiniAppPage')
)
export const NotificationsPage = lazy(
  () => import('@/features/notifications/pages/Notifications')
)
export const SalesAssistantPage = lazy(
  () => import('@/features/sales-assistant/pages/SalesAssistantPage')
)
export const PlatformPage = lazy(
  () => import('@/features/platform/pages/PlatformPage')
)
