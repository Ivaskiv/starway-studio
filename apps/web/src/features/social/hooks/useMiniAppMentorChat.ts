import { useEffect, useRef, useState } from 'react'

import { miniAppFetch } from '@/lib/miniapp/apiClient'
import type { MiniAppChatMessage } from '@/features/social/types/miniapp'

const INITIAL_MESSAGES: MiniAppChatMessage[] = [
  { role: 'ai', text: 'Привіт. Я твій асистент. Допоможу пройти шлях до результату.' },
]

interface UseMiniAppMentorChatOptions {
  userId: string
  context?: string | null
}

const CONTEXT_PROMPTS: Record<string, string> = {
  morning: 'Починаємо ранкову рефлексію. Яка твоя головна ціль на сьогодні?',
  evening: 'Час підбити підсумок дня. Що сьогодні вдалось і що забереш у завтра?',
}

export function useMiniAppMentorChat({ userId, context }: UseMiniAppMentorChatOptions) {
  const [chatMessages, setChatMessages] = useState<MiniAppChatMessage[]>(INITIAL_MESSAGES)
  const [chatInput, setChatInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const handledContextRef = useRef<string | null>(null)

  const sendTextMessage = async (rawText: string) => {
    if (!rawText.trim() || isSending) return
    const text = rawText.trim()

    setChatInput('')
    setChatMessages((messages) => [...messages, { role: 'user', text }])
    setIsSending(true)

    try {
      const data = await miniAppFetch<{
        message?: string
        mentorMessage?: { content?: string }
        reply?: string
      }>('/api/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      })

      const reply =
        data.message ??
        data.mentorMessage?.content ??
        data.reply ??
        'Дякую за твою відповідь 🌱'

      setChatMessages((messages) => [...messages, { role: 'ai', text: reply }])
    } catch (error) {
      console.error('[MiniAppMentorChat] assistant unavailable', {
        userId,
        context,
        message: text,
        error: error instanceof Error ? error.message : String(error),
      })
      setChatMessages((messages) => [
        ...messages,
        {
          role: 'ai',
          text: 'Асистент тимчасово недоступний. Спробуй через кілька хвилин.',
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  const sendMessage = async () => {
    await sendTextMessage(chatInput)
  }

  useEffect(() => {
    if (!context || !CONTEXT_PROMPTS[context]) return
    if (handledContextRef.current === context) return
    handledContextRef.current = context
    void sendTextMessage(CONTEXT_PROMPTS[context])
  }, [context])

  return {
    chatInput,
    chatMessages,
    isSending,
    sendMessage,
    setChatInput,
  }
}
