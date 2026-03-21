// frontend/src/layout/MainLayout.tsx
import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'

import AuthModal from '@/features/auth/components/AuthModal'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useSystemState } from '@/features/auth/hooks/useSystemState'
import SettingsBreadcrumbAction from '@/features/settings/components/SettingsBreadcrumbAction'
import Breadcrumbs from '@/layout/Breadcrumbs'
import Footer from '@/layout/Footer'
import Header from '@/layout/Header'
import Sidebar from '@/layout/Sidebar'

import type { AppView, PreviewRole } from '@/layout/types/layout.types'

interface MainLayoutProps {
  showBreadcrumbs?: boolean
  dashboard?: boolean
}

export default function MainLayout({
  showBreadcrumbs = true,
  dashboard = false,
}: MainLayoutProps) {

  const [collapsed,   setCollapsed]   = useState(false)
  const [view,        setView]        = useState<AppView>('navigation')
  const [previewRole, setPreviewRole] = useState<PreviewRole>('user')
  const [authMode,    setAuthMode]    = useState<'login' | 'register'>('login')
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const { user, isAuthenticated } = useAuth()
  const { state } = useSystemState()

  const toggle = () => setCollapsed(c => !c)

  const layoutControls = {
    view,
    onViewChange: setView,
    previewRole,
    onRoleChange: setPreviewRole,
  }

  // ── ВИПРАВЛЕНО: callbacks для Header ────────────────────────────────────
  const authCallbacks = {
    onLoginClick: () => {
      setAuthMode('login')
      setAuthModalOpen(true)
    },
    onRegisterClick: () => {
      setAuthMode('register')
      setAuthModalOpen(true)
    },
  }

  useEffect(() => {
    const rawRole = ((user as any)?.role ?? (state as any)?.user?.role ?? '').toLowerCase()
    if (rawRole === 'superadmin' || rawRole === 'admin') setPreviewRole('superadmin')
    else if (rawRole === 'expert' || rawRole === 'mentor') setPreviewRole('expert')
    else setPreviewRole('user')
  }, [user, state])

  const shouldShowSidebar = dashboard || isAuthenticated

  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD + LOGGED-IN LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  if (shouldShowSidebar) {
    return (
      <div className="flex h-screen overflow-hidden">

        <Sidebar
          collapsed={collapsed}
          onToggle={toggle}
          view={view}
          previewRole={previewRole}
        />

        <div className="flex flex-col flex-1 min-w-0">
          {/* ── ВИПРАВЛЕНО: передаємо authCallbacks ── */}
          <Header {...layoutControls} {...authCallbacks} />

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-[1600px] mx-auto w-full px-6 py-6">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex-1"><Breadcrumbs /></div>
                <SettingsBreadcrumbAction />
              </div>
              <main className="min-h-[60vh]"><Outlet /></main>
              <Footer />
            </div>
          </div>
        </div>

        {/* ── ВИПРАВЛЕНО: AuthModal є і в dashboard layout ── */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          defaultMode={authMode}
        />
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC / LANDING LAYOUT
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">

      {/* ── ВИПРАВЛЕНО: передаємо authCallbacks ── */}
      <Header {...layoutControls} {...authCallbacks} />

      <div className="max-w-7xl mx-auto w-full px-5 sm:px-6">
        <Breadcrumbs />
      </div>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Outlet />
      </main>

      <Footer />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />
    </div>
  )
}