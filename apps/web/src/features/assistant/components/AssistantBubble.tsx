// frontend/src/features/assistant/components/AssistantBubble.tsx

import StarwayMark from '@/ui/StarwayMark'

interface Props {
  onClick: () => void
  hasUnread?: boolean
  className?: string
}

export default function AssistantBubble({ 
  onClick, 
  hasUnread, 
  className 
}: Props) {
  return (
    <button
      onClick={onClick}
      className={['ava-bubble', className].filter(Boolean).join(' ')}
      type="button"
      aria-label="Відкрити помічника"
    >
      <span className="ava-bubble__icon">
        <StarwayMark size={28} className="ava-bubble__mark" />
      </span>
      {hasUnread && <span className="ava-bubble__dot" />}
    </button>
  )
}
