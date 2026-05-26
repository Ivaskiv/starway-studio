import type { UserRole } from '@/features/user/types/user.types'

// Define which views switcher can toggle between (navigation vs pages).
export type AppView = 'navigation' | 'pages'

// PreviewRole now aligns with UserRole for the active-role switcher.
export type PreviewRole = UserRole

// Shared props between layout components for view/role control.
export interface LayoutSharedProps {
  view: AppView
  onViewChange: (v: AppView) => void
  previewRole: PreviewRole
  onRoleChange: (r: PreviewRole) => void
}
