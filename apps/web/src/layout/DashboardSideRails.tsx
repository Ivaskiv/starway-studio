import { BookOpen, Clock3, Package, Sparkles, Target, User } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import JournalSideRail from '@/features/journal/components/JournalSideRail'
import { useUserProgress } from '@/features/user/hooks/useUserProgress'

function isPathActive(pathname: string, target: string) {
  return pathname === target || pathname.startsWith(`${target}/`)
}

export default function DashboardSideRails() {
  const navigate = useNavigate()
  const location = useLocation()
  const { dayNumber } = useUserProgress()

  const leftRailItems = [
    {
      id: 'journal',
      icon: BookOpen,
      label: 'Журнал',
      active: isPathActive(location.pathname, '/miniapp/journal') || isPathActive(location.pathname, '/miniapp'),
      tone: 'active' as const,
      onClick: () => navigate('/miniapp/journal'),
    },
    {
      id: 'tracker',
      icon: Clock3,
      label: 'Щоденний цикл',
      active: isPathActive(location.pathname, '/miniapp/tracker'),
      tone: 'active' as const,
      onClick: () => navigate('/miniapp/tracker'),
    },
    {
      id: 'library',
      icon: Package,
      label: 'Бібліотека',
      active: isPathActive(location.pathname, '/miniapp/library'),
      tone: 'locked' as const,
      onClick: () => navigate('/miniapp/library'),
    },
    {
      id: 'wheel',
      icon: Target,
      label: 'Колесо',
      active: false,
      tone: 'locked' as const,
      onClick: () => navigate('/dashboard/wheel'),
    },
    {
      id: 'ai',
      icon: Sparkles,
      label: 'ABsystem',
      active: isPathActive(location.pathname, '/miniapp/mentor'),
      tone: 'locked' as const,
      onClick: () => navigate('/miniapp/mentor'),
    },
    {
      id: 'profile',
      icon: User,
      label: 'Профіль',
      active: isPathActive(location.pathname, '/miniapp/profile'),
      tone: 'locked' as const,
      onClick: () => navigate('/miniapp/profile'),
    },
  ]

  return <JournalSideRail items={leftRailItems} dayNumber={dayNumber} side="left" />
}
