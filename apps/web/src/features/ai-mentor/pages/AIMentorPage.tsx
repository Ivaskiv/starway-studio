import { useAppSelector } from '@/app/hooks'
import { ROUTES } from '@/config/routes'
import { selectUserRole } from '@/features/auth/services/auth.slice'
import { useGetTrialStatusQuery, useStartTrialMutation } from '@/features/trial/services/trial.api'

import { useMentorAccess } from '../hooks/useMentorAccess'

import MentorLocked from '../components/MentorLocked'
import MentorWorkspace from '../components/mentorWorkspace/MentorWorkspace'

import AIMentorChat from '../components/AIMentorChat'
import GamificationWidget from '@/features/gamification/components/GamificationWidget'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function DailyStatusBar() {
  const navigate = useNavigate()
  const now = new Date()
  const hour = now.getHours()

  const items = [
    {
      icon: '🌞',
      label: 'Ранкова сесія',
      sub: '6 питань · ~5 хв',
      available: hour >= 9,
      path: '/dashboard/cycle?session=morning',
      timeHint: 'о 09:00',
    },
    {
      icon: '🌙',
      label: 'Вечірня рефлексія',
      sub: 'Афірмації + мікрозавдання',
      available: hour >= 21,
      path: '/dashboard/cycle?session=evening',
      timeHint: 'о 21:00',
    },
    {
      icon: '⚖️',
      label: 'Колесо балансу',
      sub: 'Раз на місяць · аналіз 8 сфер',
      available: true,
      path: '/dashboard/wheel',
      timeHint: null,
    },
  ] as const

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
        Сьогодні
      </p>
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.label}
            className={[
              'flex items-center gap-3 rounded-xl p-3 transition-all',
              item.available
                ? 'cursor-pointer border border-[var(--border)] hover:bg-[var(--glass-bg)]'
                : 'opacity-40 border border-transparent',
            ].join(' ')}
            onClick={() => item.available && navigate(item.path)}
          >
            <span className="text-lg flex-shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {item.label}
              </p>
              <p className="text-xs text-[var(--text-muted)]">{item.sub}</p>
            </div>
            <span
              className={[
                'text-xs px-2 py-1 rounded-full flex-shrink-0',
                item.available
                  ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
              ].join(' ')}
            >
              {item.available
                ? 'Розпочати'
                : item.timeHint ?? ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AIMentorPage() {
  const navigate = useNavigate()
  const access = useMentorAccess()
  const userRole = useAppSelector(selectUserRole)
  const isSuperAdmin = (userRole ?? '').toUpperCase() === 'SUPERADMIN'
  const [previewAsUser, setPreviewAsUser] = useState(false)
  const showAsUser = !isSuperAdmin || previewAsUser
  const { data: trial } = useGetTrialStatusQuery()
  const [startTrial] = useStartTrialMutation()

  const handleStartTrial = async () => {
    try {
      await startTrial().unwrap()
      navigate('/dashboard')
    } catch (e) {
      console.error('[AIMentor] startTrial failed:', e)
    }
  }

  return (
    <div className="space-y-6">
      {isSuperAdmin && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-[var(--accent)] bg-[var(--accent-bg,var(--bg-secondary))] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--accent)]">
              {previewAsUser ? '👤 Вигляд користувача' : '🎓 Вигляд коуча'}
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              {previewAsUser ? '— тестуєш як звичайний user' : '— твій режим SUPERADMIN'}
            </span>
          </div>
          <button
            onClick={() => setPreviewAsUser(v => !v)}
            className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
          >
            {previewAsUser ? 'Повернутись як коуч' : 'Переглянути як user'}
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[rgba(var(--accent-rgb),0.15)] border border-[rgba(var(--accent-rgb),0.3)] flex items-center justify-center">
          <span className="text-lg">🤖</span>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)] mb-0.5">
            Модуль AI Асистента
          </p>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">AI Ментор</h1>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { id: 'session', label: 'Сесія', active: true },
          { id: 'wheel', label: 'Колесо', path: ROUTES.WHEEL },
          { id: 'report', label: 'Звіт', path: ROUTES.PROGRESS },
          { id: 'progress', label: 'Прогрес', path: ROUTES.PROGRESS },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => tab.path && navigate(tab.path)}
            className={[
              'rounded-xl border px-4 py-2 text-sm font-medium transition-colors',
              tab.active
                ? 'border-[rgba(var(--accent-rgb),0.45)] bg-[rgba(var(--accent-rgb),0.16)] text-white'
                : 'border-white/12 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <GamificationWidget />

      {showAsUser && !trial?.isActive && (
        <div className="mb-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="p-6">
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
              AI МЕНТОР
            </p>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Персональний коуч 24/7
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Ранкові питання, вечірні афірмації, колесо балансу,
              мікрозавдання та AI аналіз твого стану.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { plan: 'Тиждень', price: '7€', desc: 'Ідеально для тесту', key: 'WEEK' },
                { plan: 'Місяць', price: '30€', desc: 'Глибинна робота', key: 'MONTH' },
                { plan: 'Рік', price: '300€', desc: 'Максимальна економія', key: 'YEAR' },
              ].map(p => (
                <div
                  key={p.key}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary,var(--bg-secondary))] p-4 text-center"
                >
                  <p className="text-sm font-medium text-[var(--text-primary)]">{p.plan}</p>
                  <p className="text-2xl font-bold text-[var(--accent)]">{p.price}</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{p.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleStartTrial}
                className="flex-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-medium text-white transition-all hover:brightness-110"
              >
                Розпочати 7 днів безкоштовно
              </button>
              <button
                onClick={() => navigate('/dashboard/subscription')}
                className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
              >
                Обрати план
              </button>
            </div>
          </div>
        </div>
      )}

      {showAsUser && trial?.isActive && (
        <>
          {access.level === 'none' && <MentorLocked />}
          {access.level !== 'none' && (
            <>
              <DailyStatusBar />
              <MentorWorkspace limited={access.level === 'trial'}>
                <AIMentorChat />
              </MentorWorkspace>
            </>
          )}
        </>
      )}

      {!showAsUser && (
        <>
          {access.level === 'none' && <MentorLocked />}
          {access.level !== 'none' && (
            <>
              <DailyStatusBar />
              <MentorWorkspace>
                <AIMentorChat />
              </MentorWorkspace>
            </>
          )}
        </>
      )}

    </div>
  )
}
