import { useAppSelector } from '@/app/hooks'
import { useGetAnalyticsLiveQuery } from '@/features/analytics/services/analytics.api'
import { Button, Select } from '@/ui'
import { Activity, RefreshCw } from 'lucide-react'
import { useMemo, useState } from 'react'

export default function LiveAnalytics() {
  const [limit, setLimit] = useState<'10' | '20' | '50'>('20')
  const isAuthenticated = useAppSelector(state => state.auth.status === 'authenticated')
  const { data, isLoading, isFetching, refetch } = useGetAnalyticsLiveQuery(
    { limit: Number(limit) },
    { pollingInterval: 30_000, refetchOnMountOrArgChange: true, skip: !isAuthenticated },
  )

  const options = useMemo(
    () => [
      { value: '10', label: '10 подій' },
      { value: '20', label: '20 подій' },
      { value: '50', label: '50 подій' },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Live активність</h2>
          <p className="text-sm text-white/55">Останні дії користувачів з Event layer.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={limit}
            onChange={event => setLimit(event.target.value as typeof limit)}
            options={options}
            className="min-w-[160px]"
          />
          <Button onClick={refetch} disabled={isFetching}>
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-emerald-400">
        <Activity size={16} />
        <span>{isFetching ? 'Оновлюється...' : 'Автооновлення кожні 30с'}</span>
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-white/60">
          Завантаження...
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1.2fr] gap-4 border-b border-white/10 px-5 py-3 text-xs uppercase tracking-[0.18em] text-white/35">
            <span>User</span>
            <span>Event</span>
            <span>State</span>
            <span>Time</span>
          </div>
          {(data?.events ?? []).map(event => (
            <div
              key={event.id}
              className="grid grid-cols-[1.4fr_1fr_1fr_1.2fr] gap-4 border-b border-white/5 px-5 py-4 text-sm text-white/75 last:border-b-0"
            >
              <span>{event.user.label}</span>
              <span className="font-medium text-white">{event.type}</span>
              <span>{event.state ?? '—'}</span>
              <span>{new Date(event.createdAt).toLocaleString('uk-UA')}</span>
            </div>
          ))}
          {!data?.events?.length && (
            <div className="px-5 py-6 text-sm text-white/50">Подій поки немає.</div>
          )}
        </div>
      )}
    </div>
  )
}
