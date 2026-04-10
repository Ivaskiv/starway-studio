import { createPortal } from 'react-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { SALES_GUIDE_SECTIONS } from '../constants/assistantGuides'
import type { AssistantMode } from '../lib/assistantBridge'
import { onOpenGlobalAssistant } from '../lib/assistantBridge'
import { useSendAssistantMessageMutation } from '../services/assistant.api'
import { logAssistantEvent } from '../utils/assistantAnalytics'
import AssistantBubble from './AssistantBubble'
import { AssistantPanel } from './AssistantPanel'

type ChatMessage = { role: 'user' | 'assistant'; content: string }

export default function GlobalAssistant() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()
  const [open, setOpen] = useState(false)
  const [activeMode, setActiveMode] = useState<AssistantMode>('product_assistant')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sendAssistantMessage, { isLoading: isSending }] = useSendAssistantMessageMutation()

  const role = String((user as { role?: string } | null)?.role ?? '').toUpperCase()
  const isStandaloneMiniAppRoute = location.pathname.startsWith('/miniapp')
  const isContentMachinePage = location.pathname.startsWith('/dashboard')
    && new URLSearchParams(location.search).get('section') === 'content'

  const handleToggle = useCallback(() => {
    const next = !open
    setOpen(next)
    if (next && isContentMachinePage) {
      setActiveMode('sales_guide')
    }
    logAssistantEvent(next ? 'assistant_opened' : 'assistant_closed')
  }, [open, isContentMachinePage])

  const handleClose = useCallback(() => {
    setOpen(false)
    logAssistantEvent('assistant_closed')
  }, [])

  const handleAction = useCallback((action: string) => {
    logAssistantEvent('assistant_action', { action })

    switch (action) {
      case 'open_content_machine': navigate('/dashboard?section=content'); break
      case 'open_mentor': navigate('/dashboard/ai-mentor'); break
      case 'open_morning': navigate('/dashboard/cycle?session=morning'); break
      case 'open_evening': navigate('/dashboard/cycle?session=evening'); break
      case 'open_wheel': navigate('/dashboard/wheel'); break
      case 'open_progress': navigate('/dashboard/progress'); break
      case 'open_students': navigate('/dashboard/students'); break
      case 'open_system': navigate('/dashboard?section=system'); break
      case 'open_telegram': navigate('/dashboard/telegram'); break
      case 'open_roles': navigate('/dashboard/admin/roles'); break
      case 'open_revenue': navigate('/dashboard/admin/revenue'); break
      case 'open_products': navigate('/dashboard/products'); break
      case 'open_seo': navigate('/dashboard/ai-seo'); break
      default: break
    }

    handleClose()
  }, [navigate, handleClose])

  useEffect(() => {
    return onOpenGlobalAssistant((detail) => {
      setOpen(true)
      if (detail.mode) {
        setActiveMode(detail.mode)
      } else if (isContentMachinePage) {
        setActiveMode('sales_guide')
      }

      const prompt = typeof detail.prompt === 'string' ? detail.prompt.trim() : ''
      if (prompt) {
        setMessages((current) => [...current, { role: 'assistant', content: prompt }])
      }

      logAssistantEvent('assistant_opened', { source: 'bridge', mode: detail.mode ?? 'product_assistant' })
    })
  }, [isContentMachinePage])

  const isGuestMode = !isAuthenticated

  const modeTabs = useMemo(() => {
    const base: Array<{ id: AssistantMode; label: string }> = [
      { id: 'product_assistant', label: 'Асистент' },
      { id: 'chat', label: 'Чат' },
      { id: 'quick_actions', label: 'Дії' },
    ]

    if (!isGuestMode) {
      base.splice(1, 0, { id: 'sales_guide', label: 'Гід продажу' })
    }

    if (role === 'USER' && !isContentMachinePage) {
      return base.filter((tab) => tab.id !== 'sales_guide')
    }

    return base
  }, [isGuestMode, role, isContentMachinePage])

  const quickActions = useMemo(() => {
    if (role === 'SUPERADMIN') {
      return [
        { id: 'content', label: 'Content Machine', description: 'Контент, реклама, CTA і sales flow продукту.', action: 'open_content_machine' },
        { id: 'revenue', label: 'Аналітика платформи', description: 'Усі коучі, учні, воронка та дохід.', action: 'open_revenue' },
        { id: 'roles', label: 'Ролі доступу', description: 'Призначення ролей і контроль доступів.', action: 'open_roles' },
        { id: 'system', label: 'Система', description: 'Операційні блоки, сигнали й внутрішні налаштування.', action: 'open_system' },
      ] as const
    }

    if (role === 'ADMIN') {
      return [
        { id: 'content', label: 'Content Machine', description: 'Контент, CTA, запуск і керування пакетами.', action: 'open_content_machine' },
        { id: 'system', label: 'Система', description: 'Операційні блоки, сигнали та внутрішні сценарії.', action: 'open_system' },
        { id: 'telegram', label: 'Telegram', description: 'Бот, канали, нагадування і статуси доставки.', action: 'open_telegram' },
        { id: 'mentor', label: 'ABsystem', description: 'Відкрити робочий контур продукту та його сценарії.', action: 'open_mentor' },
      ] as const
    }

    if (role === 'EXPERT') {
      return [
        { id: 'content', label: 'Content Machine', description: 'Контент, реклама, CTA і шлях у DM.', action: 'open_content_machine' },
        { id: 'students', label: 'Користувачі', description: 'Учні, активність, ризики й дотики коуча.', action: 'open_students' },
        { id: 'products', label: 'Мої продукти', description: 'Продукти, пакети й актуальні офери.', action: 'open_products' },
        { id: 'telegram', label: 'Telegram', description: 'Підключення бота, канали і сценарії повідомлень.', action: 'open_telegram' },
        { id: 'seo', label: 'SEO', description: 'Контентні точки росту і пошукові сигнали.', action: 'open_seo' },
      ] as const
    }

    return [
      { id: 'mentor', label: 'ABsystem', description: 'Постав питання або відкрий свій діалог.', action: 'open_mentor' },
      { id: 'morning', label: 'Ранкова сесія', description: 'Почати день із фокусом і напрямком.', action: 'open_morning' },
      { id: 'progress', label: 'Прогрес', description: 'Подивитися картину руху й аналітику.', action: 'open_progress' },
      { id: 'wheel', label: 'Колесо балансу', description: 'Швидкий вхід у самодіагностику.', action: 'open_wheel' },
    ] as const
  }, [role])

  const productSuggestions = useMemo(() => {
    if (isGuestMode) {
      return [
        { icon: '→', text: 'Що дає ABsystem?' },
        { icon: '→', text: 'Що входить у підписку?' },
        { icon: '→', text: 'З чого почати в Starway?' },
      ] as const
    }

    if (isContentMachinePage) {
      return [
        { icon: '→', text: 'Який крок Content Machine зараз головний?' },
        { icon: '→', text: 'Який CTA тут найкращий?' },
        { icon: '→', text: 'Як цей контент вести в DM і trial?' },
      ] as const
    }

    return [
      { icon: '→', text: 'Який мій наступний крок у продукті?' },
      { icon: '→', text: 'Що зараз найслабше у моєму русі?' },
      { icon: '→', text: 'Який інструмент Starway відкрити зараз?' },
    ] as const
  }, [isGuestMode, isContentMachinePage])

  const assistantChat = {
    messages,
    sendMessage: async (text: string) => {
      setMessages((current) => [...current, { role: 'user', content: text }])

      try {
        const result = await sendAssistantMessage({ message: text }).unwrap() as {
          message?: string
          meta?: {
            nextProduct?: { productId: string; name: string; reason: string } | null
            weeklyInsight?: Record<string, unknown>
          }
        }

        const fallbackMessage = buildAssistantFallbackReply({
          text,
          mode: activeMode,
          role,
          nextProduct: result.meta?.nextProduct ?? null,
          weeklyInsight: result.meta?.weeklyInsight ?? null,
        })

        setMessages((current) => [
          ...current,
          {
            role: 'assistant',
            content: typeof result.message === 'string' && result.message.trim()
              ? result.message.trim()
              : fallbackMessage,
          },
        ])
      } catch {
        setMessages((current) => [
          ...current,
          {
            role: 'assistant',
            content: activeMode === 'sales_guide'
              ? 'Почни з контексту, пропиши ціль, офер і CTA. Якщо хочеш, я підкажу hook, payload або наступний крок у воронці.'
              : 'Я поруч. Напиши, що хочеш зрозуміти, або відкрий швидку дію, якщо вже знаєш наступний крок.',
          },
        ])
      }
    },
    isSending,
  }

  const guestChat = {
    messages: [] as ChatMessage[],
    sendMessage: async () => undefined,
    isSending: false,
  }

  const activeChat = isGuestMode ? guestChat : assistantChat

  if (isStandaloneMiniAppRoute) {
    return null
  }

  return createPortal(
    <>
      {open ? (
        <div
          className="assistant-overlay"
          onClick={handleClose}
          aria-hidden="true"
        />
      ) : null}

      {open ? (
        <div className="assistant-panel-wrap">
          <AssistantPanel
            isOpen={open}
            onClose={handleClose}
            messages={activeChat.messages}
            sendMessage={activeChat.sendMessage}
            isSending={activeChat.isSending}
            mode={isGuestMode ? 'chat-only' : 'floating'}
            showClose
            onAction={!isGuestMode ? handleAction : undefined}
            titleOverride={activeMode === 'sales_guide' ? 'Starway · Гід продажу' : 'Starway Assistant'}
            statusOverride={
              activeMode === 'sales_guide'
                ? 'веду по кроках Content Machine'
                : activeMode === 'quick_actions'
                  ? role === 'SUPERADMIN'
                    ? 'відкриваю робочі панелі платформи'
                    : role === 'ADMIN'
                      ? 'відкриваю операційні інструменти'
                      : role === 'EXPERT'
                        ? 'відкриваю інструменти коуча'
                        : 'відкриваю потрібний інструмент'
                  : isGuestMode
                    ? 'запитуй будь-що'
                    : 'онлайн'
            }
            inputPlaceholder={
              activeMode === 'sales_guide'
                ? 'Запитай про hook, CTA, payload або наступний крок…'
                : activeMode === 'product_assistant'
                  ? 'Запитай, що робити далі…'
                  : undefined
            }
            modeTabs={modeTabs}
            activeMode={activeMode}
            onModeChange={setActiveMode}
            guideSections={activeMode === 'sales_guide' ? SALES_GUIDE_SECTIONS : []}
            quickActions={quickActions}
            suggestionsOverride={activeMode === 'product_assistant' ? productSuggestions : undefined}
            hideInput={activeMode === 'quick_actions'}
          />
        </div>
      ) : null}

      <AssistantBubble
        onClick={handleToggle}
        hasUnread={!isGuestMode && activeChat.messages.length > 0}
      />
    </>,
    document.body,
  )
}

function buildAssistantFallbackReply({
  text,
  mode,
  role,
  nextProduct,
  weeklyInsight,
}: {
  text: string
  mode: AssistantMode
  role: string
  nextProduct: { productId: string; name: string; reason: string } | null
  weeklyInsight: Record<string, unknown> | null
}) {
  const normalized = text.trim().toLowerCase()
  const summary = typeof weeklyInsight?.summary === 'string' ? weeklyInsight.summary : null
  const nextOffer = typeof weeklyInsight?.nextOffer === 'string' ? weeklyInsight.nextOffer : null

  if (mode === 'sales_guide') {
    if (normalized.includes('cta')) {
      return 'Сильний CTA тут має вести не в абстрактний “подивись”, а в конкретну дію: DM, bot, trial або Zoom. Формула проста: дієслово + наступний результат.'
    }
    if (normalized.includes('payload')) {
      return 'Telegram payload потрібен, щоб бачити, який hook і формат реально привів людину в bot, trial і оплату. Тримай його коротким і читабельним.'
    }
    return 'У цій системі йди так: контекст → сценарій → формула → тексти → CTA → payload → DM entry. Якщо хочеш, я допоможу з конкретним кроком.'
  }

  if (normalized.includes('наступ') || normalized.includes('далі')) {
    if (nextProduct) {
      return `Твій найкращий наступний крок зараз — ${nextProduct.name}. Якщо хочеш, я підкажу, як швидко перейти саме туди.`
    }
    if (summary) {
      return `Зараз я бачу таку картину: ${summary}`
    }
    if (role === 'SUPERADMIN') {
      return 'Наступний крок для тебе варто обирати з операційних панелей: аналітика платформи, ролі доступу, система або Content Machine.'
    }
    if (role === 'ADMIN') {
      return 'Наступний крок для тебе варто обирати з операційних блоків: система, Telegram, Content Machine або робочий контур ABsystem.'
    }
    if (role === 'EXPERT') {
      return 'Наступний крок для тебе варто обирати з коуч-панелей: користувачі, продукти, Telegram, Content Machine або SEO.'
    }
    return 'Наступний крок варто обирати з того, що зараз дасть найбільший рух: ABsystem, ранкова сесія, Content Machine або прогрес.'
  }

  if (nextOffer) {
    return `Я б звернув увагу на це: ${nextOffer}`
  }

  return 'Я можу допомогти в трьох речах: пояснити крок, відкрити потрібний інструмент або підказати, що зараз дасть найбільший результат.'
}
