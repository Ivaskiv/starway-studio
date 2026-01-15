// packages/frontend/src/features/dashboard/DashboardLayout.tsx

import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGetProgressQuery } from '@/features/progress/services/progress.api'
import { Button } from '@/ui'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BarChart3,
  Bell,
  BookOpen,
  Crown,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/dashboard/ai-mentor', label: 'AI Ментор', icon: Sparkles, badge: 'NEW', badgeColor: 'bg-green-500' },
  { path: '/dashboard/courses', label: 'Мої курси', icon: BookOpen },
  { path: '/dashboard/progress', label: 'Прогрес', icon: BarChart3 },
  { path: '/dashboard/settings', label: 'Налаштування', icon: Settings },
]

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // ✅ НЕ стріляємо без auth
  const { data: progressData } = useGetProgressQuery(undefined, {
    skip: !user,
  })

  const xp = progressData?.xp || 0
  const now = new Date()

  const greeting =
    now.getHours() < 12
      ? 'Доброго ранку'
      : now.getHours() < 18
      ? 'Доброго дня'
      : 'Доброго вечора'

const trialEndsAt =
  user && 'trial_ends_at' in user && user.trial_ends_at
    ? new Date(user.trial_ends_at as string)
    : null

const trialDaysLeft = trialEndsAt
  ? Math.max(
      0,
      Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    )
  : 0

  const hasActiveTrial =
    trialDaysLeft > 0 && user?.subscription_status !== 'active'

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="hidden md:block font-bold text-white text-lg">
              Starway Studio
            </span>
          </NavLink>

          <div className="hidden lg:block">
            <div className="px-6 py-2 rounded-2xl bg-white/5 border border-white/10">
              <span className="text-white">
                {greeting},{' '}
                <span className="font-semibold">
                  {user?.first_name || 'User'}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="text-amber-400 font-medium">{xp} XP</span>
            </div>

            <Button variant="ghost">
              <Bell className="w-5 h-5 text-white/60" />
            </Button>

            <Button
              variant="ghost"
              onClick={logout}
              className="hover:bg-red-500/20"
            >
              <LogOut className="w-5 h-5 text-white/60" />
            </Button>

            <Button
              variant="ghost"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen((v) => !v)}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-white" />
              ) : (
                <Menu className="w-5 h-5 text-white" />
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className="hidden lg:flex w-64 border-r border-white/5 bg-slate-900/50">
          <div className="p-4 flex flex-col gap-4 w-full">
            <div className="p-4 rounded-2xl bg-white/5">
              <p className="text-white font-medium">
                {user?.first_name || 'User'}
              </p>
              {hasActiveTrial && (
                <p className="text-purple-400 text-sm mt-1">
                  Trial: {trialDaysLeft} днів
                </p>
              )}
            </div>

            <nav className="flex-1 space-y-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-orange-500/20 to-pink-500/20 text-white'
                        : 'text-white/60 hover:bg-white/5'
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </aside>

        {/* MOBILE MENU */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed inset-0 z-50 lg:hidden bg-black/60"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* CONTENT */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
