import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

interface DayCardProps {
  title: string
  emoji: string
  href: string
  status: 'done' | 'active' | 'locked'
  description: string
  dotClassName: string
}

export function DayCard({ title, emoji, href, status, description, dotClassName }: DayCardProps) {
  return (
    <Link
      to={href}
      className="glass-card block border border-[rgba(92,136,255,0.16)] bg-[linear-gradient(180deg,rgba(28,56,119,0.42),rgba(10,18,36,0.9))] p-4 shadow-[0_18px_48px_rgba(8,15,32,0.26)] transition-transform duration-200 hover:-translate-y-0.5 hover:border-[rgba(119,164,255,0.28)]"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-lg">{emoji}</span>
          <div>
            <p className="text-sm font-semibold text-white">{title}</p>
            <p className="text-xs text-white/62">{description}</p>
          </div>
        </div>
        <span className={`h-2.5 w-2.5 rounded-full ${dotClassName}`} />
      </div>
      <div className="mt-4 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[rgb(var(--accent-soft-rgb))]">
        <span>{status === 'done' ? 'Done' : status === 'active' ? 'Active' : 'Locked'}</span>
        <ArrowRight className="h-4 w-4" />
      </div>
    </Link>
  )
}

export default DayCard
