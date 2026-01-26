// frontend/src/features/dashboard/layout/DashboardLayout.tsx

import { Outlet, Navigate } from 'react-router-dom'
import { GlassCard } from '@/ui'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useAbility } from '@/features/auth/hooks/useAbility'
import Sidebar from '@/features/dashboard/layout/Sidebar'
import { ABILITIES } from '@/shared/types/permissions'

/**
 * DashboardLayout
 *
 * ВІДПОВІДАЛЬНІСТЬ:
 * - перевірити, що юзер залогінений
 * - показати shell (sidebar + контент)
 * - НЕ вирішує, що можна / не можна (це роблять abilities)
 * 
 * Layout ніколи не знає:
 * - хто адмін
 * - хто юзер
 * - хто супер
 * 
 * Він знає тільки:
 * «ти взагалі маєш право бути в dashboard?»
 * 
 * ❌ без ролей
 * ❌ без if admin
 * ✅ тільки permissions
 */
export default function DashboardLayout() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const can = useAbility()

  // Ще вантажиться /me
  if (isLoading) return null

  // Не залогінений → на auth
  if (!isAuthenticated || !user) {
    return <Navigate to="/" replace />
  }

  /**
   * БАЗОВА ability для доступу до dashboard
   * Якщо її нема — значить user взагалі не має доступу до продукту
   */
  if (!can(ABILITIES.DASHBOARD_VIEW)) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* SIDEBAR */}
      <Sidebar />

      {/* CONTENT */}
      <main className="flex-1 p-6 overflow-y-auto">
        <GlassCard className="min-h-full p-6">
          {/* 
            Outlet = child routes
            Доступ до конкретних сторінок
            контролюється AbilityGuard у routes
          */}
          <Outlet />
        </GlassCard>
      </main>
    </div>
  )
}