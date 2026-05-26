import type { DnaHistoryEntry } from '@/features/sales-assistant/hooks/useDnaGenerationHistory'
import type { Dispatch, SetStateAction } from 'react'

type PainPattern = { token: string; hits: number }

interface HistoryPanelProps {
  history: DnaHistoryEntry[]
  winningFormulas: DnaHistoryEntry[]
  painPatterns: PainPattern[]
  compareVersionId: string | null
  setCompareVersionId: Dispatch<SetStateAction<string | null>>
}

export function HistoryPanel({
  history,
  winningFormulas,
  painPatterns,
  compareVersionId,
  setCompareVersionId,
}: HistoryPanelProps) {
  return (
    <div className="dashboard-liquid-card--soft ai-section-card ai-section-card--history p-6 space-y-4">
      {/* <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] flex items-center gap-2">
        <h3 className="ai-sidebar-label-heading">Історія</h3>
      </label> */}
      <div className="ai-assistant-history-grid">
        <div className="ai-assistant-history-block">
          <span className="ai-assistant-routing-grid__label">
            Попередні результати
          </span>
          <div className="ai-assistant-history-list custom-scrollbar">
            {history.slice(0, 8).map((entry) => (
              <button
                key={entry.id}
                className={`ai-assistant-history-item ${
                  compareVersionId === entry.id ? 'is-active' : ''
                }`}
                onClick={() =>
                  setCompareVersionId((current) =>
                    current === entry.id ? null : entry.id
                  )
                }
                type="button"
              >
                <span>
                  {entry.mode} · {entry.protocol}
                </span>
                <span>{entry.format}</span>
                <span>Truth {entry.truthScore}</span>
              </button>
            ))}
            {history.length === 0 ? (
              <span className="text-xs text-[var(--text-muted)]">
                Історія поки порожня
              </span>
            ) : null}
          </div>
        </div>

        <div className="ai-assistant-history-block">
          <span className="ai-assistant-routing-grid__label">Сильні формули</span>
          <div className="ai-assistant-chip-wrap">
            {winningFormulas.map((entry) => (
              <span key={entry.id} className="ai-assistant-variant-chip">
                {entry.mode} · {entry.truthScore}
              </span>
            ))}
            {winningFormulas.length === 0 ? (
              <span className="text-xs text-[var(--text-muted)]">
                Немає формул зі score ≥ 85
              </span>
            ) : null}
          </div>
        </div>

        <div className="ai-assistant-history-block">
          <span className="ai-assistant-routing-grid__label">
            Патерни болю аудиторії
          </span>
          <div className="ai-assistant-chip-wrap">
            {painPatterns.map((pattern) => (
              <span key={pattern.token} className="ai-assistant-variant-chip">
                {pattern.token} · {pattern.hits}
              </span>
            ))}
            {painPatterns.length === 0 ? (
              <span className="text-xs text-[var(--text-muted)]">
                Патерни зʼявляться після генерацій
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
