// packages/frontend/src/pages/pages.lazy.ts
import { lazy } from 'react'

// Home & Auth
export const HomePage = lazy(() => import('../features/home/HomePage'))
export const AuthPage = lazy(() => import('../features/auth/AuthPage'))

// Dashboard
export const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'))

// Funnels
export const FunnelsPage = lazy(() => import('../features/funnels/pages/FunnelsPage'))
export const FunnelEditPage = lazy(() => import('../features/funnels/pages/FunnelEditPage'))
export const AIGeneratorPage = lazy(() => import('../features/ai-generator/pages/AIGeneratorPage'))

// Products
export const ProductsPage = lazy(() => import('../features/products/pages/ProductsPage'))

// Analytics
// export const AnalyticsPage = lazy(() => import('../features/analytics/pages/AnalyticsPage'))

// Users
export const UsersPage = lazy(() => import('../features/auth/AuthPage'))

// Settings
export const SettingsPage = lazy(() => import('./SettingsPage'))

// ============ USER PAGES ============
export const CoursesPage = lazy(() => import('../features/courses/pages/CoursesPage'))
export const ProgressPage = lazy(() => import('../features/progress/pages/ProgressPage'))
export const SubscriptionPage = lazy(() => import('../features/subscription/pages/SubscriptionPage'))

// ============ AI MENTOR ============
export const AIMentorPage = lazy(() => import('../features/ai-mentor/pages/AIMentorPage'))
export const WheelPage = lazy(() => import('../features/wheel/pages/WheelPage'))