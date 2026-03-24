import { useState } from 'react'

import type { MiniAppChatMessage } from '@/features/social/types/miniapp'

const INITIAL_MESSAGES: MiniAppChatMessage[] = [
  { role: 'ai', text: 'Привіт. Я твій асистент. Допоможу пройти шлях до результату.' },
]

interface UseMiniAppMentorChatOptions {
  userId: string
}

export function useMiniAppMentorChat({ userId }: UseMiniAppMentorChatOptions) {
  const [chatMessages, setChatMessages] = useState<MiniAppChatMessage[]>(INITIAL_MESSAGES)
  const [chatInput, setChatInput] = useState('')
  const [isSending, setIsSending] = useState(false)

  const sendMessage = async () => {
    if (!chatInput.trim() || isSending) return
    const text = chatInput.trim()

    setChatInput('')
    setChatMessages((messages) => [...messages, { role: 'user', text }])
    setIsSending(true)

    try {
      const token = localStorage.getItem('starway_access_token') ?? ''
      const response = await fetch('/api/mentor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text, userId }),
      })

      const data = (await response.json()) as {
        mentorMessage?: { content?: string }
        reply?: string
      }

      const reply =
        data.mentorMessage?.content ??
        data.reply ??
        'Дякую за твою відповідь 🌱'

      setChatMessages((messages) => [...messages, { role: 'ai', text: reply }])
    } catch {
      setChatMessages((messages) => [
        ...messages,
        {
          role: 'ai',
          text: 'Зараз не можу відповісти. Спробуй пізніше.',
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  return {
    chatInput,
    chatMessages,
    isSending,
    sendMessage,
    setChatInput,
  }
}
