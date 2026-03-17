// frontend/src/features/assistant/components/AssistantBubble.tsx
import { AvaHead } from './AvaAssistant'

interface Props {
  onClick: () => void
  hasUnread?: boolean
  className?: string
}

export default function AssistantBubble({ onClick, hasUnread, className }: Props) {
  return (
    <button
      onClick={onClick}
      className={['ava-bubble', className].filter(Boolean).join(' ')}
      type="button"
      aria-label="Відкрити AI-помічника"
    >
      <div className="ava-bubble__bg" />
      <AvaHead width={44} />
      {hasUnread && <span className="ava-bubble__dot" />}
    </button>
  )
}
