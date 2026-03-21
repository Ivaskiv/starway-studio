// frontend/src/features/producer/components/WeeklyReportCard.tsx

import { HeroVariantsPicker } from '@/features/ai-generator/components/HeroVariantsPicker'
import type { HeroVariant } from '@/features/ai-generator/types/ai-generator.types'
import s from '@/styles/components/weeklyReportCard.module.scss'
import cx from 'classnames'
import { useState } from 'react'
import { useGetWeeklyReportQuery } from '../services/producer.api'
import {
  useGetMyWeeklyReportQuery,
  useGetMyWeeklyReportsQuery,
} from '../services/weekly-analysis.api'

// ─────────────────────────────────────────────────────────────
// КОНСТАНТИ
// ─────────────────────────────────────────────────────────────
const AD_LABELS: Record<string, string> = {
  facebook:           'Facebook',
  instagram_caption:  'Instagram',
  tiktok_hook:        'TikTok Hook',
  stories:            'Stories',
  reels_script:       'Reels',
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function scoreVariant(n: number): 'great' | 'ok' | 'low' {
  if (n >= 7) return 'great'
  if (n >= 5) return 'ok'
  return 'low'
}

function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(iso).toLocaleDateString('uk-UA', opts)
}

// ─────────────────────────────────────────────────────────────
// АТОМАРНІ SUB-КОМПОНЕНТИ
// ─────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className={s.skeleton}>
      <div className={cx(s.skeleton__bar, s['skeleton__bar--sm'])} />
      <div className={cx(s.skeleton__bar, s['skeleton__bar--md'])} />
      <div className={cx(s.skeleton__bar, s['skeleton__bar--lg'])} />
    </div>
  )
}

function EmptyState({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className={s.empty}>
      <span className={s.empty__icon}>📊</span>
      <p className={s.empty__title}>{title}</p>
      {sub && <p className={s.empty__sub}>{sub}</p>}
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={s.error}>
      <p className={s.error__text}>Не вдалося завантажити звіт</p>
      <button className={s.error__retry} onClick={onRetry}>
        Спробувати знову
      </button>
    </div>
  )
}

function StatCell({ value, label }: { value: string | number; label: string }) {
  return (
    <div className={s.statCell}>
      <p className={s.statCell__value}>{value}</p>
      <p className={s.statCell__label}>{label}</p>
    </div>
  )
}

function WheelDeltaRow({ sphere, delta }: { sphere: string; delta: number }) {
  const abs     = Math.min(Math.abs(delta) * 10, 100)
  const fillMod = delta >= 0 ? s['deltaRow__fill--pos'] : s['deltaRow__fill--neg']
  const valMod  = delta > 0  ? s['deltaRow__value--pos']
                : delta < 0  ? s['deltaRow__value--neg']
                :               s['deltaRow__value--zero']
  return (
    <div className={s.deltaRow}>
      <span className={s.deltaRow__label}>{sphere}</span>
      <div className={s.deltaRow__track}>
        <progress
          className={cx(s.deltaRow__fill, fillMod)}
          value={abs}
          max={100}
        />
      </div>
      <span className={cx(s.deltaRow__value, valMod)}>
        {delta > 0 ? `+${delta}` : delta || '—'}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PRODUCER MODE  —  звіт по продукту (існуючий producer.api)
// ─────────────────────────────────────────────────────────────
interface ProducerProps {
  productId:      string
  onHeroSelect?:  (v: HeroVariant) => void
}

function ProducerReport({ productId, onHeroSelect }: ProducerProps) {
  const { data: report, isLoading, isError, refetch } = useGetWeeklyReportQuery(
    { productId },
    { skip: !productId },
  )

  if (isLoading)          return <Skeleton />
  if (isError || !report) return <ErrorState onRetry={refetch} />

  const weekStart = fmtDate(report.weekStart, { day: '2-digit', month: 'short' })
  const weekEnd   = fmtDate(report.weekEnd,   { day: '2-digit', month: 'short' })

  return (
    <div className="space-y-4">

      {/* ── Header + метрики ── */}
      <div className={s.card}>
        <div className={s.header}>
          <div className={s.header__meta}>
            <span className={s.header__label}>Тижневий звіт</span>
            <span className={s.header__range}>{weekStart} — {weekEnd}</span>
          </div>
          <div className={s.header__right}>
            <button className={s.refetchBtn} onClick={() => refetch()}>
              ↻ Оновити
            </button>
          </div>
        </div>

        <div className={s.statsGrid}>
          <StatCell value={report.metrics.newEntries}    label="Записів" />
          <StatCell value={report.metrics.totalSessions} label="Сесій" />
          <StatCell value={report.metrics.streakDays}    label="Активних днів" />
          <StatCell
            value={report.metrics.avgWheelScore != null
              ? `${report.metrics.avgWheelScore}/10`
              : '—'}
            label="Бал колеса"
          />
        </div>
      </div>

      {/* ── AI Аналіз ── */}
      {report.analysis && (
        <div className={cx(s.section, s['section--warning'])}>
          <p className={s.analysis__label}>AI Аналіз тижня</p>
          <p className={s.analysis__text}>{report.analysis}</p>
        </div>
      )}

      {/* ── Hero варіанти ── */}
      {report.heroVariants.length > 0 && (
        <div className={s.heroSection}>
          <p className={s.heroSection__label}>Hero варіанти тижня</p>
          <HeroVariantsPicker
            variants={report.heroVariants}
            onSelect={v => onHeroSelect?.(v)}
          />
        </div>
      )}

      {/* ── Рекламні тексти ── */}
      {report.adTexts && (
        <div className={cx(s.section, s['section--glass'])}>
          <p className={s.sectionLabel}>Рекламні тексти</p>
          <div className="space-y-3">
            {Object.entries(report.adTexts)
              .filter(([, text]) => Boolean(text))
              .map(([key, text]) => (
                <div key={key} className={s.adEntry}>
                  <p className={s.adEntry__platform}>
                    {AD_LABELS[key] ?? key}
                  </p>
                  <p className={s.adEntry__text}>{text}</p>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// USER MODE  —  тижневий AI-аналіз юзера (weekly-analysis.api)
// ─────────────────────────────────────────────────────────────
function UserReport() {
  const [showHistory, setShowHistory] = useState(false)

  const {
    data,
    isLoading: loadReport,
    isError,
    refetch,
  } = useGetMyWeeklyReportQuery()

  const { data: hist, isLoading: loadHist } = useGetMyWeeklyReportsQuery()

  if (loadReport || loadHist) return <Skeleton />
  if (isError)                return <ErrorState onRetry={refetch} />
  if (!data?.report)          return (
    <EmptyState
      title="Звіт готується"
      sub="Перший тижневий звіт з'явиться у неділю після 08:00"
    />
  )

  const { report }  = data
  const history     = hist?.reports ?? []
  const variant     = scoreVariant(report.overallScore)

  const weekLabel =
    fmtDate(report.weekStart, { day: 'numeric', month: 'long' }) +
    ' — ' +
    fmtDate(report.weekEnd,   { day: 'numeric', month: 'long' })

  return (
    <div className={s.card}>

      {/* ── Header ── */}
      <div className={s.header}>
        <div className={s.header__meta}>
          <span className={s.header__label}>📊 Тижневий звіт</span>
          <span className={s.header__range}>{weekLabel}</span>
        </div>
        <div className={s.header__right}>
          {report.pdfUrl && (
            <a
              href={report.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className={s.pdfBtn}
            >
              ↓ PDF
            </a>
          )}
          <div className={cx(s.scoreBadge, s[`scoreBadge--${variant}`])}>
            {report.overallScore}
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className={s.statsGrid}>
        <StatCell value={`${report.completionRate}%`} label="Виконано" />
        <StatCell value={`${report.streakDays}д`}     label="Стрік" />
        <StatCell value={`${report.overallScore}/10`} label="Прогрес" />
        <StatCell value={report.topInsights.length}   label="Інсайти" />
      </div>

      {/* ── Summary ── */}
      <p className={s.summary}>{report.summaryText}</p>

      {/* ── Insights ── */}
      {report.topInsights.length > 0 && (
        <div className={cx(s.section, s['section--glass'])}>
          <p className={s.sectionLabel}>✨ Інсайти тижня</p>
          <ul className={s.insightList}>
            {report.topInsights.map((ins, i) => (
              <li key={i} className={s.insightItem}>
                <span className={s.insightItem__dot}>•</span>
                <span>{ins}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Growth / Struggle ── */}
      {(report.growthAreas.length > 0 || report.struggleAreas.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {report.growthAreas.length > 0 && (
            <div className={cx(s.section, s['section--success'])}>
              <p className={s.sectionLabel}>📈 Зростання</p>
              <ul className="mt-1 space-y-1">
                {report.growthAreas.map((a, i) => (
                  <li key={i} className="text-xs text-green-400">• {a}</li>
                ))}
              </ul>
            </div>
          )}
          {report.struggleAreas.length > 0 && (
            <div className={cx(s.section, s['section--danger'])}>
              <p className={s.sectionLabel}>🔻 Складнощі</p>
              <ul className="mt-1 space-y-1">
                {report.struggleAreas.map((a, i) => (
                  <li key={i} className="text-xs text-red-400">• {a}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Wheel delta ── */}
      {report.wheelDelta.length > 0 && (
        <div className={cx(s.section, s['section--glass'])}>
          <p className={s.sectionLabel}>☯️ Зміни у сферах</p>
          <div className="mt-1 space-y-2">
            {[...report.wheelDelta]
              .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
              .slice(0, 6)
              .map(d => (
                <WheelDeltaRow key={d.sphere} sphere={d.sphere} delta={d.delta} />
              ))}
          </div>
        </div>
      )}

      {/* ── Next week focus ── */}
      <div className={cx(s.section, s['section--gold'])}>
        <p className={s.sectionLabel}>🎯 Фокус наступного тижня</p>
        <p className="text-sm font-semibold text-white mt-1">
          {report.nextWeekFocus}
        </p>
        {report.nextWeekTasks.length > 0 && (
          <ul className={s.taskList}>
            {report.nextWeekTasks.map((t, i) => (
              <li key={i} className={s.taskItem}>
                <span className={s.taskItem__num}>{i + 1}.</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Motivation ── */}
      <div className={cx(s.section, s['section--accent'])}>
        <p className={cx(s.sectionLabel, s.motivation__label)}>
          💌 Від твого ментора
        </p>
        <p className={s.motivation__text}>{report.motivationText}</p>
      </div>

      {/* ── History ── */}
      {history.length > 1 && (
        <div>
          <button
            className={s.historyToggle}
            onClick={() => setShowHistory(v => !v)}
          >
            {showHistory
              ? '▲ Сховати'
              : `▼ Попередні звіти (${history.length - 1})`}
          </button>

          {showHistory && (
            <ul className={s.historyList}>
              {history.slice(1).map(h => (
                <li key={h.id} className={s.historyItem}>
                  <span className={s.historyItem__date}>
                    {fmtDate(h.weekStart, { day: 'numeric', month: 'short' })}
                  </span>
                  <div className={s.historyItem__meta}>
                    <span className={s.historyItem__score}>
                      {h.overallScore}/10
                    </span>
                    <span className={s.historyItem__rate}>
                      {h.completionRate}%
                    </span>
                    {h.pdfUrl && (
                      <a
                        href={h.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={s.historyItem__pdf}
                      >
                        PDF
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// PUBLIC EXPORT — один компонент, два режими через props
// ─────────────────────────────────────────────────────────────
interface Props {
  /** Producer mode: звіт по конкретному продукту */
  productId?:    string
  onHeroSelect?: (v: HeroVariant) => void
  /** User mode: персональний тижневий AI-аналіз */
  userMode?:     boolean
}

export function WeeklyReportCard({ productId, onHeroSelect, userMode = false }: Props) {
  if (userMode) return <UserReport />

  if (!productId) return (
    <EmptyState title="Оберіть продукт для тижневого звіту" />
  )

  return <ProducerReport productId={productId} onHeroSelect={onHeroSelect} />
}
