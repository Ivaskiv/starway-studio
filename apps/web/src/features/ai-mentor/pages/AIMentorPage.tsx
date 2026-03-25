import { useAppSelector } from '@/app/hooks'
import { ROUTES } from '@/config/routes'
import { useAttachEmailMutation } from '@/features/auth/services/auth.api'
import { selectUserRole } from '@/features/auth/services/auth.slice'
import { MicroTaskList } from '@/features/microTask/components/MicroTaskList'
import {
  useCompleteMicroTaskMutation,
  useGetMicroTasksQuery,
  useSkipMicroTaskMutation,
} from '@/features/microTask/services/microTask.api'
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
  const { data: trial } = useGetTrialStatusQuery()
  const { data: microTasks = [] } = useGetMicroTasksQuery(undefined, {
    skip: !(trial?.isActive ?? false),
  })
  const [completeMicroTask] = useCompleteMicroTaskMutation()
  const [skipMicroTask] = useSkipMicroTaskMutation()

  const now = new Date()
  const hour = now.getHours()
  const currentDay = trial?.currentDay ?? 0
  const isActive = trial?.isActive ?? false

  const items = [
    {
      icon: '🌞',
      label: 'Ранкові питання',
      sub: '6 питань · ~5 хв',
      available: hour >= 9 && isActive,
      done: false,
      path: '/dashboard/cycle?session=morning',
      hint: hour < 9 ? 'о 09:00' : '',
    },
    {
      icon: '🌙',
      label: 'Вечірня рефлексія',
      sub: 'Афірмації + підсумок',
      available: hour >= 21 && isActive,
      done: false,
      path: '/dashboard/cycle?session=evening',
      hint: hour < 21 ? 'о 21:00' : '',
    },
    {
      icon: '⚖️',
      label: 'Колесо балансу',
      sub: 'Раз на місяць · 8 сфер',
      available: isActive && currentDay >= 4,
      done: trial?.hasDay4Mirror ?? false,
      path: '/dashboard/wheel',
      hint: currentDay < 4 ? 'з дня 4' : '',
    },
  ] as const

  const activeTasks = microTasks.filter(t => (t.status ?? 'PENDING') === 'PENDING')

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
          Сьогодні · День {currentDay || '—'}
        </p>
        <div className="space-y-2">
          {items.map(item => (
            <div
              key={item.label}
              className={[
                'flex items-center gap-3 rounded-xl border p-3 transition-all',
                item.done
                  ? 'border-[var(--color-success)] bg-[var(--color-success-bg)]'
                  : item.available
                    ? 'cursor-pointer border-[var(--border)] hover:bg-[var(--glass-bg)]'
                    : 'border-transparent opacity-40',
              ].join(' ')}
              onClick={() => item.available && !item.done && navigate(item.path)}
            >
              <span className="flex-shrink-0 text-lg">{item.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                <p className="text-xs text-[var(--text-muted)]">{item.sub}</p>
              </div>
              <span
                className={[
                  'flex-shrink-0 rounded-full px-2 py-1 text-xs',
                  item.done
                    ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                    : item.available
                      ? 'bg-[var(--bg-tertiary)] text-[var(--accent)]'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
                ].join(' ')}
              >
                {item.done ? '✓ Готово' : item.available ? 'Розпочати' : item.hint || '🔒'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {isActive && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
              Мікрозавдання
            </p>
            {activeTasks.length > 0 && (
              <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-bold text-white">
                {activeTasks.length}
              </span>
            )}
          </div>
          <MicroTaskList
            tasks={microTasks}
            onComplete={id => {
              void completeMicroTask(id)
            }}
            onSkip={id => {
              void skipMicroTask(id)
            }}
          />
        </div>
      )}
    </div>
  )
}

export default function AIMentorPage() {
  const navigate = useNavigate()
  const access = useMentorAccess()
  const userRole = useAppSelector(selectUserRole)
  const isSuperAdmin = (userRole ?? '').toUpperCase() === 'SUPERADMIN'
  const [previewAsUser, setPreviewAsUser] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [emailInput, setEmailInput] = useState('')
  const [emailError, setEmailError] = useState('')
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)
  const showAsUser = !isSuperAdmin || previewAsUser
  const { data: trial } = useGetTrialStatusQuery()
  const [startTrial] = useStartTrialMutation()
  const [attachEmail] = useAttachEmailMutation()

  const handleStartTrial = async () => {
    try {
      await startTrial().unwrap()
      navigate('/dashboard')
    } catch (e: unknown) {
      const err = e as { data?: { error?: string } }
      if (err?.data?.error === 'EMAIL_REQUIRED') {
        setShowEmailForm(true)
        return
      }
      console.error('[AIMentor] startTrial failed:', e)
    }
  }

  const handleEmailSubmit = async () => {
    if (!emailInput.includes('@')) {
      setEmailError('Введіть коректний email')
      return
    }

    setIsUpdatingEmail(true)
    try {
      await attachEmail({ email: emailInput }).unwrap()
      setShowEmailForm(false)
      await startTrial().unwrap()
      navigate('/dashboard')
    } catch {
      setEmailError('Помилка збереження email')
    } finally {
      setIsUpdatingEmail(false)
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

      {showAsUser && (
        <>
          {showEmailForm && (
            <div className="overflow-hidden rounded-2xl border border-[var(--accent)] bg-[var(--bg-secondary)]">
              <div className="p-5">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[var(--accent)]">
                  ОСТАННІЙ КРОК
                </p>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  Введи свій email
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Щоб отримувати звіти та важливі сповіщення
                </p>
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => { setEmailInput(e.target.value); setEmailError('') }}
                  placeholder="your@email.com"
                  className="mt-4 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary,var(--bg-secondary))] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)]"
                />
                {emailError && (
                  <p className="mt-1 text-xs text-red-400">{emailError}</p>
                )}
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={handleEmailSubmit}
                    disabled={isUpdatingEmail}
                    className="flex-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-medium text-white transition-all hover:brightness-110 disabled:opacity-50"
                  >
                    {isUpdatingEmail ? 'Зберігаємо...' : 'Продовжити →'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmailForm(false)}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-hover)]"
                  >
                    Скасувати
                  </button>
                </div>
              </div>
            </div>
          )}

          {!trial?.isActive && !showEmailForm && (
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
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { plan: 'Тиждень', price: '7€', desc: 'Ідеально для тесту' },
                    { plan: 'Місяць', price: '30€', desc: 'Глибинна робота' },
                    { plan: 'Рік', price: '300€', desc: 'Максимальна економія' },
                  ].map(p => (
                    <div
                      key={p.plan}
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
                    type="button"
                    onClick={handleStartTrial}
                    className="flex-1 rounded-xl bg-[var(--accent)] py-3 text-sm font-medium text-white transition-all hover:brightness-110"
                  >
                    Розпочати 7 днів безкоштовно
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/subscription')}
                    className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--glass-bg-hover)]"
                  >
                    Обрати план
                  </button>
                </div>
              </div>
            </div>
          )}

          {trial?.isActive && (
            <>
              <DailyStatusBar />
              {access.level === 'none' && <MentorLocked />}
              {access.level !== 'none' && (
                <MentorWorkspace limited={access.level === 'trial'}>
                  <AIMentorChat />
                </MentorWorkspace>
              )}
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
