import { X } from 'lucide-react'

import { GlassCard } from '@/ui'

type Props = {
  visible: boolean
  onClose: () => void
}

export default function AiMentorDashboardLevelUpCallout({ visible, onClose }: Props) {
  if (!visible) return null

  return (
    <GlassCard className="border border-amber-300/30 bg-[linear-gradient(180deg,rgba(120,92,37,0.24),rgba(21,32,54,0.88)_28%,rgba(10,18,36,0.96))] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35),0_0_0_1px_rgba(251,191,36,0.08)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">Premium unlock</p>
          <p className="mt-3 text-xl font-semibold text-white">Нові можливості вже відкриті</p>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Твій прогрес зафіксований. Переглянь сесію, прогрес і наступні кроки без зайвих переходів.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/10 bg-white/5 p-2 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Закрити повідомлення про новий рівень"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </GlassCard>
  )
}
