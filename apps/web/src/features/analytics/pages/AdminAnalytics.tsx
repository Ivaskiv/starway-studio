import { useState } from 'react'
import { RefreshCw, TrendingDown, TrendingUp, Users } from 'lucide-react'

import { useAppSelector } from '@/app/hooks'
import {
  useGetAnalyticsFunnelQuery,
  useGetAnalyticsInsightsQuery,
  useGetAnalyticsLiveQuery,
  useGetAnalyticsOverviewQuery,
  useGetAnalyticsQuestionsQuery,
  useGetAnalyticsRetentionQuery,
} from '@/features/analytics/services/analytics.api'
import { Button, GlassCard, InfoHint } from '@/ui'

type TimeRange = '7d' | '30d' | '90d'

const EYEBROW_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]'
const BODY_CLASS = 'text-sm leading-6 text-[var(--text-muted)]'

const STAGE_LABELS: Record<string, string> = {
  start: 'Старт',
  lead_magnet: 'Практикум',
  wheel: 'Колесо',
  trial: 'Тріал',
  engagement: 'Залучення',
  purchase: 'Оплата',
}

const INTENT_LABELS: Record<string, string> = {
  topIntents: 'Наміри',
  topCategories: 'Категорії',
  topProblems: 'Проблеми',
}

const WIDTH_CLASS_BY_PROGRESS = [
  'w-0',
  'w-[5%]',
  'w-[10%]',
  'w-[15%]',
  'w-[20%]',
  'w-[25%]',
  'w-[30%]',
  'w-[35%]',
  'w-[40%]',
  'w-[45%]',
  'w-[50%]',
  'w-[55%]',
  'w-[60%]',
  'w-[65%]',
  'w-[70%]',
  'w-[75%]',
  'w-[80%]',
  'w-[85%]',
  'w-[90%]',
  'w-[95%]',
  'w-full',
] as const

function getProgressWidthClass(percent: number) {
  const normalized = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0
  return WIDTH_CLASS_BY_PROGRESS[Math.round(normalized / 5)]
}

export default function AdminAnalytics() {
  const isAuthenticated = useAppSelector(state => state.auth.status === 'authenticated')
  const [period, setPeriod] = useState<TimeRange>('30d')

  const overview = useGetAnalyticsOverviewQuery({ period }, { skip: !isAuthenticated })
  const funnel = useGetAnalyticsFunnelQuery({ period }, { skip: !isAuthenticated })
  const questions = useGetAnalyticsQuestionsQuery({ period, limit: 8 }, { skip: !isAuthenticated })
  const retention = useGetAnalyticsRetentionQuery({ period }, { skip: !isAuthenticated })
  const insights = useGetAnalyticsInsightsQuery({ period, limit: 6 }, { skip: !isAuthenticated })
  const live = useGetAnalyticsLiveQuery({ limit: 12 }, { skip: !isAuthenticated, pollingInterval: 30_000 })

  const isLoading =
    overview.isLoading
    || funnel.isLoading
    || questions.isLoading
    || retention.isLoading
    || insights.isLoading

  const refetchAll = () => {
    void overview.refetch()
    void funnel.refetch()
    void questions.refetch()
    void retention.refetch()
    void insights.refetch()
    void live.refetch()
  }

  return (
    <div className="space-y-6 p-6">
      <GlassCard className="overflow-hidden p-0">
        <div className="bg-[linear-gradient(135deg,rgba(var(--accent-rgb),0.18),rgba(58,79,130,0.18)_45%,rgba(255,255,255,0.03))] px-6 py-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-4xl">
              <p className={EYEBROW_CLASS}>Бізнес-режим</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-[var(--text-primary)] md:text-5xl">
                Аналітика Starway
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-secondary)] md:text-lg">
                Конверсія, retention, питання, живі події і сигнали по воронці в одному ритмічному просторі без сухої адмінської подачі.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-2xl border border-[var(--border)] bg-[rgba(255,255,255,0.04)] p-1">
                {(['7d', '30d', '90d'] as TimeRange[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPeriod(item)}
                    className={[
                      'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                      period === item
                        ? 'bg-[rgba(var(--accent-rgb),0.18)] text-[var(--text-primary)]'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                    ].join(' ')}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <Button
                onClick={refetchAll}
                className="border border-[var(--border)] bg-[rgba(255,255,255,0.04)] text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.07)]"
              >
                <RefreshCw
                  size={16}
                  className={overview.isFetching || funnel.isFetching || questions.isFetching || retention.isFetching || insights.isFetching ? 'animate-spin' : ''}
                />
              </Button>
            </div>
          </div>
        </div>
      </GlassCard>

      {isLoading ? (
        <GlassCard className="p-6">
          <p className={BODY_CLASS}>Завантаження аналітики...</p>
        </GlassCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <AnalyticsMetricCard
              label="Всього користувачів"
              value={overview.data?.totalUsers ?? 0}
              accent="У базі"
              tone="violet"
            />
            <AnalyticsMetricCard
              label="Активних"
              value={overview.data?.activeUsers ?? 0}
              accent="За період"
              tone="cyan"
            />
            <AnalyticsMetricCard
              label="Нових"
              value={overview.data?.newUsers ?? 0}
              accent="Нові входи"
              tone="green"
            />
            <AnalyticsMetricCard
              label="Дій на юзера"
              value={overview.data?.avgActionsPerUser ?? 0}
              accent="Середній темп"
              tone="orange"
            />
            <AnalyticsMetricCard
              label="Юзерів у ритмі"
              value={overview.data?.streakUsers ?? 0}
              accent="Є послідовність"
              tone="blue"
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.85fr)]">
            <GlassCard className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className={EYEBROW_CLASS}>Воронка</p>
                    <InfoHint
                      label="Воронка"
                      description="Показує рух між ключовими етапами: від старту до оплати."
                      instruction="Спочатку дивись на просідання між сусідніми кроками, а вже потім змінюй тексти чи трафік."
                    />
                  </div>
                  <h2 className="mt-2 text-[1.65rem] font-semibold leading-tight text-[var(--text-primary)]">
                    Конверсія по етапах
                  </h2>
                  <p className={`mt-2 ${BODY_CLASS}`}>
                    Кожен крок показує скільки людей дійшло до етапу і який там відсоток проходження.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {(funnel.data?.stages ?? []).map((stage) => (
                  <div key={stage.stage} className="rounded-[22px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-[var(--text-primary)]">
                          {STAGE_LABELS[stage.stage] ?? stage.stage}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          {stage.users} юзерів на етапі
                        </p>
                      </div>
                      <span className="rounded-full border border-[rgba(var(--accent-rgb),0.25)] bg-[rgba(var(--accent-rgb),0.1)] px-3 py-1 text-sm font-semibold text-[var(--text-primary)]">
                        {stage.conversionRate}%
                      </span>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                      <div
                        className={`h-full rounded-full bg-[linear-gradient(90deg,#6376ff,#22d3ee)] ${getProgressWidthClass(Math.max(4, Math.min(100, stage.conversionRate)))}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <AnalyticsInfoCard label="Старт → Практикум" value={`${funnel.data?.conversions.startToLeadMagnet ?? 0}%`} />
                <AnalyticsInfoCard label="Практикум → Колесо" value={`${funnel.data?.conversions.leadMagnetToWheel ?? 0}%`} />
                <AnalyticsInfoCard label="Колесо → Тріал" value={`${funnel.data?.conversions.wheelToTrial ?? 0}%`} />
                <AnalyticsInfoCard label="Тріал → Оплата" value={`${funnel.data?.conversions.trialToPurchase ?? 0}%`} />
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className={EYEBROW_CLASS}>Просідання</p>
                    <InfoHint
                      label="Просідання"
                      description="Найболючіші місця у воронці, де юзери найчастіше зупиняються."
                      instruction="Починай із найбільшого drop-off: там найшвидше видно ефект від зміни тексту, логіки або нагадування."
                    />
                  </div>
                  <h2 className="mt-2 text-[1.65rem] font-semibold leading-tight text-[var(--text-primary)]">
                    Де губиться рух
                  </h2>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {(funnel.data?.dropOffs ?? []).slice(0, 5).map((item) => (
                  <div key={`${item.from}-${item.to}`} className="rounded-[22px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-[var(--text-primary)]">
                          {STAGE_LABELS[item.from] ?? item.from} → {STAGE_LABELS[item.to] ?? item.to}
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          Втрачено {item.lostUsers} юзерів
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(248,113,113,0.24)] bg-[rgba(248,113,113,0.08)] px-3 py-1 text-sm font-semibold text-[rgb(252,165,165)]">
                        <TrendingDown className="h-4 w-4" />
                        {item.dropOffRate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <GlassCard className="p-5">
              <div className="flex items-center gap-2">
                <p className={EYEBROW_CLASS}>Retention</p>
                <InfoHint
                  label="Retention"
                  description="Показує, скільки людей повертаються після першого знайомства із системою."
                  instruction="Особливо слідкуй за Day 1 і Day 7: саме вони показують, чи втримує система перший інтерес і ритм."
                />
              </div>
              <h2 className="mt-2 text-[1.65rem] font-semibold leading-tight text-[var(--text-primary)]">Повернення</h2>
              <div className="mt-5 grid gap-3">
                <AnalyticsInfoCard label="Day 1" value={`${retention.data?.day1 ?? 0}%`} />
                <AnalyticsInfoCard label="Day 3" value={`${retention.data?.day3 ?? 0}%`} />
                <AnalyticsInfoCard label="Day 7" value={`${retention.data?.day7 ?? 0}%`} />
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center gap-2">
                <p className={EYEBROW_CLASS}>Питання юзерів</p>
                <InfoHint
                  label="Питання юзерів"
                  description="Живі формулювання, які люди реально ставлять у продукті."
                  instruction="Цей блок корисний для контенту, реклами і воронки: тут видно, як саме думає користувач, а не як ми про нього говоримо."
                />
              </div>
              <h2 className="mt-2 text-[1.65rem] font-semibold leading-tight text-[var(--text-primary)]">Що питають найчастіше</h2>
              <div className="mt-5 space-y-3">
                {(questions.data?.questions ?? []).map((item) => (
                  <div key={`${item.text}-${item.detectedIntent}`} className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
                    <p className="text-sm leading-7 text-[var(--text-primary)]">{item.text}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      {item.detectedIntent} · {item.category} · {item.productContext} · {item.count}
                    </p>
                  </div>
                ))}
                {!questions.data?.questions?.length && (
                  <p className={BODY_CLASS}>Питань поки немає.</p>
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex items-center gap-2">
                <p className={EYEBROW_CLASS}>Інсайти</p>
                <InfoHint
                  label="Інсайти"
                  description="Підсумовані частотні патерни з намірів, категорій і проблем."
                  instruction="Це швидкий шар для пріоритезації: не треба перечитувати всі події, щоб побачити домінантні теми."
                />
              </div>
              <h2 className="mt-2 text-[1.65rem] font-semibold leading-tight text-[var(--text-primary)]">Про що говорить тиждень</h2>
              <div className="mt-5 space-y-4">
                <InsightsBlock title={INTENT_LABELS.topIntents} items={insights.data?.topIntents ?? []} />
                <InsightsBlock title={INTENT_LABELS.topCategories} items={insights.data?.topCategories ?? []} />
                <InsightsBlock title={INTENT_LABELS.topProblems} items={insights.data?.topProblems ?? []} />
              </div>
            </GlassCard>
          </div>

          <GlassCard className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className={EYEBROW_CLASS}>Живі події</p>
                  <InfoHint
                    label="Живі події"
                    description="Останні події в реальному часі: хто зайшов, що зробив і звідки прийшов."
                    instruction="Використовуй цей потік як оперативний екран: він допомагає зрозуміти, чи працює кампанія, повідомлення або новий сценарій прямо зараз."
                  />
                </div>
                <h2 className="mt-2 text-[1.65rem] font-semibold leading-tight text-[var(--text-primary)]">Пульс системи</h2>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(45,212,191,0.24)] bg-[rgba(45,212,191,0.08)] px-3 py-1 text-sm font-semibold text-[rgb(94,234,212)]">
                <TrendingUp className="h-4 w-4" />
                Оновлюється
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {(live.data?.events ?? []).map((event) => (
                <div key={event.id} className="rounded-[22px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[rgba(var(--accent-rgb),0.08)] text-[rgb(var(--accent-soft-rgb))]">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{event.user.label}</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">
                          {event.type} · {event.source} · {event.state ?? '—'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(event.createdAt).toLocaleString('uk-UA')}
                    </span>
                  </div>
                </div>
              ))}
              {!live.data?.events?.length && (
                <p className={BODY_CLASS}>Подій поки немає.</p>
              )}
            </div>
          </GlassCard>
        </>
      )}
    </div>
  )
}

function AnalyticsMetricCard({
  label,
  value,
  accent,
  tone,
}: {
  label: string
  value: string | number
  accent: string
  tone: 'violet' | 'cyan' | 'green' | 'orange' | 'blue'
}) {
  const borderTone = {
    violet: 'border-t-[rgba(192,132,252,0.9)]',
    cyan: 'border-t-[rgba(34,211,238,0.9)]',
    green: 'border-t-[rgba(45,212,191,0.9)]',
    orange: 'border-t-[rgba(251,146,60,0.9)]',
    blue: 'border-t-[rgba(96,165,250,0.9)]',
  }[tone]

  return (
    <GlassCard className={`border-t-2 p-5 ${borderTone}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-4 text-4xl font-black tracking-tight text-[var(--text-primary)]">{value}</p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">{accent}</p>
    </GlassCard>
  )
}

function AnalyticsInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{value}</p>
    </div>
  )
}

function InsightsBlock({
  title,
  items,
}: {
  title: string
  items: Array<{ label: string; count: number }>
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">{title}</p>
      <div className="space-y-2">
        {items.length ? items.map((item) => (
          <div
            key={`${title}-${item.label}`}
            className="flex items-center justify-between rounded-[18px] border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
          >
            <span className="text-sm text-[var(--text-primary)]">{item.label}</span>
            <span className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
              {item.count}
            </span>
          </div>
        )) : (
          <p className={BODY_CLASS}>Даних поки немає.</p>
        )}
      </div>
    </div>
  )
}
