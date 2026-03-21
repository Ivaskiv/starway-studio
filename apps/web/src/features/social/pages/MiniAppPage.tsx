// frontend/src/features/telegram/miniapp/MiniAppPage.tsx
// Telegram Web App — головний екран для мобільного мінідодатку

import { useEffect, useState }       from 'react'
import { useTrackFrontendEventMutation } from '@/features/analytics/services/events.api'
import { useGetMentorContextQuery }  from '@/features/ai-mentor/services/mentor.api'
import { useResolveDeepLinkMutation } from '@/features/auth/services/deeplinks.api'
import type { MentorContext } from '@/features/ai-mentor/types/mentor.types'
import { useSelector }              from 'react-redux'
import { cn }                       from '@/lib/utils'
import { RootState } from '@/app/store'

// Тelegram WebApp SDK (injected by Telegram)
declare const Telegram: {
  WebApp: {
    ready:          () => void
    expand:         () => void
    MainButton:     { setText:(t:string)=>void; show:()=>void; onClick:(fn:()=>void)=>void; }
    themeParams:    Record<string, string>
    colorScheme:    'dark' | 'light'
    initDataUnsafe: { user?: { id:number; first_name:string }; start_param?: string }
  }
}

type Page = 'home' | 'mentor' | 'wheel' | 'report'

const MINI_APP_TABS: { id: Page; icon: string; label: string }[] = [
  { id:'home',   icon:'🏠', label:'Головна' },
  { id:'mentor', icon:'🤖', label:'Ментор' },
  { id:'wheel',  icon:'☯️', label:'Колесо' },
  { id:'report', icon:'📊', label:'Звіт' },
]

export default function MiniAppPage() {
  const [page, setPage] = useState<Page>('home')
  const userId = useSelector((s: RootState) => s.auth.user?.id ?? '')
  const [trackFrontendEvent] = useTrackFrontendEventMutation()
  const [resolveDeepLink] = useResolveDeepLinkMutation()
  const { data: ctx } = useGetMentorContextQuery(userId, { skip: !userId })

  // Init Telegram WebApp
  useEffect(() => {
    if (typeof Telegram === 'undefined') return
    Telegram.WebApp.ready()
    Telegram.WebApp.expand()
  }, [])

  useEffect(() => {
    const searchToken = new URLSearchParams(window.location.search).get('dl')
    const startParam = typeof Telegram !== 'undefined'
      ? Telegram.WebApp.initDataUnsafe?.start_param ?? null
      : null
    const token = searchToken ?? (startParam?.startsWith('dl_') ? startParam.replace(/^dl_/, '') : null)

    if (!token) {
      return
    }

    void resolveDeepLink({ token, consume: false })
      .unwrap()
      .then(result => {
        if (result.link.action === 'open_mentor' || result.link.action === 'continue_flow') {
          setPage('mentor')
        }
      })
      .catch(() => undefined)
  }, [resolveDeepLink])

  useEffect(() => {
    void trackFrontendEvent({
      userId: userId || null,
      type: 'miniapp_opened',
      source: 'miniapp',
      state: page,
      payload: {
        telegramUserId: typeof Telegram !== 'undefined'
          ? Telegram.WebApp.initDataUnsafe?.user?.id ?? null
          : null,
      },
    })
  }, [page, trackFrontendEvent, userId])

  const tgUser = typeof Telegram !== 'undefined'
    ? Telegram.WebApp.initDataUnsafe?.user
    : null

  const name = tgUser?.first_name ?? ctx?.userId?.slice(0,6) ?? 'Привіт'

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] pb-20">

      {/* ── Header ── */}
      <div className="px-4 pt-5 pb-3 border-b border-[var(--border-glass)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Starway</p>
            <h1 className="text-lg font-bold gradient-text">{name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {ctx?.streakDays != null && (
              <div className="flex items-center gap-1 liquid-glass px-2.5 py-1 rounded-full">
                <span className="text-base">🔥</span>
                <span className="text-sm font-bold">{ctx.streakDays}д</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Pages ── */}
      {page === 'home' && <HomePage ctx={ctx} setPage={setPage} userId={userId} />}
      {page === 'mentor' && <MentorPage setPage={setPage} userId={userId} />}

      {/* ── Bottom nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 liquid-glass border-t border-[var(--border-glass)]">
        <div className="flex">
          {MINI_APP_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              title={tab.label}
              aria-label={tab.label}
              onClick={() => {
                setPage(tab.id)
                void trackFrontendEvent({
                  userId: userId || null,
                  type: 'miniapp_tab_opened',
                  source: 'miniapp',
                  state: tab.id,
                  payload: {
                    tab: tab.id,
                  },
                })
              }}
              className={cn(
                'nav-tab-responsive nav-tab-footer',
                page === tab.id ? 'nav-tab-footer--active' : 'nav-tab-footer--default',
              )}
            >
              <span className="btn-icon" aria-hidden="true">{tab.icon}</span>
              <span className="nav-tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

// ── Home Page ─────────────────────────────────────────────────
function HomePage({ ctx, setPage, userId }: { ctx?: MentorContext; setPage:(p:Page)=>void; userId: string }) {
  const [trackFrontendEvent] = useTrackFrontendEventMutation()
  return (
    <div className="px-4 py-5 space-y-4 animate-fade-up">

      {/* Primary goal */}
      <div className="liquid-glass p-4 rounded-2xl">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">Головна ціль</p>
        <p className="text-sm font-semibold">
          {ctx?.primaryGoal ?? 'Ціль не задана — встанови у web-додатку'}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label:'Стан',   value: ctx?.lastState   ?? '—' },
          { label:'Сфера',  value: ctx?.focusSphere ?? '—' },
          { label:'Колесо', value: ctx?.wheelScore != null ? `${ctx.wheelScore}/10` : '—' },
          { label:'Streak', value: `${ctx?.streakDays ?? 0}д` },
        ].map(({ label, value }) => (
          <div key={label} className="liquid-glass p-3 rounded-xl">
            <p className="text-[10px] text-[var(--text-muted)] uppercase mb-0.5">{label}</p>
            <p className="text-sm font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        className="btn-primary w-full py-3 rounded-xl text-sm"
        onClick={() => {
          setPage('mentor')
          void trackFrontendEvent({
            userId: userId || null,
            type: 'miniapp_mentor_open_clicked',
            source: 'miniapp',
            state: 'home',
            payload: {
              target: 'mentor',
            },
          })
        }}
      >
        🤖 Відкрити AI-ментор
      </button>
    </div>
  )
}

// ── Mentor Chat (спрощена версія для mini app) ────────────────
function MentorPage({ setPage, userId }: { setPage:(p:Page)=>void; userId: string }) {
  const [trackFrontendEvent] = useTrackFrontendEventMutation()
  return (
    <div className="px-4 py-5 animate-fade-up">
      <button
        className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-4"
        onClick={() => setPage('home')}
      >
        ← Назад
      </button>
      <p className="text-center text-sm text-[var(--text-secondary)]">
        Повний AI-чат доступний у web-версії.
      </p>
      <a
        href={`${window.location.origin}/dashboard/ai-mentor`}
        className="btn-primary block text-center py-3 rounded-xl text-sm mt-4"
        onClick={() => {
          void trackFrontendEvent({
            userId: userId || null,
            type: 'miniapp_web_mentor_opened',
            source: 'miniapp',
            state: 'mentor',
            payload: {
              target: 'web_mentor',
            },
          })
        }}
      >
        Відкрити web-версію →
      </a>
    </div>
  )
}
