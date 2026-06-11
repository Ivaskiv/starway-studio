import { useEffect, useRef, useState } from 'react';
import { AvaHead } from './AvaAssistant';
// import { AssistantStepCard } from './AssistantStepCard'
import type { AssistantStep } from '../types/assistant.types';
import type { AssistantMode } from '../lib/assistantBridge';

type ChatMessage = { role: 'user' | 'assistant'; content: string }
type AssistantModeTab = { id: AssistantMode; label: string }
type AssistantGuideSection = { title: string; points: readonly string[] }
type AssistantQuickAction = { id: string; label: string; description: string; action: string }

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
  titleOverride?: string
  statusOverride?: string
  inputPlaceholder?: string
  modeTabs?: AssistantModeTab[]
  activeMode?: AssistantMode
  onModeChange?: (mode: AssistantMode) => void
  guideSections?: readonly AssistantGuideSection[]
  quickActions?: readonly AssistantQuickAction[]
  suggestionsOverride?: readonly { icon: string; text: string }[]
  hideInput?: boolean
}

const SUGGESTIONS_AUTH = [
  { icon: '→', text: 'Який мій наступний крок?' },
  { icon: '→', text: 'Як налаштувати воронку?' },
  { icon: '→', text: 'Що таке продюсер-асистент?' },
  { icon: '→', text: 'Як зростати швидше?' },
]

const SUGGESTIONS_GUEST = [
  { icon: '→', text: 'Як працює платформа?' },
  { icon: '→', text: 'Що таке колесо балансу?' },
  { icon: '→', text: 'Як запустити воронку?' },
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
  titleOverride,
  statusOverride,
  inputPlaceholder,
  modeTabs = [],
  activeMode = 'chat',
  onModeChange,
  guideSections = [],
  quickActions = [],
  suggestionsOverride,
  hideInput = false,
}: Props) {
  const [input, setInput] = useState('')
  const [activeTab, setActiveTab] = useState<'chat' | 'steps'>('chat')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const isGuestMode = mode === 'chat-only'
  const hasSteps = steps.length > 0
  const showTabs = mode === 'floating' && (modeTabs.length > 1 || hasSteps)
  const SUGGESTIONS = suggestionsOverride ?? (isGuestMode ? SUGGESTIONS_GUEST : SUGGESTIONS_AUTH)
  const readyCount = steps.filter(s => s.status === 'ready').length

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  useEffect(() => {
    if (!isOpen) return
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 120)
    return () => window.clearTimeout(timer)
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
          <p className="ap-notion__name">{titleOverride ?? 'Starway Mentor'}</p>
          <p className="ap-notion__status">
            {statusOverride ?? (isGuestMode ? 'запитуй будь-що' : 'онлайн')}
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
          {modeTabs.length > 0 ? (
            modeTabs.map((tab) => (
              <button
                key={tab.id}
                className={`ap-notion__tab ${activeMode === tab.id ? 'ap-notion__tab--active' : ''}`}
                onClick={() => onModeChange?.(tab.id)}
              >
                {tab.label}
              </button>
            ))
          ) : (
            <button
              className={`ap-notion__tab ${activeTab === 'chat' ? 'ap-notion__tab--active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              Чат
            </button>
          )}
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
        {activeMode === 'sales_guide' ? (
          <div className="space-y-3 p-4">
            {guideSections.map((section) => (
              <div key={section.title} className="rounded-[14px] border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{section.title}</p>
                <div className="mt-2 space-y-2">
                  {section.points.map((point) => (
                    <p key={point} className="text-[13px] leading-6 text-[var(--text-muted)]">
                      {point}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : activeMode === 'quick_actions' ? (
          <div className="ap-notion__empty">
            <p className="ap-notion__empty-title">Швидкі дії</p>
            <div className="ap-notion__suggestions">
              {quickActions.map((action) => (
                <button
                  key={action.id}
                  className="ap-notion__suggestion"
                  onClick={() => onAction?.(action.action)}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[var(--text-primary)]">{action.label}</div>
                    <div className="mt-1 text-xs text-[var(--text-muted)]">{action.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : showTabs && activeTab === 'steps' ? (
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
                  Зареєструйся щоб отримати персонального асистента
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
      {!hideInput ? (
      <div className="ap-notion__input">
        <div className="ap-notion__input-row">
          <textarea
            ref={textareaRef}
            className="ap-notion__textarea"
            rows={1}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={inputPlaceholder ?? (isGuestMode ? 'Запитай про платформу...' : 'Запитай ментора...')}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
              e.stopPropagation()
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
      ) : null}

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
      <div ref={messagesEndRef as unknown as React.Ref<HTMLDivElement>} />
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
        ref={textareaRef as unknown as React.Ref<HTMLTextAreaElement>}
        className="ap-textarea ap-textarea--main"
        rows={1}
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder={isGuest ? 'Запитай про платформу...' : 'Запитай ментора...'}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() }
          e.stopPropagation()
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
