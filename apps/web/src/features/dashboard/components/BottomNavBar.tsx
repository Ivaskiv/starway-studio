import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface BottomNavBarProps {
  backLabel?: string
  backHref?: string
  onBack?: () => void
  nextLabel?: string
  nextHref?: string
  nextDisabled?: boolean
  centerText?: string
  onNext?: () => void
}

export function BottomNavBar({
  backLabel = 'Назад',
  backHref,
  onBack,
  nextLabel = 'Далі',
  nextHref,
  nextDisabled = false,
  centerText,
  onNext,
}: BottomNavBarProps) {
  const navigate = useNavigate()

  return (
    <div className="glass-card flex items-center justify-between gap-3 px-4 py-2.5">
      <button
        type="button"
        className="nav-btn-back"
        onClick={() => {
          if (backHref) navigate(backHref)
          else if (onBack) onBack()
          else navigate(-1)
        }}
      >
        <ChevronLeft className="h-4 w-4" />
        {backLabel}
      </button>

      <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
        {centerText ?? ''}
      </p>

      <button
        type="button"
        disabled={nextDisabled}
        className="nav-btn-next"
        onClick={() => {
          if (nextHref) navigate(nextHref)
          else onNext?.()
        }}
      >
        {nextLabel}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

export default BottomNavBar
