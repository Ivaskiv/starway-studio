// packages/frontend/src/features/dashboard/config/dashboardRegistry.ts
import { UserRole } from '@/features/auth/types/auth.types'
import { lazy } from 'react'

// admin
const AdminStats = lazy(() => import('../blocks/admin/AdminStats'))
const FunnelsOverview = lazy(() => import('../blocks/admin/FunnelsOverview'))
const UsersOverview = lazy(() => import('../blocks/user/UsersOverview'))

// mentor
const MentorStats = lazy(() => import('../blocks/mentor/MentorStats'))
const DailySessions = lazy(() => import('../blocks/mentor/DailySessions'))
const WheelBlock = lazy(() => import('../blocks/mentor/WheelBlock'))
const Recommendations = lazy(() => import('../blocks/mentor/Recommendations'))

// user
const UserProducts = lazy(() => import('../blocks/user/UserProducts'))
const UserProgress = lazy(() => import('../blocks/user/UserProgress'))

interface DashboardUser {
  id: string
  role: UserRole
}

export function renderDashboardByRole(user: DashboardUser) {
  switch (user.role) {
    case UserRole.SUPER_ADMIN:
    case UserRole.FUNNEL_ADMIN:
      return (
        <div className="space-y-6 md:space-y-8">
          {/* top stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStats />
          </div>

          {/* middle blocks */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <FunnelsOverview />
            </div>

            <div className="space-y-6">
              <UsersOverview />
            </div>
          </div>
        </div>
      )

    case UserRole.USER:
      return (
        <div className="space-y-6 md:space-y-8">
          {/* mentor stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MentorStats user_id={user.id} />
          </div>

          {/* main content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* left */}
            <div className="lg:col-span-2 space-y-6">
              <DailySessions user_id={user.id} />
              <UserProgress user_id={user.id} />
            </div>

            {/* right */}
            <div className="space-y-6">
              <WheelBlock user_id={user.id} />
              <Recommendations user_id={user.id} />
            </div>
          </div>

          {/* products */}
          <UserProducts />
        </div>
      )

    default:
      return null
  }
}
