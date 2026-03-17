import { useEffect, useRef, useState } from 'react'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

interface Props {
  isOpen: boolean
  onClose?: () => void
  nextAction?: string
  messages: ChatMessage[]
  sendMessage: (text: string) => Promise<void>
  isSending: boolean
  mode?: 'floating' | 'static'
  showClose?: boolean
  className?: string
}

const SUGGESTIONS = [
  'Як працює платформа?',
  'Що таке колесо балансу?',
  'Як запустити AI-воронку?',
  'Що входить у підписку?',
]

export function AssistantPanel({
  isOpen,
  onClose = () => {},
  messages,
  sendMessage,
  isSending,
  mode = 'floating',
  showClose = true,
  className,

}: Props) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 100)
  }, [isOpen])

  if (!isOpen) return null

  const handleSend = () => {
    if (!input.trim() || isSending) return
    sendMessage(input.trim())
    setInput('')
  }

  const handleSuggestion = (text: string) => {
    sendMessage(text)
  }

  const panelClassName = [
    'ap-panel',
    mode === 'floating' ? 'assistant-panel--floating' : 'assistant-panel--static',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const isEmpty = messages.length === 0

  return (
    <div className={`${panelClassName} flex flex-col`}>

      {/* ── Header ── */}
      <div className="ap-header">
        <div className="ap-header-left">
          {/* Мікро-аватар чоловічка */}
          <div className="ap-avatar">
            <svg viewBox="0 0 24 24" fill="none" className="ap-avatar-svg">
              <circle cx="12" cy="6.5" r="3.5" className="ap-av-head" />
              <circle cx="10.5" cy="6" r="0.9" className="ap-av-eye" />
              <circle cx="13.5" cy="6" r="0.9" className="ap-av-eye" />
              <rect x="8.5" y="12" width="7" height="6" rx="2" className="ap-av-body" />
              <rect x="10.5" y="13.5" width="3" height="2.5" rx="0.5" className="ap-av-chip" />
              <line x1="8.5" y1="14" x2="6" y2="16" className="ap-av-arm" strokeWidth="1.4" strokeLinecap="round" />
              <line x1="15.5" y1="14" x2="18" y2="16" className="ap-av-arm" strokeWidth="1.4" strokeLinecap="round" />
              <line x1="10" y1="18" x2="9" y2="22" className="ap-av-leg" strokeWidth="1.4" strokeLinecap="round" />
              <line x1="14" y1="18" x2="15" y2="22" className="ap-av-leg" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className="ap-avatar-dot" />
          </div>
          <div>
            <p className="ap-title">Starway AI</p>
            <p className="ap-subtitle"><span className="ap-online" />онлайн</p>
          </div>
        </div>
        {showClose && (
          <button onClick={onClose} className="ap-close">✕</button>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="ap-messages flex-1 overflow-y-auto">
        {isEmpty ? (
          /* Notion-style empty state */
          <div className="ap-empty">
            <div className="ap-empty-icon">
              <svg viewBox="0 0 40 40" fill="none" className="ap-empty-bot">
                <circle cx="20" cy="11" r="6" className="assistant-head" />
                <circle cx="17.5" cy="10.5" r="1.2" className="assistant-eye" />
                <circle cx="22.5" cy="10.5" r="1.2" className="assistant-eye" />
                <circle cx="20" cy="13" r="0.6" className="assistant-neural" />
                <rect x="14" y="19" width="12" height="10" rx="3" className="assistant-body" />
                <rect x="18" y="21.5" width="4" height="4" rx="1" className="assistant-chip" />
                <line x1="20" y1="21.5" x2="20" y2="19" className="assistant-wire" strokeWidth="1" />
                <line x1="14" y1="22" x2="10" y2="25" className="assistant-arm" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="26" y1="22" x2="30" y2="25" className="assistant-arm" strokeWidth="1.8" strokeLinecap="round" />
                <circle cx="10" cy="25.5" r="1.5" className="assistant-hand" />
                <circle cx="30" cy="25.5" r="1.5" className="assistant-hand" />
                <line x1="17" y1="29" x2="15" y2="35" className="assistant-leg" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="23" y1="29" x2="25" y2="35" className="assistant-leg" strokeWidth="1.8" strokeLinecap="round" />
                <line x1="13" y1="35" x2="17" y2="35" className="assistant-foot" strokeWidth="2" strokeLinecap="round" />
                <line x1="23" y1="35" x2="27" y2="35" className="assistant-foot" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p className="ap-empty-title">Чим можу допомогти?</p>
            <div className="ap-suggestions">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  className="ap-suggestion"
                  onClick={() => handleSuggestion(s)}
                >
                  <span className="ap-suggestion-icon">→</span>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="ap-messages-inner">
            {messages.map((msg, i) => (
              <div key={i} className={`ap-msg ap-msg--${msg.role}`}>
                {msg.role === 'assistant' && <span className="ap-msg-mark">✦</span>}
                <span className="ap-msg-text">{msg.content}</span>
              </div>
            ))}
            {isSending && (
              <div className="ap-msg ap-msg--assistant ap-msg--typing">
                <span className="ap-msg-mark">✦</span>
                <span className="ap-dots"><span /><span /><span /></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div className="ap-input-row">
        <textarea
          ref={textareaRef}
          className="ap-textarea ap-textarea--main"
          rows={1}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Запитай AI..."
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isSending}
          className="ap-send"
          aria-label="Надіслати"
        >↑</button>
      </div>
    </div>
  )
}
