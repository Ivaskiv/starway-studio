// frontend/src/features/dashboard/pages/UserDashboardPage.tsx
import { useAuth } from '@/features/auth/hooks/useAuth'
import UserProgress from '@/features/dashboard/blocks/user/UserProgress'
import AllProductsList from '@/features/products/components/AllProductsList'

export default function UserDashboardPage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="space-y-6">
      <UserProgress />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <AllProductsList />
      </main>
    </div>
  )
}
