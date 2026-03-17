// frontend/src/features/user/components/ProfileBadges.tsx
// ═══════════════════════════════════════════════════════════════
//  Досягнення користувача
//  TODO: підключити реальний API endpoint для badge list
// ═══════════════════════════════════════════════════════════════

import { GlassCard } from '@/ui'
import { Award } from 'lucide-react'

// Тимчасові mock-дані — замінити на useGetBadgesQuery коли буде endpoint
const MOCK_BADGES = [
  { id: '1', emoji: '🥇', label: 'Перший крок'   },
  { id: '2', emoji: '🚀', label: 'Старт'         },
  { id: '3', emoji: '🔥', label: 'Streak 7 днів' },
]

export default function ProfileBadges() {
  return (
    <GlassCard className="p-6">
      <h3 className="text-base font-semibold text-[color:var(--text-primary)] mb-4 flex items-center gap-2">
        <Award className="w-4 h-4 text-[rgb(var(--accent-rgb))]" />
        Досягнення
      </h3>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {MOCK_BADGES.map(badge => (
          <div
            key={badge.id}
            title={badge.label}
            className="rounded-xl border border-[color:var(--border-primary)] bg-[color:var(--glass-bg)] p-4 text-center text-2xl hover:bg-[rgba(255,255,255,.06)] transition-colors cursor-default"
          >
            {badge.emoji}
          </div>
        ))}
      </div>
    </GlassCard>
  )
}