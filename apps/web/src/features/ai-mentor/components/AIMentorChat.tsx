// features/ai-mentor/components/AIMentorChat.tsx
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/app/store'
import { useGetMentorContextQuery } from '../services/mentor.api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_HISTORY_LENGTH = 20 // обмежуємо контекст щоб не перевантажувати API

// ─── Sub-components ───────────────────────────────────────────────────────────

function MsgSkeleton() {
  return (
    <div className="flex gap-3 animate-pulse" aria-hidden="true">
      <div className="w-8 h-8 shrink-0 rounded-full bg-[var(--glass-bg)]" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-3 bg-[var(--glass-bg)] rounded w-3/4" />
        <div className="h-3 bg-[var(--glass-bg)] rounded w-1/2" />
      </div>
    </div>
  )
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Аватар */}
      <div
        aria-hidden="true"
        className={[
          'w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold',
          isUser
            ? 'accent-bg text-[var(--on-accent)]'
            : 'bg-[var(--glass-bg)] border border-[var(--border-glass)] text-[var(--accent)]',
        ].join(' ')}
      >
        {isUser ? 'Я' : '🤖'}
      </div>

      {/* Контент */}
      <div
        className={[
          'max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
          isUser
            ? 'rounded-tr-sm bg-[rgba(var(--accent-rgb),.15)] border border-[var(--border-accent)] text-[var(--text-primary)]'
            : 'rounded-tl-sm bg-[var(--glass-bg)] border border-[var(--border-glass)] text-[var(--text-secondary)]',
        ].join(' ')}
      >
        {msg.content}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AIMentorChat() {
  const userId = useSelector((s: RootState) => s.auth.user?.id ?? '')

  const { data: ctx, isLoading: ctxLoading } = useGetMentorContextQuery(userId, {
    skip: !userId,
  })

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [sendError, setSendError] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Авто-скрол до останнього повідомлення
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Авто-resize textarea під контент
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px` // max ~4 рядки
  }, [input])

  // Привітання від ментора після завантаження контексту
  useEffect(() => {
    if (!ctx) return

    const greeting = ctx.lastState
      ? `Стан: "${ctx.lastState}". Ціль: "${ctx.primaryGoal ?? 'не задана'}".`
      : 'Де ти зараз по шкалі 1–10?'

    setMessages([{ role: 'assistant', content: greeting }])
  }, [ctx])

  const authToken = useSelector((s: RootState) => s.auth.accessToken)

  const [streamingContent, setStreamingContent] = useState('')

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput('')
    setSendError(false)

    const userMsg: ChatMessage = { role: 'user', content: text }
    const history = [...messages, userMsg].slice(-MAX_HISTORY_LENGTH)
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)
    setStreamingContent('')

    try {
      const body = {
        messages: history,
        context: ctx ?? {},
      }

      const response = await fetch('/api/mentor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authToken ? `Bearer ${authToken}` : '',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok || !response.body) {
        throw new Error('Stream failed')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      stream: while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          try {
            const data = JSON.parse(payload)
            if (data.delta) {
              fullContent += data.delta
              setStreamingContent(fullContent)
            }
            if (data.done) {
              setMessages(prev => [...prev, { role: 'assistant', content: fullContent }])
              setStreamingContent('')
              break stream
            }
          } catch {
            // skip invalid chunks
          }
        }
      }
    } catch (error) {
      setSendError(true)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Помилка з’єднання. Спробуй ще раз.' },
      ])
    } finally {
      setIsStreaming(false)
      setStreamingContent('')
    }
  }, [input, isStreaming, messages, ctx, authToken])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter → відправити, Shift+Enter → новий рядок
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const isReady = !ctxLoading && !!userId

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Messages ── */}
      <div
        role="log"
        aria-label="Чат з ментором"
        aria-live="polite"
        className="flex-1 overflow-y-auto space-y-4 p-5"
      >
        {ctxLoading
          ? Array.from({ length: 3 }, (_, i) => <MsgSkeleton key={i} />)
          : messages.map((m, i) => <Bubble key={i} msg={m} />)}

        {isStreaming && (
          <div className="ap-msg ap-msg--assistant">
            <span className="ap-msg-mark">✦</span>
            <span className="ap-msg-text">
              {streamingContent || '...'}
              <span className="ap-burst" aria-hidden="true" />
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input ── */}
      <div className="border-t border-[var(--border-glass)] p-4">
        <div className="flex gap-3 liquid-glass p-2 rounded-2xl">
          <textarea
            ref={textareaRef}
            className="flex-1 bg-transparent resize-none text-sm text-[var(--text-primary)] outline-none py-1 min-h-[28px] max-h-[120px]"
            placeholder={isReady ? 'Напиши що відбувається...' : 'Завантаження...'}
            value={input}
            rows={1}
            disabled={!isReady}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Повідомлення ментору"
          />

          <button
            className="btn-primary px-4 py-2 rounded-xl text-sm disabled:opacity-50 shrink-0 transition-opacity"
            onClick={handleSend}
            disabled={!input.trim() || isStreaming || !isReady}
            aria-label={isStreaming ? 'Трансляція...' : 'Відправити'}
          >
            {isStreaming ? '...' : '→'}
          </button>
        </div>

        {/* Підказка Shift+Enter */}
        <p className="text-[10px] text-[var(--text-muted)] mt-1.5 px-2">
          Enter — відправити · Shift+Enter — новий рядок
        </p>
      </div>
    </div>
  )
}
