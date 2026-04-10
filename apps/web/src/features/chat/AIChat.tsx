import { Flame, SendHorizontal, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { cn } from '@/lib/utils'

type UserLevel = 'Seeker' | 'Builder' | 'Master' | 'Legend' | string

type AIMessage = {
  id: string
  role: 'assistant' | 'user'
  content: string
}

export interface AIChatProps {
  userId: string
  userName: string
  userLevel: string
  userXP: number
  xpToNext: number
  streakDays: number
}

const LEVEL_ORDER = ['Seeker', 'Builder', 'Master', 'Legend'] as const

const QUICK_REPLIES = [
  { id: 'money', label: '💰 Гроші' },
  { id: 'energy', label: '⚡ Енергія' },
  { id: 'growth', label: '📈 Розвиток' },
  { id: 'goal', label: '🎯 Ціль' },
] as const

function getNextLevel(currentLevel: UserLevel) {
  const index = LEVEL_ORDER.findIndex(level => level === currentLevel)
  if (index === -1) return 'Builder'
  return LEVEL_ORDER[Math.min(index + 1, LEVEL_ORDER.length - 1)]
}

function buildGreeting(userName: string) {
  return `Привіт, ${userName}! Готовий до ранкової рефлексії?\nЩо зараз найбільше потребує твоєї уваги — гроші, енергія чи розвиток?`
}

function buildMentorReply(level: UserLevel, xpToNext: number) {
  const nextLevel = getNextLevel(level)
  return `Відмінно! Ти на рівні ${level} — до ${nextLevel} залишилось ${xpToNext} XP.\nРекомендую сьогодні пройти практику "Без ілюзій" 🎯`
}

function genericReply(topic: string, level: UserLevel, streakDays: number) {
  return `Бачу, що зараз у фокусі ${topic.toLowerCase()}. Ти вже тримаєш ритм на рівні ${level}, а streak ${streakDays} дн. дає хорошу опору. Пропоную одну чесну дію без перевантаження — і далі рухаємось.`
}

export default function AIChat({
  userId,
  userName,
  userLevel,
  userXP,
  xpToNext,
  streakDays,
}: AIChatProps) {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [draft, setDraft] = useState('')

  const greeting = useMemo(() => buildGreeting(userName), [userName])
  const nextLevel = useMemo(() => getNextLevel(userLevel), [userLevel])

  useEffect(() => {
    setMessages([{ id: `greeting-${userId}`, role: 'assistant', content: greeting }])
  }, [greeting, userId])

  const pushUserAndAssistant = (userText: string, assistantText: string) => {
    setMessages(prev => [
      ...prev,
      { id: `user-${prev.length + 1}`, role: 'user', content: userText },
      { id: `assistant-${prev.length + 2}`, role: 'assistant', content: assistantText },
    ])
  }

  const handleQuickReply = (reply: (typeof QUICK_REPLIES)[number]) => {
    if (reply.id === 'growth') {
      pushUserAndAssistant(reply.label, buildMentorReply(userLevel, xpToNext))
      return
    }
    pushUserAndAssistant(reply.label, genericReply(reply.label, userLevel, streakDays))
  }

  const handleSend = () => {
    const text = draft.trim()
    if (!text) return
    pushUserAndAssistant(text, genericReply('твоя тема', userLevel, streakDays))
    setDraft('')
  }

  return (
    <div className="ios-glass overflow-hidden">
      <div className="border-b border-[var(--glass-border)] px-4 py-4">
        <div className="flex items-center gap-3">
          <span className="miniapp-aichat__avatar" aria-hidden="true">M</span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-[var(--text-primary)]">Starway Mentor</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-xs font-semibold text-[rgb(var(--accent-soft-rgb))]">● Онлайн</span>
              <span className="text-xs font-semibold text-[var(--text-secondary)]">{userLevel}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="miniapp-aichat__status">
            <Flame className="h-3.5 w-3.5" />
            🔥 День {streakDays} поспіль!
          </span>
          <span className="miniapp-aichat__status miniapp-aichat__status--accent">
            <Sparkles className="h-3.5 w-3.5" />
            {userXP} XP · до {nextLevel} {xpToNext}
          </span>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <div className="space-y-3">
          {messages.map(message => (
            <div
              key={message.id}
              className={cn(
                'miniapp-aichat__bubble',
                message.role === 'user'
                  ? 'miniapp-aichat__bubble--user'
                  : 'miniapp-aichat__bubble--assistant',
              )}
            >
              {message.content}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_REPLIES.map(reply => (
            <button
              key={reply.id}
              type="button"
              onClick={() => handleQuickReply(reply)}
              className="hero-cta-secondary rounded-full px-4 py-2 text-xs font-semibold"
            >
              {reply.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <div className="miniapp-aichat__input-wrap">
            <textarea
              value={draft}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  handleSend()
                }
                event.stopPropagation()
              }}
              placeholder="Напиши, що зараз у фокусі..."
              rows={1}
              className="miniapp-aichat__input"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!draft.trim()}
              className="miniapp-aichat__send"
              aria-label="Надіслати повідомлення"
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
