// packages/frontend/src/components/layout/Sidebar.tsx

import { useGetMeQuery } from '@/services'
import { UserRole } from '@/types/user'
import { Button } from '@/ui'
import {
  BarChart3,
  Boxes,
  Brain,
  Crown,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  UserRole: UserRole
}

// Навігація для адмінів (funnel_admin, super_admin)
const ADMIN_NAVIGATION = [
  { name: 'Огляд', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Воронки', href: '/dashboard/funnels', icon: Zap },
  { name: 'AI Генератор', href: '/dashboard/ai-generator', icon: Sparkles },
  { name: 'Продукти', href: '/dashboard/products', icon: Boxes },
  { name: 'Аналітика', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Користувачі', href: '/dashboard/users', icon: Users, superAdminOnly: true },
  { name: 'Налаштування', href: '/dashboard/settings', icon: Settings },
]

// Навігація для звичайних користувачів
const USER_NAVIGATION = [
  { name: 'AI Ментор', href: '/dashboard/ai-mentor', icon: Brain, highlight: true },
  { name: 'Мої курси', href: '/dashboard/courses', icon: Boxes },
  { name: 'Прогрес', href: '/dashboard/progress', icon: BarChart3 },
  { name: 'Налаштування', href: '/dashboard/settings', icon: Settings },
]

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { data } = useGetMeQuery()
  const user = data?.user

  const isAdmin = user?.role === 'funnel_admin' || user?.role === 'super_admin'
  const isSuperAdmin = user?.role === 'super_admin'

  // Вибір навігації по ролі
  const navigation = isAdmin 
    ? ADMIN_NAVIGATION.filter(item => !item.superAdminOnly || isSuperAdmin)
    : USER_NAVIGATION

  // Перевірка trial для users
  const trialDaysLeft = user?.trialEndsAt 
    ? Math.max(0, Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0
  const hasActiveSubscription = user?.subscriptionStatus === 'active'
  const isTrialActive = trialDaysLeft > 0

  return (
    <>
      {/* Overlay для мобільних */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static top-0 left-0 z-50 h-screen w-64
        bg-slate-950/50 backdrop-blur-xl border-r border-white/10
        transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <NavLink to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-orange rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Starway Studio</span>
            </NavLink>

            <Button
              onClick={onClose}
              className="lg:hidden p-2 hover:bg-white/10 rounded-xl transition"
              aria-label="Закрити меню"
            >
              <X className="w-5 h-5 text-slate-400" />
            </Button>
          </div>

          {/* User Info */}
          {user && (
            <div className="px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center text-xl font-bold text-white">
                  {user.firstName?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{user.firstName}</p>
                  <p className="text-xs text-slate-400">
                    {user.role === 'super_admin' && '👑 Super Admin'}
                    {user.role === 'funnel_admin' && '🎯 Funnel Admin'}
                    {user.role === 'user' && '✨ Користувач'}
                  </p>
                </div>
              </div>

              {/* Trial/Subscription badge для users */}
              {!isAdmin && (
                <div className="mt-3">
                  {hasActiveSubscription ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs">
                      <Crown className="w-3.5 h-3.5" />
                      <span>Premium активний</span>
                    </div>
                  ) : isTrialActive ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Trial: {trialDaysLeft} днів</span>
                    </div>
                  ) : (
                    <NavLink 
                      to="/dashboard/subscription"
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs hover:bg-purple-500/30 transition"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      <span>Оформити підписку</span>
                    </NavLink>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === '/dashboard'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-orange text-white shadow-lg'
                        : item.highlight
                          ? 'text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 border border-purple-500/30'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">{item.name}</span>
                  {item.highlight && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-300">
                      NEW
                    </span>
                  )}
                </NavLink>
              )
            })}

            {/* AI Mentor для адмінів (окремо) */}
            {isAdmin && (
              <>
                <div className="pt-4 pb-2">
                  <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Особисте
                  </p>
                </div>
                <NavLink
                  to="/dashboard/ai-mentor"
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                        : 'text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 border border-purple-500/30'
                    }`
                  }
                >
                  <Brain className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="font-medium">AI Ментор</span>
                </NavLink>
              </>
            )}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-white/10">
            <div className="text-xs text-slate-500 text-center space-y-1">
              <p className="font-semibold text-white">Starway Studio</p>
              <p>v1.0.0 • Beta</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar