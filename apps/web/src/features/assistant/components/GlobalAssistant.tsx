import { createPortal } from 'react-dom'
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import AssistantBubble from './AssistantBubble'
import { AssistantPanel } from './AssistantPanel'
import { logAssistantEvent } from '../utils/assistantAnalytics'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export default function GlobalAssistant() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])

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
      case 'open_mentor':       navigate('/dashboard/ai-mentor'); break
      case 'open_morning':      navigate('/dashboard/cycle?session=morning'); break
      case 'open_evening':      navigate('/dashboard/cycle?session=evening'); break
      case 'open_wheel':        navigate('/dashboard/wheel'); break
      case 'open_progress':     navigate('/dashboard/progress'); break
      default: console.warn('Unknown assistant action:', action)
    }
    handleClose()
  }, [navigate, handleClose])

  const isGuestMode = !isAuthenticated
  const assistantChat = {
    messages,
    sendMessage: async (text: string) => {
      setMessages((current) => [
        ...current,
        { role: 'user', content: text },
        { role: 'assistant', content: 'Відкрий AI-ментора, ранкову або вечірню сесію, колесо балансу чи прогрес — це основні інструменти платформи.' },
      ])
    },
    isSending: false,
  }

  const guestChat = {
    messages: [] as { role: 'user' | 'assistant'; content: string }[],
    sendMessage: async (_text: string) => {
      // TODO: /assistant/chat/public
    },
    isSending: false,
  }

  const activeNonGuestChat = isGuestMode ? guestChat : assistantChat

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
          <AssistantPanel
            isOpen={open}
            onClose={handleClose}
            messages={activeNonGuestChat.messages}
            sendMessage={activeNonGuestChat.sendMessage}
            isSending={activeNonGuestChat.isSending}
            mode={isGuestMode ? 'chat-only' : 'floating'}
            showClose
            onAction={!isGuestMode ? handleAction : undefined}
          />
        </div>
      )}

      {/* Бульбашка — завжди видима, position:fixed в CSS */}
      <AssistantBubble
        onClick={handleToggle}
        hasUnread={!isGuestMode && activeNonGuestChat.messages.length > 0}
      />
    </>,
    document.body,
  )
}
