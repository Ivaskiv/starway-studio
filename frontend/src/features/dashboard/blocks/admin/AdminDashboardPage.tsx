// frontend/src/features/dashboard/pages/AdminDashboardPage.tsx
import { useAuth } from '@/features/auth/hooks/useAuth'
import DailySessions from '@/features/dashboard/blocks/mentor/DailySessions'
import MentorStats from '@/features/dashboard/blocks/mentor/MentorStats'
import Recommendations from '@/features/dashboard/blocks/mentor/Recommendations'
import WheelBlock from '@/features/dashboard/blocks/mentor/WheelBlock'

export default function AdminDashboardPage() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div className="space-y-6">
      <MentorStats />
      <DailySessions />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* адмінські блоки згодом */}
        </div>

        <div className="space-y-6">
          <WheelBlock />
          <Recommendations />
        </div>
      </div>
    </div>
  )
}
