import { useEffect, useRef, useState } from 'react';
import { AvaHead } from './AvaAssistant';
// import { AssistantStepCard } from './AssistantStepCard'
import type { AssistantStep } from '../types/assistant.types';

type ChatMessage = { role: 'user' | 'assistant'; content: string }

interface Props {
  isOpen: boolean
  onClose?: () => void
  steps?: AssistantStep[]
  nextAction?: string
  onAction?: (action: string) => void
  messages: ChatMessage[]
  sendMessage: (text: string) => Promise<void>
  isSending: boolean
  /** floating = повна панель | chat-only = гість | static = вбудована в сторінку */
  mode?: 'floating' | 'chat-only' | 'static'
  showClose?: boolean
  className?: string
}

const SUGGESTIONS_AUTH = [
  { icon: '→', text: 'Який мій наступний крок?' },
  { icon: '→', text: 'Як налаштувати AI-воронку?' },
  { icon: '→', text: 'Що таке продюсер-асистент?' },
  { icon: '→', text: 'Як зростати швидше?' },
]

const SUGGESTIONS_GUEST = [
  { icon: '→', text: 'Як працює платформа?' },
  { icon: '→', text: 'Що таке колесо балансу?' },
  { icon: '→', text: 'Як запустити AI-воронку?' },
  { icon: '→', text: 'Що входить у підписку?' },
]

export function AssistantPanel({
  isOpen,
  onClose = () => {},
  steps = [],
  nextAction,
  onAction,
  messages,
  sendMessage,
  isSending,
  mode = 'floating',
  showClose = true,
  className,
}: Props) {
  const [input, setInput] = useState('')
  const [activeTab, setActiveTab] = useState<'chat' | 'steps'>('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isGuestMode = mode === 'chat-only'
  const hasSteps = steps.length > 0
  const showTabs = mode === 'floating' && hasSteps
  const SUGGESTIONS = isGuestMode ? SUGGESTIONS_GUEST : SUGGESTIONS_AUTH
  const readyCount = steps.filter(s => s.status === 'ready').length

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 120)
  }, [isOpen])

  if (!isOpen) return null

  const handleSend = () => {
    if (!input.trim() || isSending) return
    sendMessage(input.trim())
    setInput('')
  }

  const handleStepClick = (step: AssistantStep) => {
    if (step.status === 'ready' && step.action && onAction) onAction(step.action)
  }

  // Static mode — стара розмітка для AIProducerAssistantPage
  // if (mode === 'static') {
  //   return (
  //     <div className={['ap-panel', 'flex', 'flex-col', className].filter(Boolean).join(' ')}>
  //       {hasSteps && (
  //         <div className="ap-steps">
  //           <div className="ap-steps-grid">
  //             {steps.map(step => (
  //               <AssistantStepCard key={step.id} step={step} onAction={handleStepClick} />
  //             ))}
  //           </div>
  //         </div>
  //       )}
  //       <div className="ap-messages flex-1 overflow-y-auto">
  //         <MessagesArea
  //           messages={messages}
  //           isSending={isSending}
  //           suggestions={SUGGESTIONS}
  //           onSuggestion={sendMessage}
  //           isGuest={false}
  //           messagesEndRef={messagesEndRef}
  //         />
  //       </div>
  //       <InputRow
  //         input={input}
  //         setInput={setInput}
  //         onSend={handleSend}
  //         isSending={isSending}
  //         textareaRef={textareaRef}
  //         isGuest={false}
  //       />
  //     </div>
  //   )
  // }

  // Floating / chat-only — Notion-style
  return (
    <div className={['ap-notion', className].filter(Boolean).join(' ')}>

      {/* ── Хедер: аватар + ім'я + close ── */}
      <div className="ap-notion__head">
        <div className="ap-notion__avatar">
          <AvaHead width={38} />
        </div>
        <div className="ap-notion__info">
          <p className="ap-notion__name">Starway AI</p>
          <p className="ap-notion__status">
            {isGuestMode ? 'запитуй будь-що' : 'онлайн'}
          </p>
        </div>
        <div className="ap-notion__actions-row">
          {showClose && (
            <button
              className="ap-notion__icon-btn"
              onClick={onClose}
              aria-label="Закрити"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Вкладки ── */}
      {showTabs && (
        <div className="ap-notion__tabs">
          <button
            className={`ap-notion__tab ${activeTab === 'chat' ? 'ap-notion__tab--active' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            Чат
          </button>
          {/* <button
            className={`ap-notion__tab ${activeTab === 'steps' ? 'ap-notion__tab--active' : ''}`}
            onClick={() => setActiveTab('steps')}
          >
            Кроки
            {readyCount > 0 && (
              <span className="ap-notion__tab-badge">{readyCount}</span>
            )}
          </button> */}
        </div>
      )}

      {/* ── Тіло ── */}
      <div className="ap-notion__body">
        {showTabs && activeTab === 'steps' ? (
          /* Steps tab */
          <div className="ap-notion__steps">
            {nextAction && (
              <p className="ap-notion__next-action">{nextAction}</p>
            )}
            {/* {steps.map(step => (
              <AssistantStepCard key={step.id} step={step} onAction={handleStepClick} />
            ))} */}
          </div>
        ) : (
          /* Chat */
          messages.length === 0 ? (
            /* Empty state — великий аватар + підказки як Notion */
            <div className="ap-notion__empty">
              <div className="ap-notion__empty-avatar">
                <AvaHead width={62} />
              </div>
              <p className="ap-notion__empty-title">
                {isGuestMode ? 'Привіт! Чим можу допомогти?' : 'Чим можу допомогти?'}
              </p>
              {isGuestMode && (
                <p className="ap-notion__empty-hint">
                  Зареєструйся щоб отримати персонального AI-продюсера
                </p>
              )}
              <div className="ap-notion__suggestions">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s.text}
                    className="ap-notion__suggestion"
                    onClick={() => sendMessage(s.text)}
                  >
                    <svg viewBox="0 0 16 16" fill="none">
                      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="ap-notion__messages">
              {messages.map((msg, i) => (
                <div key={i} className={`ap-notion__msg ap-notion__msg--${msg.role}`}>
                  {msg.role === 'assistant' && (
                    <span className="ap-notion__msg-mark">✦</span>
                  )}
                  <span>{msg.content}</span>
                </div>
              ))}
              {isSending && (
                <div className="ap-notion__msg ap-notion__msg--assistant">
                  <span className="ap-notion__msg-mark">✦</span>
                  <span className="ap-notion__dots">
                    <span /><span /><span />
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )
        )}
      </div>

      {/* ── Інпут ── */}
      <div className="ap-notion__input">
        <div className="ap-notion__input-row">
          <textarea
            ref={textareaRef}
            className="ap-notion__textarea"
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isGuestMode ? 'Запитай про платформу...' : 'Запитай AI...'}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <button
            className="ap-notion__send"
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            aria-label="Надіслати"
          >
            ↑
          </button>
        </div>
      </div>

    </div>
  )
}

// ── Внутрішні компоненти для static mode ──

interface MessagesAreaProps {
  messages: ChatMessage[]
  isSending: boolean
  suggestions: typeof SUGGESTIONS_AUTH
  onSuggestion: (t: string) => void
  isGuest: boolean
  messagesEndRef: React.RefObject<HTMLDivElement | null>
}
function MessagesArea({ messages, isSending, suggestions, onSuggestion, messagesEndRef }: MessagesAreaProps) {
  if (messages.length === 0) {
    return (
      <div className="ap-empty">
        <p className="ap-empty-title">Чим можу допомогти?</p>
        <div className="ap-suggestions">
          {suggestions.map(s => (
            <button key={s.text} className="ap-suggestion" onClick={() => onSuggestion(s.text)}>
              <span className="ap-suggestion-icon">→</span>{s.text}
            </button>
          ))}
        </div>
      </div>
    )
  }
  return (
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
  )
}

interface InputRowProps {
  input: string
  setInput: (v: string) => void
  onSend: () => void
  isSending: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  isGuest: boolean
}
function InputRow({ input, setInput, onSend, isSending, textareaRef, isGuest }: InputRowProps) {
  return (
    <div className="ap-input-row">
      <textarea
        ref={textareaRef}
        className="ap-textarea ap-textarea--main"
        rows={1}
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={isGuest ? 'Запитай про платформу...' : 'Запитай AI...'}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() }
        }}
      />
      <button
        className="ap-send"
        onClick={onSend}
        disabled={!input.trim() || isSending}
        aria-label="Надіслати"
      >↑</button>
    </div>
  )
}