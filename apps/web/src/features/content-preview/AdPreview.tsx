import { PreviewStatusBadge } from './PreviewStatusBadge'
import type { PreviewStatus } from './types'

export function AdPreview({
  hook,
  body,
  cta,
  imagePrompt,
  imageUrl,
  status,
}: {
  hook?: string
  body: string[]
  cta?: string
  imagePrompt?: string
  imageUrl?: string
  status: PreviewStatus
}) {
  return (
    <div className="cp-frame cp-frame--feed">
      <div className="cp-phone cp-phone--feed">
        <div className="cp-feed-header">
          <div className="cp-avatar">S</div>
          <div>
            <div className="cp-feed-user">starway.studio</div>
            <div className="cp-feed-meta">Sponsored</div>
          </div>
          <PreviewStatusBadge status={status} />
        </div>
        <div className="cp-feed-copy">
          <strong>{hook || body[0] || 'Рекламний hook'}</strong>
          {body.slice(0, 3).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <div className="cp-feed-image">
          {imageUrl ? (
            <img src={imageUrl} alt={hook || 'Generated ad visual'} className="h-full w-full object-cover" />
          ) : (
            <>
              <div className="cp-image-placeholder">Image</div>
              <p>{imagePrompt || 'Image prompt / banner visual'}</p>
            </>
          )}
        </div>
        <button type="button" className="cp-action cp-action--primary">
          {cta || 'Спробувати 7 днів'}
        </button>
      </div>
    </div>
  )
}
