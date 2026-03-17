import { createPortal } from 'react-dom'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import AssistantBubble from './AssistantBubble'
import { AssistantPanel } from './AssistantPanel'
import { useProducerAssistant } from '../hooks/useProducerAssistant'
import { logAssistantEvent } from '../utils/assistantAnalytics'

export default function GlobalAssistant() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { chat } = useProducerAssistant({ enabled: isAuthenticated })
  const [open, setOpen] = useState(false)

  const handleOpen = useCallback(() => {
    if (!open) {
      setOpen(true)
      logAssistantEvent('assistant.open', { auth: isAuthenticated ? 'authenticated' : 'guest' })
    }
  }, [isAuthenticated, open])

  const handleClose = useCallback(() => {
    if (open) {
      setOpen(false)
      logAssistantEvent('assistant.close', { auth: isAuthenticated ? 'authenticated' : 'guest' })
    }
  }, [isAuthenticated, open])

  const portal = createPortal(
    <>
      {open && <div className="assistant-overlay" onClick={handleClose} />}
      <div className={`assistant-popup ${open ? 'assistant-popup--open' : ''}`}>
        {open && (
          <div className="assistant-popup__panel">
            <AssistantPanel
              isOpen
              onClose={handleClose}
              messages={chat.messages}
              sendMessage={chat.sendMessage}
              isSending={chat.isSending}
              showClose
              className="assistant-popup__panel-content"
            />
          </div>
        )}
        <AssistantBubble
          onClick={handleOpen}
          hasUnread={chat.messages.length > 0}
          className="assistant-popup__bubble"
        />
      </div>
    </>,
    document.body,
  )
  return portal
}
