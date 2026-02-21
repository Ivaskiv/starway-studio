// frontend/src/layout/UserMenu.tsx
import { useAccess } from '@/features/auth/hooks/useAccess'
import { useAuth } from '@/features/auth/hooks/useAuth'
import {
  ChevronDown, Crown, HelpCircle,
  LogOut, Settings, User, Zap,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface UserMenuProps {
  variant?: 'sidebar' | 'header'
}

export function UserMenu({ variant = 'sidebar' }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef  = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { isPaid, isTrial } = useAccess()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!user) return null

  const initials    = (user.name?.[0] || user.email?.[0] || 'U').toUpperCase()
  const displayName = user.name || user.email?.split('@')[0] || 'User'

  const planLabel = isPaid ? 'Premium' : isTrial ? 'Trial' : 'Free'
  const planStyle = isPaid
    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    : isTrial
      ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
      : 'bg-white/5 text-white/40 border-white/10'

  const menuItems = [
    { icon: User,       label: 'Профіль',     path: '/dashboard/profile'  },
    { icon: Settings,   label: 'Налаштування', path: '/dashboard/settings' },
    { icon: HelpCircle, label: 'Допомога',     path: '/help'               },
  ]

  const dropdownPosition = variant === 'header'
    ? 'right-0 top-full mt-2'
    : 'left-0 bottom-full mb-2'

  return (
    <div ref={menuRef} className="relative">

      {/* ── Trigger ─────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className={`
          flex items-center gap-2.5 rounded-xl transition-all duration-200 outline-none
          ${variant === 'header'
            ? 'px-2 py-1.5 hover:bg-white/8'
            : 'w-full px-3 py-2.5 hover:bg-white/5'
          }
        `}
      >
{/* Avatar */}
<div className="relative shrink-0">
  <div className="
    w-9 h-9 rounded-full
    bg-gradient-to-br from-orange-500 to-rose-500
    flex items-center justify-center
    text-white text-sm font-bold select-none
    ring-1 ring-white/10
    shadow-[0_0_0_2px_rgba(255,255,255,0.05),0_4px_12px_rgba(0,0,0,0.5)]
  ">
    {initials}
  </div>
  {/* Glassmorphism online indicator */}
  <div className="
    absolute -bottom-0.5 -right-0.5
    w-3.5 h-3.5 rounded-full
    bg-emerald-500/20 backdrop-blur-sm
    border border-emerald-400/50
    flex items-center justify-center
    shadow-[0_0_8px_rgba(52,211,153,0.5)]
  ">
    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
  </div>
</div>
        {/* Sidebar: name + plan */}
        {variant === 'sidebar' && (
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm text-white font-medium truncate leading-tight">{displayName}</p>
            <span className={`inline-flex items-center gap-1 mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${planStyle}`}>
              {isPaid && <Zap className="w-2.5 h-2.5" />}
              {planLabel}
            </span>
          </div>
        )}

        {/* Header: name only */}
        {variant === 'header' && (
          <span className="hidden md:block text-sm text-white/90 font-medium max-w-[100px] truncate">
            {displayName}
          </span>
        )}

        <ChevronDown
          className={`w-4 h-4 text-white/40 transition-transform duration-200 shrink-0
            ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ── Dropdown ────────────────────────────────────── */}
      {isOpen && (
        <div className={`
          absolute ${dropdownPosition} z-[100] w-64
          rounded-2xl border border-white/10
          bg-black/90 backdrop-blur-2xl
          shadow-[0_20px_60px_rgba(0,0,0,0.8)]
          overflow-hidden
          animate-in fade-in slide-in-from-top-2 duration-150
        `}>

          {/* User info header */}
          <div className="px-4 pt-4 pb-3 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white font-semibold truncate">{displayName}</p>
                <p className="text-xs text-white/50 truncate">{user.email}</p>
              </div>
            </div>

            {/* Plan badge */}
            <div className={`mt-3 flex items-center justify-between px-3 py-2 rounded-xl border ${planStyle}`}>
              <span className="text-xs font-semibold flex items-center gap-1.5">
                {isPaid && <Zap className="w-3 h-3" />}
                {isPaid ? 'Premium план' : isTrial ? 'Trial період' : 'Free план'}
              </span>
              {!isPaid && (
                <button
                  onClick={() => { navigate('/dashboard/subscription'); setIsOpen(false) }}
                  className="text-[10px] font-bold text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Upgrade →
                </button>
              )}
            </div>
          </div>

          {/* Menu items */}
          <div className="p-2">
            {menuItems.map(item => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setIsOpen(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/70 hover:text-white hover:bg-white/8 transition-all duration-150 text-left"
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Upgrade — тільки якщо не paid */}
          {!isPaid && (
            <div className="px-2 pb-2">
              <button
                onClick={() => { navigate('/dashboard/subscription'); setIsOpen(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-amber-400 hover:bg-amber-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all duration-150"
              >
                <Crown className="w-4 h-4 shrink-0" />
                <span>Покращити план</span>
              </button>
            </div>
          )}

          {/* Divider + Logout */}
          <div className="border-t border-white/8 p-2">
            <button
              onClick={() => { logout(); setIsOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400/80 hover:text-red-400 hover:bg-red-500/8 transition-all duration-150"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Вийти</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
