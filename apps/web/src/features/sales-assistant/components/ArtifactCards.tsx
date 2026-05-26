import { resolveQueueLabel } from '@/features/sales-assistant/utils/preview.helpers'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

type Props = {
  outputs: string[]
  queueProgress: Record<string, number>
  isBusy: boolean
  hasResult: boolean
  hasRealReelsEngine: boolean
}

export function StrategicCards({ outputs, queueProgress, isBusy, hasResult, hasRealReelsEngine }: Props) {
  return (
    <div className="dna-right-section">
      <h4 className="dna-right-label">QUEUE & STATUS</h4>
      <div className="dna-queue">
        {outputs.map((type) => {
          const progress = queueProgress[type] ?? 0
          const isReady = progress >= 100
          return (
            <div key={type} className="dna-queue-row">
              <span className={`dna-queue-row__status ${isReady ? 'is-done' : isBusy ? 'is-active' : 'is-waiting'}`}>
                {isReady ? <CheckCircle2 size={13} /> : isBusy ? <Loader2 size={13} className="spin" /> : <Circle size={13} />}
              </span>
              <span className="dna-queue-row__label">{type}</span>
              <span className="dna-queue-row__meta">{resolveQueueLabel(progress, isBusy)}</span>
            </div>
          )
        })}
        <div className="dna-queue-row"><span className="dna-queue-row__status is-waiting"><Circle size={13} /></span><span className="dna-queue-row__label">Банери</span><span className="dna-queue-row__meta">{hasResult ? 'У черзі' : 'Не вибрано'}</span></div>
        {hasRealReelsEngine ? <div className="dna-queue-row"><span className="dna-queue-row__status is-waiting"><Circle size={13} /></span><span className="dna-queue-row__label">Reels-рушій</span><span className="dna-queue-row__meta">{hasResult ? 'У черзі' : 'Не вибрано'}</span></div> : null}
        <div className="dna-queue-row"><span className="dna-queue-row__status is-waiting"><Circle size={13} /></span><span className="dna-queue-row__label">Публікація в Telegram</span><span className="dna-queue-row__meta">{hasResult ? 'У черзі' : 'Не вибрано'}</span></div>
      </div>
    </div>
  )
}
