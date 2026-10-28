import { useState } from 'react'
import type { ReactNode } from 'react'
import type { ZoomCalendarSession } from '../../zoom.types'
import { useGetCoachParticipantsQuery } from '../../zoom.api'

function CoachMetricCard({
  label,
  value,
  caption,
}: {
  label: string
  value: ReactNode
  caption?: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.045] px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <p className="text-[9px] text-white/55">{label}</p>
      <p className="mt-1 text-xl font-semibold leading-none text-white">{value}</p>
      {caption && <p className="mt-1 truncate text-[9px] text-white/45">{caption}</p>}
    </div>
  )
}
export function CoachParticipantsSummary() {
  const { data, isLoading, isError } = useGetCoachParticipantsQuery()
  const [search, setSearch] = useState('')
  const participants = data?.participants.filter((participant) => participant.displayName.toLowerCase().includes(search.trim().toLowerCase())) ?? []
  return <section id="participants" className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4 scroll-mt-4">
    <h2 className="text-lg font-semibold text-white">УЧАСНИКИ</h2>
    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Пошук" className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-white" />
    {isLoading ? <p className="mt-4 text-sm text-white/55">Завантажуємо учасників…</p> : isError ? <p className="mt-4 text-sm text-red-200">Не вдалося завантажити учасників.</p> : <><div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/65"><span>Активні у ФОКУСІ: {data?.summary.activeFocusCount ?? 0}</span><span>Нові цього тижня: {data?.summary.newThisWeekCount ?? 0}</span></div>{participants.length ? <div className="mt-4 space-y-2">{participants.map((participant) => <div key={participant.id} className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-3"><p className="font-medium text-white">{participant.displayName}</p><p className="mt-1 text-xs text-white/55">ФОКУС: {participant.focusActive ? 'активний' : 'неактивний'}<br />Zoom: {participant.zoomStatus}<br />Остання точка: {participant.lastPoint ?? '—'}</p></div>)}</div> : <p className="mt-4 text-sm text-white/45">Учасників не знайдено.</p>}</>}
  </section>
}

export function CoachAnalyticsSummary({ sessions, attendeeCount, activeBattles }: { sessions: ZoomCalendarSession[]; attendeeCount: number; activeBattles: number }) {
  return <section id="analytics" className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4 scroll-mt-4">
    <h2 className="text-lg font-semibold text-white">АНАЛІТИКА</h2>
    <p className="mt-1 text-sm text-white/55">Поточний тиждень Zoom</p>
    <div className="mt-4 grid grid-cols-3 gap-2"><CoachMetricCard label="Сесій" value={sessions.length} caption="у календарі" /><CoachMetricCard label="Учасників" value={attendeeCount} caption="у сесіях" /><CoachMetricCard label="Battle" value={activeBattles} caption="активні" /></div>
  </section>
}

export function CoachMoreSummary() {
  return <section id="more" className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4 scroll-mt-4">
    <h2 className="text-lg font-semibold text-white">ЩЕ</h2>
    <p className="mt-2 text-sm leading-6 text-white/55">Додаткові робочі інструменти коуча доступні у Telegram-меню. Календар і доступність залишаються в цьому Mini App.</p>
  </section>
}
