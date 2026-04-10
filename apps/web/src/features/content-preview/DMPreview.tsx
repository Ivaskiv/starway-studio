import { PreviewStatusBadge } from './PreviewStatusBadge'
import type { PreviewStatus } from './types'

export function DMPreview({
  steps,
  status,
}: {
  steps: string[]
  status: PreviewStatus
}) {
  return (
    <div className="cp-frame cp-frame--dm">
      <div className="cp-phone cp-phone--dm">
        <div className="cp-feed-header">
          <div className="cp-avatar">I</div>
          <div>
            <div className="cp-feed-user">Instagram DM</div>
            <div className="cp-feed-meta">conversation</div>
          </div>
          <PreviewStatusBadge status={status} />
        </div>
        <div className="cp-dm-thread">
          {steps.slice(0, 4).map((step, index) => (
            <div key={`${step}-${index}`} className={`cp-dm-bubble ${index % 2 === 0 ? 'cp-dm-bubble--left' : 'cp-dm-bubble--right'}`}>
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
