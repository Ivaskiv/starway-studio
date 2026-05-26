import { CheckCircle2, ChevronRight, Circle, Loader2, Sparkles } from 'lucide-react'
import { Fragment } from 'react'

type Props = {
  pipelineStages: readonly string[]
  isBusy: boolean
  hasResult: boolean
  canGenerate: boolean
  validationError: string | null
  onGenerate: () => void
}

export function PipelineStatus({
  pipelineStages,
  isBusy,
  hasResult,
  canGenerate,
  validationError,
  onGenerate,
}: Props) {
  return (
    <>
      <div className="dna-pipeline">
        {pipelineStages.map((stage, idx) => {
          const stageState = isBusy && idx === 0 ? 'is-active' : hasResult ? 'is-done' : 'is-waiting'
          return (
            <Fragment key={stage}>
              <div className={`dna-pipeline__stage ${stageState}`}>
                <span className="dna-pipeline__icon">{hasResult ? <CheckCircle2 size={13} /> : isBusy && idx === 0 ? <Loader2 size={13} className="spin" /> : <Circle size={13} />}</span>
                <span className="dna-pipeline__label">{stage}</span>
              </div>
              {idx < pipelineStages.length - 1 && <ChevronRight size={11} className="dna-pipeline__sep" />}
            </Fragment>
          )
        })}
      </div>

      <button type="button" disabled={!canGenerate} onClick={onGenerate} className="dna-generate-btn dna-btn-inline-content">
        {isBusy ? 'ГЕНЕРАЦІЯ...' : <><Sparkles size={14} /> ГЕНЕРУВАТИ СТРАТЕГІЧНИЙ ВИВІД</>}
      </button>
      {validationError ? <p className="generation-validation-error">{validationError}</p> : null}
    </>
  )
}
