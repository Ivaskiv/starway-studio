type PrimaryCtaButtonProps = {
  label: string
  onClick?: () => void
  type?: 'button' | 'submit'
  className?: string
}

export default function PrimaryCtaButton({
  label,
  onClick,
  type = 'button',
  className = '',
}: PrimaryCtaButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`cta-btn ${className}`.trim()}
    >
      {label}
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <line x1="3" y1="8" x2="13" y2="8" />
        <polyline points="9,4 13,8 9,12" />
      </svg>
    </button>
  )
}
