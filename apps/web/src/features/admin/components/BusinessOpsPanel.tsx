import { useMemo, useState } from 'react'

import { useGetAnalyticsLiveQuery, useGetAnalyticsOverviewQuery } from '@/features/analytics/services/analytics.api'
import { InfoHint } from '@/ui'
import { useGetOwnershipQuery } from '../services/ownership.api'
import {
  useActivateQuestionSetMutation,
  useCreateQuestionSetMutation,
  useDeleteQuestionSetMutation,
  useGetQuestionSetsQuery,
} from '../services/questionSets.api'

const EYEBROW_CLASS = 'text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]'
const BODY_CLASS = 'text-sm leading-6 text-[var(--text-muted)]'

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getJsonArrayLength(value: unknown) {
  return Array.isArray(value) ? value.length : 0
}

export default function BusinessOpsPanel() {
  const [draftName, setDraftName] = useState('')
  const { data: overview } = useGetAnalyticsOverviewQuery({ period: '30d' })
  const { data: live } = useGetAnalyticsLiveQuery({ limit: 12 })
  const { data: ownership } = useGetOwnershipQuery()
  const { data: questionSets = [], isLoading: questionSetsLoading } = useGetQuestionSetsQuery()
  const [createQuestionSet, { isLoading: creatingSet }] = useCreateQuestionSetMutation()
  const [activateQuestionSet, { isLoading: activatingSet }] = useActivateQuestionSetMutation()
  const [deleteQuestionSet, { isLoading: deletingSet }] = useDeleteQuestionSetMutation()

  const activeSet = questionSets.find((set) => set.isActive) ?? null

  const handleCreateSet = async () => {
    const name = draftName.trim()
    if (!name) return
    await createQuestionSet({ name, morning: [], evening: [] }).unwrap()
    setDraftName('')
  }

  return (
    <div className="grid gap-6">
      <div className="dashboard-liquid-card overflow-hidden">
        <div className="dashboard-liquid-edge--top p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className={EYEBROW_CLASS}>Система</p>
              <InfoHint
                label="Система"
                description="Один живий системний блок замість окремого дубльованого адмін-додатка."
                instruction="Тут зібрані користувачі, ownership, активні question sets і остання жива активність системи."
              />
            </div>
            <h2 className="mt-2 text-[1.65rem] font-semibold leading-tight text-[var(--text-primary)]">
              Контрольний центр Starway
            </h2>
            <p className={`mt-2 ${BODY_CLASS}`}>
              Працює на тих самих основних endpoint-ах і ролях, що вже є в додатку, без окремого дубльованого фронтенду.
            </p>
          </div>
        </div>

        <div className="mt-5 overflow-hidden rounded-[22px] border border-[rgba(var(--accent-rgb),0.08)] bg-[rgba(255,255,255,0.02)]">
          <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Юзерів у базі" value={overview?.totalUsers ?? 0} />
            <MetricCard label="Активних за 30 днів" value={overview?.activeUsers ?? 0} />
            <MetricCard label="Question sets" value={questionSets.length} />
            <MetricCard label="Активний сет" value={activeSet?.name ?? '—'} compact />
          </div>
        </div>
        </div>
      </div>

      <div className="dashboard-responsive-split--wide">
        <div className="dashboard-liquid-card p-5">
          <div className="flex items-center gap-2">
            <p className={EYEBROW_CLASS}>Системний зріз</p>
            <InfoHint
              label="Системний зріз"
              description="Короткий операційний знімок без дублювання живої таблиці користувачів."
              instruction="Список користувачів тепер живе тільки у вкладці “Користувачі”. Тут залишено лише агреговані дані для системного контролю."
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <InfoRow label="Юзерів у базі" value={String(overview?.totalUsers ?? 0)} />
            <InfoRow label="Активних за 30 днів" value={String(overview?.activeUsers ?? 0)} />
            <InfoRow label="Подій у live feed" value={String(live?.events?.length ?? 0)} />
            <InfoRow label="Жива coach-таблиця" value="Лише у вкладці “Користувачі”" />
          </div>
        </div>

        <div className="dashboard-liquid-card p-5">
          <div className="flex items-center gap-2">
            <p className={EYEBROW_CLASS}>Ownership</p>
            <InfoHint
              label="Ownership"
              description="Зріз поточного ownership по експерту й mentor-конфігураціях."
              instruction="Допомагає швидко побачити, хто зараз є системним owner і скільки конфігурацій уже прив’язано."
            />
          </div>
          <div className="mt-4 space-y-3">
            <InfoRow label="Поточний експерт" value={ownership?.expert?.user?.email ?? '—'} />
            <InfoRow label="Роль експерта" value={ownership?.expert?.user?.role ?? '—'} />
            <InfoRow label="Продуктів" value={String(ownership?.expert?.products?.length ?? 0)} />
            <InfoRow label="Mentor configs" value={String(ownership?.mentorConfigs?.length ?? 0)} />
          </div>
        </div>
      </div>

      <div className="dashboard-responsive-split--wide">
        <div className="dashboard-liquid-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <p className={EYEBROW_CLASS}>Question sets</p>
              <InfoHint
                label="Question sets"
                description="Набори ранкових і вечірніх питань, які система може перемикати централізовано."
                instruction="Створи новий порожній сет, а детальне наповнення й редагування можна робити окремим кроком."
              />
            </div>
            {activeSet ? (
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                Активний: {activeSet.name}
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Назва нового question set"
              className="min-h-[44px] flex-1 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[rgba(var(--accent-rgb),0.22)]"
            />
            <button
              type="button"
              onClick={() => void handleCreateSet()}
              disabled={creatingSet || !draftName.trim()}
              className="btn-liquid-dashboard btn-liquid-dashboard--primary min-h-[44px] justify-center px-4 py-3 disabled:opacity-60"
            >
              {creatingSet ? 'Створюю…' : 'Створити'}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {questionSetsLoading ? (
              <p className={BODY_CLASS}>Завантаження question sets…</p>
            ) : questionSets.length ? (
              questionSets.map((set) => (
                <div
                  key={set.id}
                  className="rounded-[18px] border-t border-[rgba(255,255,255,0.05)] px-1 py-4 first:border-t-0"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-[var(--text-primary)]">{set.name}</p>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">
                        Ранок: {getJsonArrayLength(set.morning)} · Вечір: {getJsonArrayLength(set.evening)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void activateQuestionSet(set.id)}
                        disabled={set.isActive || activatingSet}
                        className="btn-liquid-dashboard btn-liquid-dashboard--ice px-4 py-2 text-xs disabled:opacity-60"
                      >
                        {set.isActive ? 'Активний' : 'Активувати'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteQuestionSet(set.id)}
                        disabled={deletingSet}
                        className="rounded-2xl border border-[rgba(248,113,113,0.24)] bg-[rgba(248,113,113,0.08)] px-4 py-2 text-xs font-medium text-[rgb(252,165,165)] transition-colors hover:bg-[rgba(248,113,113,0.12)] disabled:opacity-60"
                      >
                        Видалити
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className={BODY_CLASS}>Ще немає question sets.</p>
            )}
          </div>
        </div>

        <div className="dashboard-liquid-card p-5">
          <div className="flex items-center gap-2">
            <p className={EYEBROW_CLASS}>Activity log</p>
            <InfoHint
              label="Activity log"
              description="Жива стрічка системних подій на основі наявного Event-потоку."
              instruction="Це вже не окрема тимчасова таблиця, а ваш реальний потік подій із системи."
            />
          </div>
          <div className="mt-4 space-y-3">
            {(live?.events ?? []).length ? (
              live!.events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-[18px] border-t border-[rgba(255,255,255,0.05)] px-1 py-3 first:border-t-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{event.type}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        {event.user.label} · {event.source} · {event.state ?? '—'}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-[var(--text-muted)]">
                      {formatDateTime(event.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className={BODY_CLASS}>Поки що немає подій для показу.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  compact = false,
}: {
  label: string
  value: string | number
  compact?: boolean
}) {
  return (
    <div className="px-4 py-4 first:border-t-0 md:border-t-0 md:border-l border-[rgba(255,255,255,0.05)] first:border-l-0">
      <p className={compact ? 'truncate text-xl font-medium text-[var(--text-primary)]' : 'text-[1.9rem] font-medium tracking-tight text-[var(--text-primary)]'}>
        {value}
      </p>
      <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[18px] border-b border-[rgba(255,255,255,0.05)] px-4 py-3 last:border-b-0">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <span className="text-right text-sm font-medium text-[var(--text-primary)]">{value}</span>
    </div>
  )
}
