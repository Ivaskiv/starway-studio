import { Link } from 'react-router-dom'

interface WeeklyReportCardProps {
  title: string
  summary: string
  href: string
}

export function WeeklyReportCard({ title, summary, href }: WeeklyReportCardProps) {
  return (
    <section className="glass-card border border-[rgba(92,136,255,0.16)] bg-[linear-gradient(180deg,rgba(34,68,138,0.38),rgba(10,18,36,0.92))] p-5 shadow-[0_22px_60px_rgba(8,15,32,0.32)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
        Weekly
      </p>
      <h2 className="mt-3 text-xl font-semibold text-white">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-white/72">{summary}</p>
      <Link to={href} className="nav-btn-next mt-5 inline-flex">
        Відкрити звіт
      </Link>
    </section>
  )
}

export default WeeklyReportCard
