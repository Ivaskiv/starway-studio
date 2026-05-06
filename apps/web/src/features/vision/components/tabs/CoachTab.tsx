import { useSendAssistantMessageMutation } from "@/features/assistant/services/assistant.api"
import type { ChatMessage } from "@/features/modules/types/modules.types"
import { Button, Textarea } from "@/ui"
import { useState } from "react"

type CoachTabProps = {
  initialMessages?: ChatMessage[]
}

export function CoachTab({ initialMessages = [] }: CoachTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [send, { isLoading }] = useSendAssistantMessageMutation()

  const handleSend = async () => {
    if (!input.trim()) return

    const createdAt = new Date().toISOString()
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      createdAt,
    }
    setMessages(p => [...p, userMsg])
    setInput('')

    const res = await send({ message: input }).unwrap()
    const assistantContent =
      res && typeof res === 'object' && 'message' in res && typeof res.message === 'string'
        ? res.message
        : ''

    setMessages(p => [
      ...p,
      {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: assistantContent,
        createdAt: new Date().toISOString(),
      },
    ])
  }

  return (
    <div>
      {messages.map(m => <div key={m.id}>{m.content}</div>)}

      <Textarea value={input} onChange={e => setInput(e.target.value)} />

      <Button onClick={handleSend} loading={isLoading}>
        Send
      </Button>
    </div>
  )
}
