// frontend/src/features/analytics/types/analytics.types.ts
// або src/types/analytics.types.ts

export interface DashboardStats {
  stats: {
    label: string
    value: string | number
    change: string
    trend: 'up' | 'down'
    icon: any // або конкретний тип з lucide-react, якщо хочеш строго
    color: string
  }[]
  funnels: {
    name: string
    visitors: number
    conversions: number
    rate: number
  }[]
  recentActivity: {
    user: string
    action: string
    time: string
    type: 'success' | 'purchase' | 'new' | 'engagement'
  }[]
}