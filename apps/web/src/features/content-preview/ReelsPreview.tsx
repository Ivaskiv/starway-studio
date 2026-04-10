import { PreviewStatusBadge } from './PreviewStatusBadge'
import type { PreviewStatus } from './types'

export function ReelsPreview({
  hook,
  body,
  cta,
  subtitles,
  coverImageUrl,
  status,
}: {
  hook?: string
  body: string[]
  cta?: string
  subtitles?: string[]
  coverImageUrl?: string
  status: PreviewStatus
}) {
  const subtitleRows = (subtitles?.length ? subtitles : body).slice(0, 3)

  return (
    <div className="cp-frame cp-frame--reels">
      <div className="cp-phone cp-phone--reels">
        <div className="cp-reels-video">
          {coverImageUrl ? (
            <img src={coverImageUrl} alt={hook || 'Reels cover'} className="cp-reels-cover" />
          ) : null}
          <div className="cp-reels-topbar">
            <span className="cp-dot" />
            <span className="cp-muted">reel preview</span>
            <PreviewStatusBadge status={status} />
          </div>
          <div className="cp-reels-hook">{hook || body[0] || 'Hook для Reels з’явиться тут'}</div>
          <div className="cp-reels-footer">
            <div className="cp-reels-subtitles">
              {subtitleRows.map((row) => (
                <span key={row} className="cp-subtitle-row">{row}</span>
              ))}
            </div>
            <div className="cp-reels-cta">{cta || 'Напиши “СТАРТ”'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
