import { Bot, MessageSquare } from 'lucide-react'

import type { MonthlyConversationSummary } from '@/features/ai-mentor/services/mentor.api'
import type { WheelAssessment } from '@/features/wheel/types/wheel.types'
import { GlassCard, InfoHint } from '@/ui'

import { SECTION_EYEBROW_CLASS, SURFACE_BLOCK_CLASS } from '@/features/daily-cycle/types/reportsTab.constants'
import { formatDateTime } from '@/features/daily-cycle/utils/reportsTab.utils'

type TrendPoint = { date: string; value: number }

type MonthSummary = {
  morningCount: number
  eveningCount: number
  completedTasks: number
  missedTasks: number
  latestWheel: WheelAssessment | null
  wheelAverageDelta: number | null
  trendPoints: TrendPoint[]
}

type Props = {
  monthSummary: MonthSummary
  strongestLabel: string
  weakestLabel: string
  monthlyStatusNote: string
  trendFirstValue: number
  trendLastValue: number
  nextWheelUpdateDate: Date | null
  conversationSummary: MonthlyConversationSummary | null | undefined
}

export function ReportsInsightsSections({
  monthSummary,
  strongestLabel,
  weakestLabel,
  monthlyStatusNote,
  trendFirstValue,
  trendLastValue,
  nextWheelUpdateDate,
  conversationSummary,
}: Props) {
  return (
    <>
      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-white p-5 shadow-none">
          <div className="flex items-center gap-2">
            <p className={SECTION_EYEBROW_CLASS}>Місячний підсумок</p>
            <InfoHint label="Місячний підсумок" description="Цей зріз збирається з реальних даних за останні 30 днів: ранок, вечір, мікрозавдання, колесо й динаміка стану." instruction="Дивись не лише на кількість дій, а й на траєкторію стану: де є прогрес, а де ритм просідає." />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Ранкових сесій', value: monthSummary.morningCount },
              { label: 'Вечірніх сесій', value: monthSummary.eveningCount },
              { label: 'Виконано задач', value: monthSummary.completedTasks },
              { label: 'Не завершено', value: monthSummary.missedTasks },
            ].map(item => (
              <div key={item.label} className={`${SURFACE_BLOCK_CLASS} rounded-[16px] px-3 py-3`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">{item.label}</p>
                <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-[18px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
            <span className={`mt-1 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full ${monthSummary.trendPoints.length >= 2 && trendLastValue >= trendFirstValue ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">
                {monthSummary.trendPoints.length >= 2 && trendLastValue >= trendFirstValue ? 'В нормі' : 'Потрібна увага'}
              </p>
              <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{monthlyStatusNote}</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-white p-5 shadow-none">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={SECTION_EYEBROW_CLASS}>Колесо балансу</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">Останній доступний зріз і короткий аналіз без візуалізації колеса.</p>
            </div>
            {monthSummary.wheelAverageDelta != null ? (
              <span className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                Δ {monthSummary.wheelAverageDelta > 0 ? '+' : ''}{monthSummary.wheelAverageDelta}
              </span>
            ) : null}
          </div>

          {monthSummary.latestWheel ? (
            <div className="mt-4 space-y-3">
              <div className={`${SURFACE_BLOCK_CLASS} rounded-[18px] p-4`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">Сильна сфера</p>
                <p className="mt-2 flex items-start gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                  <span>{strongestLabel}</span>
                </p>
              </div>
              <div className={`${SURFACE_BLOCK_CLASS} rounded-[18px] p-4`}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">Сфера фокусу</p>
                <p className="mt-2 flex items-start gap-2 text-sm font-medium text-[var(--text-primary)]">
                  <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                  <span>{weakestLabel}</span>
                </p>
              </div>
              <p className="text-xs text-[var(--text-muted)]">
                Наступне оновлення: {nextWheelUpdateDate ? nextWheelUpdateDate.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-[18px] border border-dashed border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-8 text-center text-sm text-[var(--text-muted)]">
              Ще немає колеса балансу за цей період, тому місячний зріз поки неповний.
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-white p-5 shadow-none">
        <div className="flex items-center gap-2">
          <p className={SECTION_EYEBROW_CLASS}>Бесіди з асистентом</p>
          <InfoHint label="Бесіди з асистентом" description="Цей блок показує, наскільки активно ти використовувала чат-підтримку протягом останніх 30 днів і які теми звучали найчастіше." instruction="Дивись на теми й короткі фрагменти діалогів: вони добре підсвічують повторювані питання, сумніви й точки росту." />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Діалогів', value: conversationSummary?.totalConversations ?? 0, icon: MessageSquare },
            { label: 'Повідомлень', value: conversationSummary?.totalMessages ?? 0, icon: Bot },
          ].map(item => (
            <div key={item.label} className={`${SURFACE_BLOCK_CLASS} rounded-[16px] px-3 py-3`}>
              <div className="flex items-center gap-2 text-[var(--text-muted)]">
                <item.icon className="h-4 w-4 text-[rgb(var(--accent-soft-rgb))]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">{item.label}</span>
              </div>
              <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{item.value}</p>
            </div>
          ))}
        </div>

        {(conversationSummary?.totalConversations ?? 0) === 0 && (conversationSummary?.totalMessages ?? 0) === 0 ? (
          <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">Ще замало діалогів для аналізу тем.</p>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className={`${SURFACE_BLOCK_CLASS} p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">Теми, що звучали найчастіше</p>
              {conversationSummary?.topThemes?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {conversationSummary.topThemes.map(theme => (
                    <span key={theme} className="rounded-full border border-[rgba(var(--accent-rgb),0.18)] bg-[rgba(var(--accent-rgb),0.07)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
                      {theme}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">Ще замало діалогів, щоб виділити повторювані теми.</p>
              )}
            </div>

            <div className={`${SURFACE_BLOCK_CLASS} p-4`}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgb(var(--accent-soft-rgb))]">Останні сигнали з діалогів</p>
              {conversationSummary?.recentHighlights?.length ? (
                <div className="mt-3 space-y-3">
                  {conversationSummary.recentHighlights.map(item => (
                    <div key={item.id} className={`${SURFACE_BLOCK_CLASS} rounded-[14px] px-3 py-3`}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{item.title}</p>
                        <span className="text-[11px] text-[var(--text-muted)]">{item.messageCount} повідомлень</span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{item.preview || 'Короткий фрагмент ще не сформовано.'}</p>
                      <p className="mt-2 text-[11px] text-[var(--text-muted)]">{formatDateTime(item.updatedAt)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">За останні 30 днів ще немає збережених діалогів для цього блоку.</p>
              )}
            </div>
          </div>
        )}
      </GlassCard>
    </>
  )
}
