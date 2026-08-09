import { X } from 'lucide-react'
import toast from 'react-hot-toast'

import { formatVerboseDate } from '@/features/daily-cycle/utils/dashboard.utils'
import { BaseModal } from '@/features/modals/BaseModal'

import type { AiMentorDashboardScreenState } from '../../hooks/useAiMentorDashboardScreenState'

type Props = {
  state: AiMentorDashboardScreenState
}

export default function AiMentorDashboardTodayGuardModal({ state }: Props) {
  return (
    <BaseModal
      isOpen={state.todayGuardBlockState.isOpen}
      onClose={state.handleTodayGuardDismiss}
      overlayClassName="bg-[rgba(6,10,18,0.78)]"
      panelClassName="max-w-[34rem] rounded-[24px] border border-yellow-300/45 bg-[linear-gradient(180deg,rgba(250,204,21,0.14),rgba(18,24,36,0.98)_42%,rgba(10,14,24,0.98))] p-0 shadow-[0_30px_90px_rgba(0,0,0,0.38)]"
    >
      <div
        data-testid="yesterday-confirm-block"
        className="rounded-[24px] border border-yellow-300/25 bg-[rgba(250,204,21,0.05)] p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-yellow-300">
              Вчорашній день не закрито
            </p>
            <p className="mt-1 text-lg font-semibold text-yellow-50">
              {state.todayGuardBlockState.yesterdayDay ? formatVerboseDate(state.todayGuardBlockState.yesterdayDay.date) : 'Учора'}
            </p>
            <p className="mt-2 text-sm leading-6 text-yellow-50/85">
              Спочатку заверши вчорашній день або свідомо пропусти його. Повернутися до нього після пропуску більше не вийде.
            </p>
          </div>
          <button
            type="button"
            data-testid="dismiss-btn"
            onClick={state.handleTodayGuardDismiss}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[var(--text-muted)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
            aria-label="Закрити"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {state.todayGuardStepSummary.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {state.todayGuardStepSummary.map((step) => (
              <span
                key={step.id}
                className={[
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium',
                  step.done
                    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                    : 'border-white/10 bg-white/5 text-white/55',
                ].join(' ')}
              >
                {step.label} {step.done ? '✓' : '✗'}
              </span>
            ))}
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl border border-yellow-300/18 bg-yellow-300/10 px-4 py-3 text-sm text-yellow-50/90">
          Якщо обереш пропуск, вчорашній день одразу стане історією без можливості відповісти пізніше.
        </div>

        <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            data-testid="catchup-confirm-btn"
            onClick={state.handleFinishYesterday}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-yellow-300 bg-yellow-300/14 px-4 py-2 text-sm font-semibold text-yellow-300 transition-colors hover:bg-yellow-300/20"
          >
             Завершити вчора
          </button>
          <button
            type="button"
            data-testid="skip-yesterday-btn"
            onClick={() => {
              void state.handleTodayGuardSkip().catch(() => {
                toast.error('Не вдалося пропустити вчорашній день.')
              })
            }}
            className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-sm font-semibold text-white/55 transition-colors hover:border-white/18 hover:bg-white/8 hover:text-white/75"
          >
            Пропустити вчора
          </button>
        </div>
      </div>
    </BaseModal>
  )
}
