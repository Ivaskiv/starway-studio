import { useGetMeQuery } from '@/features/auth/services/auth.api'
import { UserRole } from '@/features/auth/types/auth.types'
import { GlassCard } from '@/ui'
import { Suspense } from 'react'
import { renderDashboardByRole } from './config/dashboardRegistry'

export default function DashboardPage() {
  const { data, isLoading, isError } = useGetMeQuery()

  const user = data?.user

  if (isLoading) {
    return <GlassCard className="p-6 text-center">Завантаження…</GlassCard>
  }

  if (isError || !user) {
    return <GlassCard className="p-6 text-center text-red-500">Помилка завантаження користувача</GlassCard>
  }

  // Перевіряємо, чи роль належить UserRole
  const roleValues = Object.values(UserRole)
  if (!roleValues.includes(user.role as UserRole)) {
    return <GlassCard className="p-6 text-center text-red-500">Невідомий тип користувача</GlassCard>
  }

  return (
    <Suspense fallback={<GlassCard className="p-6">Завантаження компонентів…</GlassCard>}>
      {renderDashboardByRole(user)}
    </Suspense>
  )
}
