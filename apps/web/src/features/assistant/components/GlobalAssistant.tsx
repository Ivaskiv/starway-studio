import { createPortal } from 'react-dom'
import { useCallback, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import AssistantBubble from './AssistantBubble'
import { AssistantPanel } from './AssistantPanel'
import { useProducerAssistant } from '../hooks/useProducerAssistant'
import { logAssistantEvent } from '../utils/assistantAnalytics'

export default function GlobalAssistant() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)

  const { steps, chat, nextAction, isLoading } = useProducerAssistant({
    enabled: isAuthenticated,
  })

  const handleToggle = useCallback(() => {
    const next = !open
    setOpen(next)
    logAssistantEvent(next ? 'assistant_opened' : 'assistant_closed')
  }, [open])

  const handleClose = useCallback(() => {
    setOpen(false)
    logAssistantEvent('assistant_closed')
  }, [])

  const handleAction = useCallback((action: string) => {
    logAssistantEvent('assistant_action', { action })
    switch (action) {
      case 'open_funnel':       navigate('/dashboard/ai-funnel'); break
      case 'open_mentor':       navigate('/dashboard/ai-mentor'); break
      case 'open_products':     navigate('/dashboard/products'); break
      case 'open_distribution': navigate('/dashboard/telegram'); break
      case 'open_morning':      navigate('/dashboard/cycle?session=morning'); break
      case 'open_evening':      navigate('/dashboard/cycle?session=evening'); break
      case 'open_wheel':        navigate('/dashboard/wheel'); break
      case 'open_progress':     navigate('/dashboard/progress'); break
      default: console.warn('Unknown assistant action:', action)
    }
    handleClose()
  }, [navigate, handleClose])

  const isGuestMode = !isAuthenticated
  const hasSteps = !isGuestMode && !!steps?.length

  const guestChat = {
    messages: [] as { role: 'user' | 'assistant'; content: string }[],
    sendMessage: async (_text: string) => {
      // TODO: /assistant/chat/public
    },
    isSending: false,
  }

  const activeChat = isGuestMode ? guestChat : chat

  return createPortal(
    <>
      {/* Backdrop — клік закриває панель */}
      {open && (
        <div
          className="assistant-overlay"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Панель — position:fixed через .assistant-panel-wrap в CSS */}
      {open && (
        <div className="assistant-panel-wrap">
          {!isGuestMode && isLoading ? (
            <div className="flex h-48 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] text-sm text-[var(--text-muted)]">
              Завантаження...
            </div>
          ) : (
            <AssistantPanel
              isOpen={open}
              onClose={handleClose}
              steps={hasSteps ? steps : undefined}
              nextAction={!isGuestMode ? nextAction : undefined}
              onAction={!isGuestMode ? handleAction : undefined}
              messages={activeChat.messages}
              sendMessage={activeChat.sendMessage}
              isSending={activeChat.isSending}
              mode={isGuestMode ? 'chat-only' : 'floating'}
              showClose
            />
          )}
        </div>
      )}

      {/* Бульбашка — завжди видима, position:fixed в CSS */}
      <AssistantBubble
        onClick={handleToggle}
        hasUnread={!isGuestMode && (chat?.messages?.length ?? 0) > 0}
      />
    </>,
    document.body,
  )
}
