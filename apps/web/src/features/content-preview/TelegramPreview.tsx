import { PreviewStatusBadge } from './PreviewStatusBadge'
import type { PreviewButton, PreviewStatus } from './types'

export function TelegramPreview({
  text,
  buttons,
  status,
}: {
  text: string
  buttons: PreviewButton[]
  status: PreviewStatus
}) {
  return (
    <div className="cp-frame cp-frame--telegram">
      <div className="cp-telegram-shell">
        <div className="cp-telegram-header">
          <div className="cp-avatar">S</div>
          <div>
            <div className="cp-feed-user">Starway ABsystem</div>
            <div className="cp-feed-meta">бот</div>
          </div>
          <PreviewStatusBadge status={status} />
        </div>
        <div className="cp-telegram-chat">
          <div className="cp-tg-bubble">
            <div className="cp-tg-text">{text}</div>
            <div className="cp-tg-time">09:00</div>
          </div>
          {buttons.length > 0 ? (
            <div className="cp-tg-keyboard cp-button-stack">
              {buttons.map((button) => (
                <button key={`${button.label}-${button.tone ?? 'primary'}`} type="button" className={`cp-action cp-action--${button.tone ?? 'primary'}`}>
                  {button.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
