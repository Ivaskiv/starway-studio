// frontend/src/features/assistant/components/AssistantBubble.tsx

interface Props {
  onClick: () => void
  hasUnread?: boolean
  className?: string
}

function AIJewelerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
      <path
        d="m12 3.75 1.85 4.55 4.9 1.1-3.7 3.2.45 4.9L12 15.8l-3.5 1.7.45-4.9-3.7-3.2 4.9-1.1L12 3.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 7.25v9.5M8.75 10.4 15.25 13.6"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
        opacity="0.42"
      />
    </svg>
  )
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
      aria-label="Відкрити AI-помічника"
    >
      <div className="ava-bubble__bg" />
      <span className="ava-bubble__icon">
        <AIJewelerIcon />
      </span>
      {hasUnread && <span className="ava-bubble__dot" />}
    </button>
  )
}
