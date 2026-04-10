import { PreviewStatusBadge } from './PreviewStatusBadge'
import type { PreviewStatus } from './types'

export function PodcastPreview({
  title,
  subtitles,
  status,
}: {
  title?: string
  subtitles: string[]
  status: PreviewStatus
}) {
  return (
    <div className="cp-frame cp-frame--podcast">
      <div className="cp-podcast-shell">
        <div className="cp-feed-header">
          <div className="cp-avatar">S</div>
          <div>
            <div className="cp-feed-user">{title || 'Starway Podcast'}</div>
            <div className="cp-feed-meta">talking head preview</div>
          </div>
          <PreviewStatusBadge status={status} />
        </div>
        <div className="cp-podcast-stage">
          <div className="cp-podcast-avatar">Host</div>
          <div className="cp-podcast-subtitles">
            {subtitles.slice(0, 4).map((line) => (
              <span key={line} className="cp-subtitle-row">{line}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
