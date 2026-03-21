// Define which views switcher can toggle between (navigation vs pages).
export type AppView = 'navigation' | 'pages'

// Explicit role preview states used by the switcher logic.
export type PreviewRole =
  | 'user'
  | 'expert'
  | 'superadmin'

// Shared props between layout components for view/role control.
export interface LayoutSharedProps {
  view: AppView // currently selected navigation mode
  onViewChange: (v: AppView) => void // callback to change the view
  previewRole: PreviewRole // currently selected preview role
  onRoleChange: (r: PreviewRole) => void // callback to change the preview role
}
