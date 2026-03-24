import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'

import type { RootState } from '@/app/store'
import { ROUTES } from '@/config/routes'
import { useGetProfileQuery } from '@/features/gamification/services/gamification.api'
import { useGetTrialStatusQuery } from '@/features/trial/services/trial.api'

declare const Telegram:
  | {
      WebApp: {
        ready: () => void
        expand: () => void
        close: () => void
        MainButton: {
          setText: (text: string) => void
          show: () => void
          hide: () => void
          onClick: (callback: () => void) => void
        }
        colorScheme: 'dark' | 'light'
        initDataUnsafe: {
          user?: { id: number; first_name: string; username?: string }
          start_param?: string
        }
      }
    }
  | undefined

type Page = 'home' | 'mentor' | 'tracker' | 'library' | 'profile'
type ChatRole = 'user' | 'ai'
type NavItem = { id: Page; icon: string; label: string }

const NAVBAR: NavItem[] = [
  { id: 'home', icon: '🏠', label: 'Головна' },
  { id: 'library', icon: '📚', label: 'Бібліотека' },
  { id: 'mentor', icon: '✦', label: 'AI-ювелір' },
  { id: 'tracker', icon: '💎', label: 'Трекер' },
  { id: 'profile', icon: '👤', label: 'Профіль' },
]

const LIBRARY_ITEMS = [
  { icon: '🎯', title: '5 точок опори', sub: 'Безкоштовно', locked: false },
  { icon: '🔥', title: 'Система 21', sub: 'Тріал · 33€', locked: false },
  { icon: '😨', title: 'Страхи', sub: '33€ · 30 днів', locked: true },
  { icon: '💡', title: 'Код змін', sub: '33€ · 30 днів', locked: true },
  { icon: '⚡', title: 'Стан — ключ до успіху', sub: '10€ · 14 днів', locked: true },
]

const TRACKER_ITEMS = [
  { label: 'Вкус до життя', pct: 45, success: false, badge: false },
  { label: 'Без ілюзій', pct: 20, success: false, badge: false },
  { label: 'Присутність', pct: 60, success: true, badge: false },
  { label: 'Дія', pct: 15, success: false, badge: true },
  { label: 'Спадщина', pct: 5, success: false, badge: false },
]

export default function MiniAppPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState<Page>('home')
  const [chatMessages, setChatMessages] = useState<Array<{ role: ChatRole; text: string }>>([
    { role: 'ai', text: 'Привіт! Я твій AI ментор. Готовий підтримати твій шлях до результату 🚀' },
  ])
  const [chatInput, setChatInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  const user = useSelector((state: RootState) => state.auth.user)
  const userId = user?.id ?? ''
  const userName = user?.firstName ?? user?.name ?? 'Учень'
  const { data: trial } = useGetTrialStatusQuery(undefined, { skip: !userId })
  const { data: profile } = useGetProfileQuery(undefined, { skip: !userId })

  useEffect(() => {
    if (typeof Telegram === 'undefined') return
    Telegram.WebApp.ready()
    Telegram.WebApp.expand()
  }, [])

  useEffect(() => {
    if (typeof Telegram === 'undefined') return

    Telegram.WebApp.MainButton.setText(page === 'mentor' ? 'Відкрити AI Ментор' : 'Відкрити Starway')
    Telegram.WebApp.MainButton.onClick(() => {
      if (page === 'mentor') {
        setPage('mentor')
        return
      }
      navigate(ROUTES.DASHBOARD)
    })
    Telegram.WebApp.MainButton.show()

    return () => {
      Telegram.WebApp.MainButton.hide()
    }
  }, [navigate, page])

  const hasAccess = (trial?.isActive ?? false) || (trial?.isPaid ?? false)
  const trackerProgress = Math.min(100, ((trial?.currentDay ?? 0) / 100) * 100)
  const trackerWidth = `${trackerProgress}%`
  const tgUser = typeof Telegram === 'undefined' ? null : Telegram.WebApp.initDataUnsafe.user
  const displayName = tgUser?.first_name ?? userName
  const profileStreak = profile?.currentStreakDays ?? 0

  const sendMessage = async () => {
    if (!chatInput.trim() || isSending) return
    const text = chatInput.trim()

    setChatInput('')
    setChatMessages((messages) => [...messages, { role: 'user', text }])
    setIsSending(true)

    try {
      const token = localStorage.getItem('starway_access_token') ?? ''
      const response = await fetch('/api/mentor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text, userId }),
      })

      const data = (await response.json()) as {
        mentorMessage?: { content?: string }
        reply?: string
      }

      const reply =
        data.mentorMessage?.content ??
        data.reply ??
        'Дякую за твою відповідь 🌱'

      setChatMessages((messages) => [...messages, { role: 'ai', text: reply }])
    } catch {
      setChatMessages((messages) => [
        ...messages,
        {
          role: 'ai',
          text: 'Зараз не можу відповісти. Спробуй пізніше.',
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div
      className="mx-auto flex w-full flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]"
      style={{ minHeight: '100dvh', maxWidth: 430 }}
    >
      <div className="flex-1 overflow-y-auto pb-20">
        {page === 'home' && (
          <div className="space-y-0">
            <div className="miniapp-home-hero relative overflow-hidden px-5 pt-8 pb-6">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-[rgb(var(--accent-soft-rgb))]">
                AI-ЕКОСИСТЕМА · STARWAY STUDIO
              </p>
              <h1 className="mb-2 text-2xl font-bold leading-tight text-[var(--text-primary)]">
                Вийди із застою.
                <br />
                Побудуй систему.
                <br />
                Живи результат.
              </h1>
              <p className="mb-5 text-xs text-[var(--text-muted)]">
                Підтримка 24/7. Система: СТАН → ЦІЛЬ → ВИБІР → ДІЯ.
              </p>
              {!hasAccess && (
                <button
                  type="button"
                  onClick={() => setPage('mentor')}
                  className="w-full rounded-2xl bg-[var(--accent)] py-3.5 text-sm font-semibold text-white"
                >
                  ▶ Почати безкоштовно
                </button>
              )}
            </div>

            <div className="space-y-3 px-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">AI Ментор</p>
                    <p className="text-xs text-[var(--text-muted)]">Персональний ментор 24/7</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'BITMIND', value: profile?.bitMind ?? 0 },
                    { label: 'Streak', value: profileStreak },
                    { label: 'Рівень', value: profile?.level ?? 1 },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] p-2 text-center"
                    >
                      <p className="text-base font-bold text-[var(--accent)]">{item.value}</p>
                      <p className="mt-0.5 text-[9px] text-[var(--text-muted)]">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-left"
                onClick={() => setPage('tracker')}
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-2xl">💎</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Трекер Ювеліра</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {trial?.currentDay ?? 0}/100 · 5 граней розвитку
                    </p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--border)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all"
                    style={{ width: trackerWidth }}
                  />
                </div>
              </button>

              <button
                type="button"
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-4 text-left"
                onClick={() => setPage('library')}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📚</span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">Лабораторія</p>
                    <p className="text-xs text-[var(--text-muted)]">Матеріали та курси</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {page === 'mentor' && (
          <div className="flex h-full flex-col">
            <div className="border-b border-[var(--border)] px-4 pt-4 pb-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(var(--accent-rgb),0.2)] text-lg">
                  ✦
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Starway AI</p>
                  <p className="flex items-center gap-1 text-xs text-[var(--color-success)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-success)]" />
                    Активний
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {chatMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                >
                  <div
                    className={[
                      'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                      message.role === 'user'
                        ? 'rounded-br-sm bg-[var(--accent)] text-white'
                        : 'rounded-bl-sm border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]',
                    ].join(' ')}
                  >
                    {message.text}
                  </div>
                  {message.role === 'ai' && (
                    <div className="ml-2 flex h-8 w-8 flex-shrink-0 items-center justify-center self-end rounded-full bg-[rgba(var(--accent-rgb),0.15)] text-sm">
                      ✦
                    </div>
                  )}
                </div>
              ))}
              {isSending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm text-[var(--text-muted)]">
                    ···
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void sendMessage()
                    }
                  }}
                  placeholder="Напиши AI..."
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={!chatInput.trim() || isSending}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-white disabled:opacity-50"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>
        )}

        {page === 'tracker' && (
          <div className="space-y-4 px-4 pt-6">
            <div className="text-center">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[rgb(var(--accent-soft-rgb))]">
                ТРЕКЕР ЮВЕЛІРА
              </p>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Кожен день — крок до мрії</h2>
            </div>

            <div className="flex items-center justify-center">
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-[var(--accent)]">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[var(--accent)]">{trial?.currentDay ?? 0}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">з 100</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {TRACKER_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3"
                >
                  <span className="w-28 flex-shrink-0 text-sm text-[var(--text-primary)]">{item.label}</span>
                  <div className="flex-1 rounded-full bg-[var(--border)]">
                    <div
                      className={[
                        'h-1.5 rounded-full transition-all',
                        item.success ? 'bg-[var(--color-success)]' : 'bg-[var(--accent)]',
                      ].join(' ')}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-xs text-[var(--text-muted)]">{item.pct}%</span>
                  {item.badge && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                      ✦
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {page === 'library' && (
          <div className="space-y-4 px-4 pt-6">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Бібліотека</h2>
            <div className="space-y-3">
              {LIBRARY_ITEMS.map((item) => (
                <div
                  key={item.title}
                  className={[
                    'flex items-center gap-3 rounded-2xl border p-4',
                    item.locked
                      ? 'border-[var(--border)] bg-[var(--bg-secondary)] opacity-60'
                      : 'border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.06)]',
                  ].join(' ')}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{item.sub}</p>
                  </div>
                  {item.locked ? (
                    <span className="text-sm">🔒</span>
                  ) : (
                    <span className="text-sm text-[var(--accent)]">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {page === 'profile' && (
          <div className="space-y-5 px-4 pt-6">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[rgba(var(--accent-rgb),0.2)] text-3xl font-bold text-[var(--accent)]">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-[var(--text-primary)]">{displayName}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {trial?.isActive ? '🟢 Тріал активний' : '⚪ Немає підписки'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'BITMIND', value: profile?.bitMind ?? 0 },
                { label: 'NEUROGEMS', value: profile?.neuroGems ?? 0 },
                { label: 'Streak', value: profileStreak },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-center"
                >
                  <p className="text-xl font-bold text-[var(--accent)]">{item.value}</p>
                  <p className="mt-0.5 text-[9px] text-[var(--text-muted)]">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {[
                { icon: '💎', label: 'Premium підписка', accent: true, onClick: () => navigate(ROUTES.SUBSCRIPTION) },
                { icon: '🚀', label: 'Подати заявку на інвестиції', accent: false, onClick: () => undefined },
                { icon: '📋', label: 'Заявка на публікацію кейса', accent: false, onClick: () => undefined },
                { icon: '🏢', label: 'ДНК бренду', accent: false, onClick: () => undefined },
                { icon: '⚙️', label: 'Налаштування', accent: false, onClick: () => navigate(ROUTES.SETTINGS) },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className={[
                    'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left',
                    item.accent
                      ? 'border-[rgba(var(--accent-rgb),0.4)] bg-[rgba(var(--accent-rgb),0.08)]'
                      : 'border-[var(--border)] bg-[var(--bg-secondary)]',
                  ].join(' ')}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="flex-1 text-sm text-[var(--text-primary)]">{item.label}</span>
                  <span className="text-[var(--text-muted)]">›</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <nav className="fixed bottom-0 left-1/2 w-full -translate-x-1/2 border-t border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="mx-auto flex" style={{ maxWidth: 430 }}>
          {NAVBAR.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPage(tab.id)}
              className={page === tab.id
                ? 'flex flex-1 flex-col items-center gap-1 py-2.5 text-[var(--accent)] transition-all'
                : 'flex flex-1 flex-col items-center gap-1 py-2.5 text-[var(--text-muted)] transition-all'}
            >
              {tab.id === 'mentor' ? (
                <div
                  className={page === 'mentor'
                    ? 'miniapp-nav-orb flex h-10 w-10 -mt-5 items-center justify-center rounded-full border-2 border-[var(--accent)] bg-[var(--accent)] text-lg text-white'
                    : 'miniapp-nav-orb flex h-10 w-10 -mt-5 items-center justify-center rounded-full border-2 border-[var(--border)] bg-[var(--bg-secondary)] text-lg text-[var(--accent)]'}
                >
                  ✦
                </div>
              ) : (
                <span className="text-xl leading-none">{tab.icon}</span>
              )}
              <span className="text-[9px] font-medium leading-none">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
