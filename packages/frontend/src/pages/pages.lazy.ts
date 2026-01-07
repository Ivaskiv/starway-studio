// packages/frontend/src/pages/pages.lazy.ts
import { lazy } from 'react';

// Home & Auth
export const HomePage = lazy(() => import('./home/HomePage'));
export const AuthPage = lazy(() => import('./users/AuthPage'));

// Dashboard
export const DashboardPage = lazy(() => import('./dashboard/DashboardPage'));
export const DashboardAdmin = lazy(() => import('./dashboard/DashboardAdmin'));
export const DashboardUser = lazy(() => import('./dashboard/DashboardUser'));

// Funnels
export const FunnelsPage = lazy(() => import('./funnels/FunnelsPage'));
export const FunnelEditPage = lazy(() => import('./funnels/FunnelEditPage'));
export const AIGeneratorPage = lazy(() => import('./pages/ai-generator/AIGeneratorPage'));

// Products
export const ProductsPage = lazy(() => import('./products/ProductsPage'));
export const ProductEditPage = lazy(() => import('./products/ProductsPage'));

// Analytics
export const AnalyticsPage = lazy(() => import('./analytics/AnalyticsPage'));

// Users
export const UsersPage = lazy(() => import('./users/UsersPage'));

// Settings
export const SettingsPage = lazy(() => import('./SettingsPage'));