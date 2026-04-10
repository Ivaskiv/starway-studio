// frontend/src/features/user/components/ProfileHistory.tsx
// ═══════════════════════════════════════════════════════════════
//  Вкладка "Активність" — список подій/сесій
//  TODO: підключити реальний API
// ═══════════════════════════════════════════════════════════════

import { GlassCard } from '@/ui'
import { Clock } from 'lucide-react'

const MOCK_HISTORY = [
  { id: '1', text: 'Пройдено Колесо балансу',    date: 'Сьогодні, 09:14'  },
  { id: '2', text: 'Додано нову ціль',           date: 'Вчора, 21:30'     },
  { id: '3', text: 'Сесію з ментором завершено', date: '6 берез., 18:45'  },
  { id: '4', text: 'Streak 7 днів!',             date: '5 берез., 00:00'  },
]

export default function ProfileHistory() {
  return (
    <GlassCard className="p-6">
      <h3 className="text-base font-semibold text-[color:var(--text-primary)] mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-[rgb(var(--accent-rgb))]" />
        Активність
      </h3>

      {MOCK_HISTORY.length === 0 ? (
        <p className="text-sm text-[color:var(--text-muted)]">Активність відсутня.</p>
      ) : (
        <ol className="space-y-3">
          {MOCK_HISTORY.map(item => (
            <li key={item.id} className="flex items-start gap-3">
              <span className="mt-1.5 w-2 h-2 rounded-full bg-[rgba(var(--accent-rgb),.7)] flex-shrink-0" />
              <div>
                <p className="text-sm text-[color:var(--text-secondary)]">{item.text}</p>
                <p className="text-xs text-[color:var(--text-muted)] mt-0.5">{item.date}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </GlassCard>
  )
}
