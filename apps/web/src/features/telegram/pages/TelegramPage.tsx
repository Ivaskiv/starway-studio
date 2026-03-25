import { useMemo, useState } from 'react'
import { Button, GlassCard } from '@/ui'
import { CheckCircle2, Circle, CircleDashed, Code2, Flame, ShieldCheck, Sparkles, Target, Trophy, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

type TabId = 'map' | 'engine' | 'levels' | 'streak' | 'code' | 'spam' | 'checklist'
type ItemStatus = 'done' | 'partial' | 'pending'

type ChecklistItem = {
  id: string
  title: string
  status: ItemStatus
  percent: number
  note: string
}

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'map', label: 'Карта подій' },
  { id: 'engine', label: 'Engine' },
  { id: 'levels', label: 'Рівні' },
  { id: 'streak', label: 'Streak milestones' },
  { id: 'code', label: 'Код' },
  { id: 'spam', label: 'Анти-спам' },
  { id: 'checklist', label: 'Чеклист' },
]

const eventRows = [
  ['🔥 Стрік 3/7/14/30/100', 'Юзер дійшов до milestone → нагорода + TG повідомлення', '+NEUROGEMS · TG notify'],
  ['💔 Стрік перервано', 'lastActiveDate < вчора → ранковий cron шле повернення в систему', 'TG critical'],
  ['⚡ Стрік під загрозою', 'Стрік > 3 і сьогодні ще нема активності → вечірній ризик', 'TG urgent'],
  ['⭐ XP отримано', 'Будь-яка дія дає XP → тільки in-app feedback, без TG шуму', '+XP toast'],
  ['🎯 Майже новий рівень', 'До наступного рівня ≤ 20 XP → разове TG нагадування', 'TG once'],
  ['🌟 Новий рівень', 'XP перетнув поріг → TG + level-up UI на frontend', 'Level + reward'],
  ['📊 Тижневий підсумок', 'Щонеділі 19:00 → XP, сесії, колесо, стрік за тиждень', 'TG weekly'],
]

const levelRows = [
  ['Seeker', '0+', 'Старт', 'Базовий вхід у систему'],
  ['Explorer', '120+', '+20 NEUROGEMS', 'Перший рівневий стрибок'],
  ['Thinker', '300+', '+30 NEUROGEMS', 'Стабільна робота з AI'],
  ['Builder', '600+', '+50 NEUROGEMS', 'Повний трекер і сильніший прогрес'],
  ['Strategist', '1000+', '+100 NEUROGEMS', 'Глибші сценарії розвитку'],
  ['Visionary+', '1500+', 'посилені бонуси', 'Подальша прогресія без дублюючої логіки'],
]

const streakMilestones = [
  ['3', 'Перший ритм сформовано', '+10 NEUROGEMS'],
  ['7', 'Тиждень без зупинки', '+30 NEUROGEMS'],
  ['14', 'Два тижні системи', '+60 NEUROGEMS'],
  ['30', 'Архітектор звичок', '+100 NEUROGEMS · +1 BITMIND'],
  ['100', 'Легендарний статус', '+300 NEUROGEMS · +3 BITMIND'],
]

const allPlans: Array<{ title: string; items: ChecklistItem[] }> = [
  {
    title: 'Notification flow',
    items: [
      { id: 'notif-1', title: 'Єдиний NotificationService', status: 'done', percent: 100, note: 'event → job → worker → delivery уже живе.' },
      { id: 'notif-2', title: 'Єдиний scheduler', status: 'done', percent: 100, note: 'cron-и зведені в один backend scheduler.' },
      { id: 'notif-3', title: 'Webhook / polling розведені', status: 'done', percent: 100, note: 'Продакшн не впирається в 409 conflict.' },
      { id: 'notif-4', title: 'link Telegram flow', status: 'partial', percent: 72, note: 'Архітектура готова, треба добити user-facing connect flow.' },
    ],
  },
  {
    title: 'Deep links Mini App',
    items: [
      { id: 'deep-1', title: 'startapp → route map', status: 'done', percent: 100, note: 'MiniAppLayout уже читає start_param.' },
      { id: 'deep-2', title: 'activated re-check', status: 'done', percent: 92, note: 'Foreground return уже не губить сценарій.' },
      { id: 'deep-3', title: 'AI context redirect', status: 'done', percent: 90, note: 'ai_morning / ai_evening вже автозапускають контекст.' },
      { id: 'deep-4', title: 'level_up deep link', status: 'done', percent: 78, note: 'Є callout-flow, не повний modal-flow.' },
    ],
  },
  {
    title: 'Shared auth / API',
    items: [
      { id: 'auth-1', title: 'verifyTelegramInitData shared helper', status: 'partial', percent: 58, note: 'Верифікація є, але не винесена в одну shared точку.' },
      { id: 'auth-2', title: 'getServerUser(req)', status: 'pending', percent: 0, note: 'Одна auth-функція для web + miniapp ще не заведена.' },
      { id: 'auth-3', title: 'shared apiFetch для Mini App', status: 'pending', percent: 0, note: 'TMA fetcher ще не централізований.' },
      { id: 'auth-4', title: 'optimistic updates', status: 'pending', percent: 0, note: 'Наступний UX-крок після shared auth.' },
    ],
  },
  {
    title: 'Gamification triggers',
    items: [
      { id: 'game-1', title: 'Єдиний reward/event flow', status: 'done', percent: 88, note: '/gamification/events уже живе через reward engine.' },
      { id: 'game-2', title: 'level up TG notify', status: 'done', percent: 92, note: 'Піднято на NotificationEvent.LEVEL_UP.' },
      { id: 'game-3', title: 'near level up TG notify', status: 'done', percent: 86, note: 'Реалізовано через окремий notification event.' },
      { id: 'game-4', title: 'streak milestones 3/7/14/30/100', status: 'done', percent: 90, note: 'Milestone trigger більше не підміняється streak risk.' },
      { id: 'game-5', title: 'anti-spam по templateKey', status: 'done', percent: 88, note: 'Дедуп і daily limit уже в одному місці.' },
      { id: 'game-6', title: 'streak broken cron 08:00', status: 'done', percent: 80, note: 'Додано в unified scheduler.' },
      { id: 'game-7', title: 'weekly summary payload', status: 'done', percent: 82, note: 'Cron тепер шле агрегований payload, не порожній event.' },
      { id: 'game-8', title: 'debug test endpoint', status: 'pending', percent: 0, note: 'Окремий ручний test route ще не доданий.' },
    ],
  },
]

function StatusBadge({ status, percent }: { status: ItemStatus; percent: number }) {
  const tone =
    status === 'done'
      ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
      : status === 'partial'
        ? 'border-amber-400/20 bg-amber-400/10 text-amber-200'
        : 'border-white/10 bg-white/5 text-[var(--text-muted)]'
  const label = status === 'done' ? 'готово' : status === 'partial' ? 'частково' : 'ще ні'
  return <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]', tone)}>{label} · {percent}%</span>
}

function ChecklistIcon({ status }: { status: ItemStatus }) {
  if (status === 'done') return <CheckCircle2 className="h-4 w-4 text-emerald-300" />
  if (status === 'partial') return <CircleDashed className="h-4 w-4 text-amber-300" />
  return <Circle className="h-4 w-4 text-[var(--text-muted)]" />
}

export default function TelegramPage() {
  const [activeTab, setActiveTab] = useState<TabId>('map')
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const overview = useMemo(() => {
    const flat = allPlans.flatMap(section => section.items)
    return {
      avg: Math.round(flat.reduce((sum, item) => sum + item.percent, 0) / flat.length),
      done: flat.filter(item => item.status === 'done').length,
      total: flat.length,
    }
  }, [])

  const tabContent = (() => {
    switch (activeTab) {
      case 'map':
        return (
          <div className="space-y-5">
            <GlassCard className="p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">Всі gamification події → що відбувається</p>
              <div className="mt-5 space-y-3">
                {eventRows.map(([title, text, badge]) => (
                  <div key={title} className="grid gap-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-4 md:grid-cols-[280px_1fr_auto] md:items-center">
                    <p className="text-xl font-semibold text-[var(--text-primary)]">{title}</p>
                    <p className="text-sm leading-7 text-[var(--text-secondary)]">{text}</p>
                    <span className="inline-flex rounded-full bg-[rgba(var(--accent-rgb),0.12)] px-3 py-1 text-sm font-semibold text-[var(--accent)]">{badge}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )
      case 'engine':
        return (
          <div className="grid gap-5 xl:grid-cols-3">
            {[
              ['⚡', 'Дія юзера', ['рефлексія', 'AI повідомлення', 'практика', 'трекер']],
              ['🎮', 'Gamification engine', ['rewardEngine', 'applyReward', 'onXpGained', 'onStreakUpdate']],
              ['📤', 'Outputs', ['DB update', 'in-app feedback', 'TG notify', 'summary revalidate']],
            ].map(([icon, title, points]) => (
              <GlassCard key={String(title)} className="p-6">
                <div className="space-y-4">
                  <div className="text-4xl">{icon}</div>
                  <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{title}</h2>
                  <ul className="space-y-2 text-sm leading-7 text-[var(--text-secondary)]">
                    {(points as string[]).map(point => <li key={point}>· {point}</li>)}
                  </ul>
                </div>
              </GlassCard>
            ))}
          </div>
        )
      case 'levels':
        return (
          <GlassCard className="overflow-hidden p-0">
            <div className="grid grid-cols-[1.1fr_1fr_1fr_1.4fr] border-b border-white/10 px-5 py-4 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              <div>Рівень</div>
              <div>XP</div>
              <div>Нагорода</div>
              <div>Опис</div>
            </div>
            {levelRows.map(([title, xp, reward, desc]) => (
              <div key={title} className="grid grid-cols-[1.1fr_1fr_1fr_1.4fr] border-b border-white/10 px-5 py-5 last:border-b-0">
                <div className="text-2xl font-semibold text-[var(--text-primary)]">{title}</div>
                <div className="text-xl text-[var(--text-secondary)]">{xp}</div>
                <div className="text-xl text-[var(--text-primary)]">{reward}</div>
                <div className="text-base text-[var(--text-secondary)]">{desc}</div>
              </div>
            ))}
          </GlassCard>
        )
      case 'streak':
        return (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {streakMilestones.map(([days, title, reward]) => (
              <GlassCard key={days} className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">Стрік {days}</p>
                <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">{title}</h2>
                <p className="mt-3 text-base leading-8 text-[var(--text-secondary)]">{reward}</p>
              </GlassCard>
            ))}
          </div>
        )
      case 'code':
        return (
          <div className="grid gap-5 xl:grid-cols-2">
            <GlassCard className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <Code2 className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Що вже реалізовано</h2>
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-[20px] border border-white/10 bg-[#0b0f1b] p-4 text-sm leading-7 text-[#cbd6f4]">
{`POST /gamification/events
  -> rewardEngine
  -> applyReward()
  -> onXpGained()
  -> onStreakUpdate()
  -> NotificationService.emit()

NotificationService
  -> templateKey dedup
  -> daily limit
  -> web_app CTA -> Mini App`}
              </pre>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <Target className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Що лишилось</h2>
              </div>
              <pre className="overflow-x-auto whitespace-pre-wrap rounded-[20px] border border-white/10 bg-[#0b0f1b] p-4 text-sm leading-7 text-[#cbd6f4]">
{`next:
1. getServerUser(req)
2. verifyTelegramInitData() shared
3. Mini App apiFetch()
4. debug /gamification/test
5. client handleGameEvents()`}
              </pre>
            </GlassCard>
          </div>
        )
      case 'spam':
        return (
          <div className="grid gap-5 xl:grid-cols-3">
            <GlassCard className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Дедуп</h2>
              </div>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">TG повідомлення тепер звіряються по <code>templateKey</code>: <code>streak_7</code>, <code>near_level_Builder</code>, <code>level_up_4</code>. Це блокує дубль при рестартах і повторних job-ах.</p>
            </GlassCard>
            <GlassCard className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <Zap className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Ліміт</h2>
              </div>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">Некритичні TG повідомлення мають денний ліміт <strong>2</strong>. Критичні <code>level_up_*</code> і <code>streak_broken</code> проходять завжди.</p>
            </GlassCard>
            <GlassCard className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <Flame className="h-5 w-5 text-[var(--accent)]" />
                <h2 className="text-2xl font-semibold text-[var(--text-primary)]">Cooldown</h2>
              </div>
              <p className="text-sm leading-7 text-[var(--text-secondary)]"><code>weekly_summary</code> має тижневий cooldown, а near-level повідомлення не повторюються по тому самому наступному рівню.</p>
            </GlassCard>
          </div>
        )
      case 'checklist':
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <GlassCard className="p-5">
                <p className="text-sm uppercase tracking-[0.16em] text-[var(--text-muted)]">Загальна готовність</p>
                <p className="mt-3 text-4xl font-semibold text-[var(--text-primary)]">{overview.avg}%</p>
              </GlassCard>
              <GlassCard className="p-5">
                <p className="text-sm uppercase tracking-[0.16em] text-[var(--text-muted)]">Готово</p>
                <p className="mt-3 text-4xl font-semibold text-[var(--text-primary)]">{overview.done}/{overview.total}</p>
              </GlassCard>
              <GlassCard className="p-5">
                <p className="text-sm uppercase tracking-[0.16em] text-[var(--text-muted)]">Фокус зараз</p>
                <p className="mt-3 text-xl font-semibold text-[var(--text-primary)]">shared auth + debug routes</p>
              </GlassCard>
            </div>

            {allPlans.map((plan) => {
              const avg = Math.round(plan.items.reduce((sum, item) => sum + item.percent, 0) / plan.items.length)
              return (
                <GlassCard key={plan.title} className="p-6">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{plan.title}</h2>
                    <StatusBadge status={avg === 100 ? 'done' : avg > 0 ? 'partial' : 'pending'} percent={avg} />
                  </div>
                  <div className="space-y-3">
                    {plan.items.map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setChecked(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                        className="flex w-full items-start gap-4 rounded-[20px] border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:bg-white/[0.05]"
                      >
                        <div className="mt-0.5">{checked[item.id] ? <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" /> : <ChecklistIcon status={item.status} />}</div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <p className="font-semibold text-[var(--text-primary)]">{item.title}</p>
                            <StatusBadge status={item.status} percent={item.percent} />
                          </div>
                          <p className="text-sm leading-7 text-[var(--text-secondary)]">{item.note}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </GlassCard>
              )
            })}
          </div>
        )
    }
  })()

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex flex-wrap gap-3">
          {tabs.map(tab => (
            <Button
              key={tab.id}
              type="button"
              variant={activeTab === tab.id ? 'solid' : 'glass'}
              onClick={() => setActiveTab(tab.id)}
              className="rounded-[22px]"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.08)] p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Sparkles className="h-5 w-5 text-[var(--accent)]" />
          <p className="text-lg font-semibold text-[var(--text-primary)]">Gamification → TG повідомлення</p>
          <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-[var(--text-secondary)]">{overview.avg}% загальної готовності</span>
        </div>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          Один виклик у backend має запускати весь ланцюг: reward engine, streak update, level check, TG notification і frontend feedback. Логіка не повинна дублюватися між route-ами.
        </p>
      </GlassCard>

      {tabContent}
    </div>
  )
}
