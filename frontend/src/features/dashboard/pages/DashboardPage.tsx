// frontend/src/features/dashboard/pages/DashboardPage.tsx

import { useAuth } from '@/features/auth/hooks/useAuth'
import AdminDashboardPage from '@/features/dashboard/blocks/admin/AdminDashboardPage'
import UserDashboardPage from '@/features/dashboard/blocks/user/UserDashboardPage'

export default function DashboardPage() {
  const { user } = useAuth()

  if (!user) {
    throw new Error('DashboardPage rendered without user')
  }

  if (user.role === 'admin' || user.role === 'super_admin') {
    return <AdminDashboardPage />
  }

  return <UserDashboardPage />
}
