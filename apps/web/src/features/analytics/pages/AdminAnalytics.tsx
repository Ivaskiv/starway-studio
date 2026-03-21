import { useAppSelector } from '@/app/hooks'
import {
  useGetAnalyticsFunnelQuery,
  useGetAnalyticsInsightsQuery,
  useGetAnalyticsLiveQuery,
  useGetAnalyticsOverviewQuery,
  useGetAnalyticsQuestionsQuery,
  useGetAnalyticsRetentionQuery,
} from '@/features/analytics/services/analytics.api'
import { Button } from '@/ui'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

type TimeRange = '7d' | '30d' | '90d'

const STAGE_LABELS: Record<string, string> = {
  start: 'Start',
  lead_magnet: 'Lead magnet',
  wheel: 'Wheel',
  trial: 'Trial',
  engagement: 'Engagement',
  purchase: 'Purchase',
}

export default function Analytics() {
  const isAuthenticated = useAppSelector(state => state.auth.status === 'authenticated')
  const [period, setPeriod] = useState<TimeRange>('30d')

  const overview = useGetAnalyticsOverviewQuery({ period }, { skip: !isAuthenticated })
  const funnel = useGetAnalyticsFunnelQuery({ period }, { skip: !isAuthenticated })
  const questions = useGetAnalyticsQuestionsQuery({ period, limit: 8 }, { skip: !isAuthenticated })
  const retention = useGetAnalyticsRetentionQuery({ period }, { skip: !isAuthenticated })
  const insights = useGetAnalyticsInsightsQuery({ period, limit: 6 }, { skip: !isAuthenticated })
  const live = useGetAnalyticsLiveQuery({ limit: 12 }, { skip: !isAuthenticated, pollingInterval: 30_000 })

  const isLoading = overview.isLoading || funnel.isLoading || questions.isLoading || retention.isLoading || insights.isLoading

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Analytics</h1>
          <p className="mt-2 text-sm text-white/55">Event-backed overview, funnel, questions and live activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
            {(['7d', '30d', '90d'] as TimeRange[]).map(item => (
              <button
                key={item}
                onClick={() => setPeriod(item)}
                className={`rounded-lg px-4 py-2 text-sm transition ${
                  period === item ? 'bg-white text-black' : 'text-white/60'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <Button onClick={() => { void overview.refetch(); void funnel.refetch(); void questions.refetch(); void live.refetch() }}>
            <RefreshCw size={16} className={overview.isFetching || funnel.isFetching || questions.isFetching ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-white/60">
          Завантаження аналітики...
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <MetricCard label="Total users" value={overview.data?.totalUsers ?? 0} />
            <MetricCard label="Active users" value={overview.data?.activeUsers ?? 0} />
            <MetricCard label="New users" value={overview.data?.newUsers ?? 0} />
            <MetricCard label="Actions / user" value={overview.data?.avgActionsPerUser ?? 0} />
            <MetricCard label="Streak users" value={overview.data?.streakUsers ?? 0} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold text-white">Funnel</h2>
              <div className="mt-5 space-y-4">
                {(funnel.data?.stages ?? []).map(stage => (
                  <div key={stage.stage} className="rounded-xl border border-white/10 bg-black/10 p-4">
                    <div className="flex items-center justify-between text-sm text-white/70">
                      <span>{STAGE_LABELS[stage.stage] ?? stage.stage}</span>
                      <span>{stage.users} users · {stage.conversionRate}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-2">
                <InfoCard label="Start → Lead magnet" value={`${funnel.data?.conversions.startToLeadMagnet ?? 0}%`} />
                <InfoCard label="Lead magnet → Wheel" value={`${funnel.data?.conversions.leadMagnetToWheel ?? 0}%`} />
                <InfoCard label="Wheel → Trial" value={`${funnel.data?.conversions.wheelToTrial ?? 0}%`} />
                <InfoCard label="Trial → Purchase" value={`${funnel.data?.conversions.trialToPurchase ?? 0}%`} />
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold text-white">Drop-offs</h2>
              <div className="mt-5 space-y-3">
                {(funnel.data?.dropOffs ?? []).slice(0, 5).map(item => (
                  <div key={`${item.from}-${item.to}`} className="rounded-xl border border-white/10 bg-black/10 p-4">
                    <div className="text-sm font-medium text-white">
                      {STAGE_LABELS[item.from] ?? item.from} → {STAGE_LABELS[item.to] ?? item.to}
                    </div>
                    <div className="mt-1 text-sm text-white/60">
                      Drop-off: {item.dropOffRate}% · Lost: {item.lostUsers}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold text-white">Retention</h2>
              <div className="mt-5 grid gap-3">
                <InfoCard label="Day 1" value={`${retention.data?.day1 ?? 0}%`} />
                <InfoCard label="Day 3" value={`${retention.data?.day3 ?? 0}%`} />
                <InfoCard label="Day 7" value={`${retention.data?.day7 ?? 0}%`} />
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold text-white">Top questions</h2>
              <div className="mt-5 space-y-3">
                {(questions.data?.questions ?? []).map(item => (
                  <div key={`${item.text}-${item.detectedIntent}`} className="rounded-xl border border-white/10 bg-black/10 p-4">
                    <div className="text-sm font-medium text-white">{item.text}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.16em] text-white/45">
                      {item.detectedIntent} · {item.category} · {item.productContext} · {item.count}
                    </div>
                  </div>
                ))}
                {!questions.data?.questions?.length && (
                  <div className="text-sm text-white/50">Питань поки немає.</div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold text-white">AI insights</h2>
              <div className="mt-5 space-y-4">
                <InsightList title="Top intents" items={insights.data?.topIntents ?? []} />
                <InsightList title="Top categories" items={insights.data?.topCategories ?? []} />
                <InsightList title="Top problems" items={insights.data?.topProblems ?? []} />
              </div>
            </section>
          </div>

          <div className="grid gap-6 lg:grid-cols-1">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-xl font-semibold text-white">Live</h2>
              <div className="mt-5 space-y-3">
                {(live.data?.events ?? []).map(event => (
                  <div key={event.id} className="rounded-xl border border-white/10 bg-black/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-white">{event.user.label}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">
                          {event.type} · {event.source} · {event.state ?? '—'}
                        </div>
                      </div>
                      <div className="text-xs text-white/45">
                        {new Date(event.createdAt).toLocaleString('uk-UA')}
                      </div>
                    </div>
                  </div>
                ))}
                {!live.data?.events?.length && (
                  <div className="text-sm text-white/50">Подій поки немає.</div>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-xs uppercase tracking-[0.16em] text-white/40">{label}</div>
      <div className="mt-2 text-3xl font-bold text-white">{value}</div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-white/40">{label}</div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  )
}

function InsightList({ title, items }: { title: string; items: Array<{ label: string; count: number }> }) {
  return (
    <div>
      <div className="mb-3 text-sm font-medium text-white/75">{title}</div>
      <div className="space-y-2">
        {items.length ? items.map(item => (
          <div key={`${title}-${item.label}`} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/10 px-3 py-2">
            <span className="text-sm text-white">{item.label}</span>
            <span className="text-xs uppercase tracking-[0.12em] text-white/45">{item.count}</span>
          </div>
        )) : (
          <div className="text-sm text-white/50">Даних поки немає.</div>
        )}
      </div>
    </div>
  )
}
