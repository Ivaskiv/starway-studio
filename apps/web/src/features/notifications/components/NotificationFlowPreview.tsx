import {
  NOTIFICATION_PREVIEW_CHANNELS,
  NOTIFICATION_PREVIEW_MODULES,
  type NotificationPreviewChannel,
} from '@/features/notifications/config/notificationPreviewFlows'
import { CrossChannelPreviewTabs, TelegramPreview } from '@/features/content-preview'
import type { CrossChannelPreviewMode, PreviewButton } from '@/features/content-preview'
import { useMemo, useState } from 'react'

function messageButtonClass(count: number, index: number) {
  const isSingle = count === 1
  const isFirst = index === 0
  const isLast = index === count - 1

  if (isSingle) return 'notification-preview__message-btn--single'
  if (isFirst) return 'notification-preview__message-btn--top'
  if (isLast) return 'notification-preview__message-btn--bottom'
  return 'notification-preview__message-btn--middle'
}

export default function NotificationFlowPreview() {
  const [surface, setSurface] = useState<CrossChannelPreviewMode>('miniapp')
  const [channel, setChannel] = useState<NotificationPreviewChannel>('user')
  const [moduleId, setModuleId] = useState(NOTIFICATION_PREVIEW_MODULES[0]?.id ?? '')

  const activeModule = useMemo(
    () => NOTIFICATION_PREVIEW_MODULES.find(item => item.id === moduleId) ?? NOTIFICATION_PREVIEW_MODULES[0],
    [moduleId],
  )

  const activeThread = channel === 'user' ? activeModule.user : activeModule.expert
  const activeMessage = activeThread.messages[activeThread.messages.length - 1]
  const telegramButtons: PreviewButton[] = (activeMessage?.buttons ?? []).map((button, index) => ({
    label: button.label,
    tone:
      button.tone === 'primary'
        ? 'primary'
        : button.tone === 'secondary'
          ? 'secondary'
          : index === 0
            ? 'primary'
            : 'ghost',
  }))

  if (!activeModule || !activeThread) return null

  const chatCanvas = (
    <div className="notification-preview__canvas">
      <header className="notification-preview__chat-header">
        <div className="notification-preview__chat-avatar">{activeThread.avatar}</div>
        <div className="notification-preview__chat-identity">
          <strong>{activeThread.title}</strong>
          <span>{activeThread.subtitle}</span>
        </div>
      </header>

      <div className="notification-preview__chat-body">
        {activeThread.messages.map(message => (
          <article key={message.id} className="notification-preview__bubble-group">
            <div className="notification-preview__bubble">
              {message.text.split('\n').map((line, index) => (
                <p key={`${message.id}-${index}`}>{line}</p>
              ))}
            </div>

            {message.buttons?.length ? (
              <div className={`notification-preview__message-actions notification-preview__message-actions--${message.buttons.length > 1 ? 'stacked' : 'single'}`}>
                {message.buttons.map((button, index) => (
                  <button
                    key={`${message.id}-${button.label}`}
                    type="button"
                    className={[
                      'notification-preview__message-btn',
                      `notification-preview__message-btn--${button.tone ?? 'neutral'}`,
                      messageButtonClass(message.buttons?.length ?? 1, index),
                    ].join(' ')}
                  >
                    {button.label}
                  </button>
                ))}
              </div>
            ) : null}

            <span className="notification-preview__time">{message.time}</span>
          </article>
        ))}
      </div>

      <footer className="notification-preview__composer">
        <button type="button" className="notification-preview__scroll-btn" aria-label="Прокрутити донизу">
          ↓
        </button>
        <div className="notification-preview__composer-row">
          <input
            aria-label="Поле повідомлення"
            title="Поле повідомлення"
            value={activeThread.composerPlaceholder ?? 'Написати повідомлення...'}
            readOnly
            className="notification-preview__composer-input"
          />
          <button type="button" className="notification-preview__composer-send" aria-label="Надіслати">
            ↑
          </button>
        </div>
      </footer>
    </div>
  )

  return (
    <section className="notification-preview">
      <div className="dashboard-liquid-card mb-5 overflow-hidden">
        <div className="dashboard-liquid-edge--top px-5 py-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
                Cross-Channel Notifications
              </p>
              <h3 className="mt-3 text-[1.6rem] font-semibold tracking-tight text-[var(--text-primary)]">
                Один notification flow, три surfaces показу
              </h3>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                EXPERT, ADMIN і SUPERADMIN перемикають Desktop, Mini App і Telegram окремо від типу співрозмовника, тому бачать реальне відображення одного й того ж сценарію.
              </p>
            </div>

            <CrossChannelPreviewTabs mode={surface} onChange={setSurface} />
          </div>
        </div>
      </div>

      <div className="notification-preview notification-preview--workspace">
      <div className="notification-preview__workspace">
        <aside className="notification-preview__sidebar">
          <div className="notification-preview__sidebar-block">
            <p className="notification-preview__sidebar-label">ТИП ДІАЛОГУ</p>
            <div className="notification-preview__switch">
              {NOTIFICATION_PREVIEW_CHANNELS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setChannel(item.id)}
                  className={`notification-preview__switch-btn${channel === item.id ? ' notification-preview__switch-btn--active' : ''}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="notification-preview__sidebar-note">EXPERT · ADMIN · SUPERADMIN бачать обидва канали.</p>
          </div>

          <div className="notification-preview__sidebar-block">
            <p className="notification-preview__sidebar-label">МОДУЛЬ / ФІЧА</p>
            <div className="notification-preview__module-list">
              {NOTIFICATION_PREVIEW_MODULES.map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setModuleId(item.id)}
                  className={`notification-preview__module-btn${item.id === activeModule.id ? ' notification-preview__module-btn--active' : ''}`}
                >
                  <span className="notification-preview__module-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 items-stretch justify-center bg-[#fbfaf6] p-4">
          {surface === 'desktop' ? <div className="w-full">{chatCanvas}</div> : null}
          {surface === 'miniapp' ? (
            <div className="w-full max-w-[420px] rounded-[36px] border border-[rgba(var(--accent-rgb),0.2)] bg-[linear-gradient(180deg,rgba(7,10,20,0.98),rgba(10,14,28,0.95))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_24px_80px_rgba(6,10,22,0.42)]">
              <div className="overflow-hidden rounded-[28px] border border-[rgba(var(--accent-rgb),0.14)] bg-white">
                {chatCanvas}
              </div>
            </div>
          ) : null}
          {surface === 'telegram' ? (
            <div className="w-full max-w-[360px]">
              <TelegramPreview
                text={activeMessage?.text ?? ''}
                buttons={telegramButtons}
                status="ready"
              />
            </div>
          ) : null}
        </div>
      </div>
      </div>
    </section>
  )
}
