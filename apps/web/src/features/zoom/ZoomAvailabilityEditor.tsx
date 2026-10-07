import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarClock, ChevronLeft, ChevronRight, Info, Pencil, RotateCcw, UserRound, UsersRound, X } from 'lucide-react'
import { BaseModal } from '@/features/modals/BaseModal'
import { useGetAvailabilityQuery, useGetAvailabilityWeekQuery, useSaveAvailabilityMutation, useSaveAvailabilityWeekMutation } from './zoom.api'
import type { AvailabilitySlot, AvailabilityWeekChange, AvailabilityWeekDay, ZoomCalendarSession } from './zoom.types'
import { addKyivDays, getKyivDateKey, getKyivWeekRange } from './utils/zoomDateTime.utils'

const DAYS = ['Неділя', 'Понеділок', 'Вівторок', 'Середа', 'Четвер', "П’ятниця", 'Субота']
const MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня']
const TIME_OPTIONS = Array.from({ length: 96 }, (_, index) => {
  const hour = Math.floor(index / 4)
  const minute = (index % 4) * 15
  return { hour, minute, label: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}` }
})

export type AvailabilityEditorMode = 'week' | 'regular'

export function timeValue(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function parseTime(value: string) {
  const [hour, minute] = value.split(':').map(Number)
  return { hour, minute }
}

export function validateIndividualWindow(slot: AvailabilitySlot): string | null {
  const start = slot.hour * 60 + slot.minute
  const end = (slot.endHour ?? slot.hour + 1) * 60 + (slot.endMinute ?? slot.minute)
  if (start >= end) return 'Час початку має бути раніше часу завершення.'
  if (end - start < 60) return 'Вікно має вміщувати щонайменше одну 60-хвилинну сесію.'
  return null
}

export function createIndividualWindow(dayOfWeek: number): AvailabilitySlot {
  return {
    id: `individual-window-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    dayOfWeek, hour: 9, minute: 0, endHour: 18, endMinute: 0,
    timezone: 'Europe/Kyiv', sessionType: 'individual', maxSlots: 1,
    priceCents: 0, durationMinutes: 60, active: true,
  }
}

function availabilityDayOfWeek(date: Date) {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Kyiv', weekday: 'short' }).format(date)
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday)
}

function formatWeekRange(from: string, to: string) {
  const start = new Date(from)
  const end = new Date(to)
  const day = (date: Date) => new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', day: 'numeric' }).format(date)
  const month = (date: Date) => MONTHS[Number(new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', month: 'numeric' }).format(date)) - 1]
  const year = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', year: 'numeric' }).format(start)
  return month(start) === month(end) ? `${day(start)} – ${day(end)} ${month(start)} ${year}` : `${day(start)} ${month(start)} – ${day(end)} ${month(end)} ${year}`
}

function dateLabel(date: Date) {
  const parts = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', weekday: 'short', day: 'numeric' }).formatToParts(date)
  return `${parts.find((part) => part.type === 'weekday')?.value?.replace('.', '').toUpperCase()} ${parts.find((part) => part.type === 'day')?.value}`
}

function compactDateLabel(date: Date) {
  const parts = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', weekday: 'short', day: '2-digit', month: '2-digit' }).formatToParts(date)
  const weekday = parts.find((part) => part.type === 'weekday')?.value?.replace('.', '') ?? ''
  const day = parts.find((part) => part.type === 'day')?.value ?? ''
  const month = parts.find((part) => part.type === 'month')?.value ?? ''
  return `${weekday.slice(0, 1).toUpperCase()}${weekday.slice(1)}, ${day}.${month}`
}

function formatSessionTime(scheduledAt: string, durationMinutes = 60) {
  const formatter = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const start = new Date(scheduledAt)
  return `${formatter.format(start)} — ${formatter.format(new Date(start.getTime() + durationMinutes * 60_000))}`
}

function availabilityDateParts(date: Date) {
  const [weekday, numericDate] = compactDateLabel(date).split(', ')
  return { weekday, numericDate }
}

function AvailabilitySessionRow({ session }: { session: ZoomCalendarSession }) {
  const isIndividual = session.type === 'individual'
  const isGroupPractice = session.type === 'group_practice'
  const Icon = isIndividual ? UserRound : isGroupPractice ? UsersRound : CalendarClock
  const type = isIndividual ? 'Індивідуальна сесія' : isGroupPractice ? 'Групова практика' : 'Zoom сесія'
  const occupancy = isGroupPractice && session.attendeesCount !== undefined
    ? `ФОКУС · ${session.attendeesCount}${session.remainingSlots !== undefined ? `/${session.attendeesCount + session.remainingSlots}` : ''} учасників`
    : null

  return <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-100"><Icon className="h-4 w-4" aria-hidden="true" /></span><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-white/70">{formatSessionTime(session.scheduledAt, session.durationMinutes)}</p><p className="truncate text-sm font-semibold text-white">{type}</p><p className="truncate text-xs text-white/50">{occupancy ?? session.topic}</p></div><ChevronRight className="h-4 w-4 shrink-0 text-white/45" aria-hidden="true" /></div>
}

export function getWeekDateKeys(weekAnchor: Date) {
  const range = getKyivWeekRange(weekAnchor)
  const fromKey = getKyivDateKey(new Date(range.from))
  return Array.from({ length: 7 }, (_, index) => addKyivDays(fromKey, index))
}

export function buildDayToggleChange(day: AvailabilityWeekDay): AvailabilityWeekChange | null {
  if (day.windows.length > 0) return { date: day.date, windows: [] }
  return day.hasOverride ? { date: day.date, reset: true } : null
}

export function buildWeekOverrideResets(days: AvailabilityWeekDay[]): AvailabilityWeekChange[] {
  return days.filter((day) => day.hasOverride).map((day) => ({ date: day.date, reset: true }))
}

function AvailabilityWindowEditor({ slot, onChange, onDelete, onDone }: { slot: AvailabilitySlot; onChange: (next: AvailabilitySlot) => void; onDelete: () => void; onDone: () => void }) {
  const validationError = validateIndividualWindow(slot)
  return <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
    <p className="text-xs font-semibold text-white/80">Доступний час</p>
    <div className="mt-3 grid grid-cols-2 gap-2">
      <label className="text-xs text-white/55">Початок<select value={timeValue(slot.hour, slot.minute)} onChange={(event) => onChange({ ...slot, ...parseTime(event.target.value) })} className="mt-1 block w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">{TIME_OPTIONS.map((time) => <option key={time.label} value={time.label}>{time.label}</option>)}</select></label>
      <label className="text-xs text-white/55">Кінець<select value={timeValue(slot.endHour ?? slot.hour + 1, slot.endMinute ?? slot.minute)} onChange={(event) => { const end = parseTime(event.target.value); onChange({ ...slot, endHour: end.hour, endMinute: end.minute }) }} className="mt-1 block w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white">{TIME_OPTIONS.map((time) => <option key={time.label} value={time.label}>{time.label}</option>)}</select></label>
    </div>
    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-white/55"><span>Тривалість сесії<br /><strong className="text-white/85">60 хв</strong></span><span>Крок запису<br /><strong className="text-white/85">15 хв</strong></span></div>
    {validationError && <p className="mt-3 text-xs text-red-200">{validationError}</p>}
    <div className="mt-3 flex justify-between gap-2"><button type="button" onClick={onDelete} className="rounded-xl border border-red-300/25 px-3 py-2 text-xs font-semibold text-red-100">ВИДАЛИТИ ВІКНО</button><button type="button" onClick={onDone} className="rounded-xl bg-white/[0.06] px-3 py-2 text-xs font-semibold text-white/70">ГОТОВО</button></div>
  </div>
}

export function RegularSchedule({ slots, onChange }: { slots: AvailabilitySlot[]; onChange: (slots: AvailabilitySlot[]) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingDay, setEditingDay] = useState<number | null>(null)
  const individualSlots = slots.filter((slot) => slot.sessionType === 'individual' && slot.active)
  const replaceSlot = (next: AvailabilitySlot) => onChange(slots.map((slot) => slot.id === next.id ? next : slot))
  return <div className="space-y-1.5">{DAYS.map((day, dayOfWeek) => {
    const daySlots = individualSlots.filter((slot) => slot.dayOfWeek === dayOfWeek)
    const isEditing = editingDay === dayOfWeek
    const windows = daySlots.length ? daySlots.map((slot) => `${timeValue(slot.hour, slot.minute)}–${timeValue(slot.endHour ?? slot.hour + 1, slot.endMinute ?? slot.minute)}`).join(', ') : 'ВИХІДНИЙ'
    const editDay = () => { setEditingDay(isEditing ? null : dayOfWeek); setEditingId(null) }
    return <section key={day} data-availability-regular-row={dayOfWeek} className="rounded-lg border border-sky-200/10 bg-slate-900/45 px-3 py-2.5">
      <div className="flex min-h-6 items-center gap-3">
        <button type="button" aria-expanded={isEditing} onClick={editDay} className="w-[88px] shrink-0 text-left text-xs font-semibold text-white">{day}</button>
        <button type="button" role="switch" aria-label={`${day}: робочий день`} aria-checked={daySlots.length > 0} onClick={() => onChange(daySlots.length ? slots.filter((slot) => slot.dayOfWeek !== dayOfWeek || slot.sessionType !== 'individual') : [...slots, createIndividualWindow(dayOfWeek)])} className={`flex h-6 w-10 shrink-0 items-center justify-center gap-0.5 rounded-full text-[9px] font-semibold text-white ${daySlots.length ? 'bg-emerald-500' : 'bg-slate-700'}`}>
          {daySlots.length ? <>ON<span className="h-3.5 w-3.5 rounded-full border-4 border-white bg-emerald-500" /></> : 'OFF'}
        </button>
        <button type="button" aria-label={`Редагувати ${day}`} aria-expanded={isEditing} onClick={editDay} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className={`min-w-0 flex-1 text-xs leading-4 ${daySlots.length ? 'text-sky-100/85' : 'text-slate-400'}`}>{windows}</span>
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-sky-100/70 transition ${isEditing ? 'rotate-90' : ''}`} />
        </button>
      </div>
      {isEditing && <div className="mt-3 border-t border-white/10 pt-3">{daySlots.length === 0 ? <p className="text-sm text-white/55">Вихідний день. Додай час для цього звичного дня.</p> : <div className="space-y-2">{daySlots.map((slot) => editingId === slot.id ? <AvailabilityWindowEditor key={slot.id} slot={slot} onChange={replaceSlot} onDelete={() => { onChange(slots.filter((item) => item.id !== slot.id)); setEditingId(null) }} onDone={() => setEditingId(null)} /> : <button type="button" key={slot.id} onClick={() => setEditingId(slot.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-left"><span className="text-sm text-white">{timeValue(slot.hour, slot.minute)} — {timeValue(slot.endHour ?? slot.hour + 1, slot.endMinute ?? slot.minute)}</span><span className="text-xs font-semibold text-sky-100">ЗМІНИТИ</span></button>)}</div>}<div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => onChange([...slots, createIndividualWindow(dayOfWeek)])} className="text-xs font-semibold text-sky-100">+ ДОДАТИ ЧАС</button>{daySlots.length > 0 && <button type="button" onClick={() => onChange(slots.filter((slot) => slot.dayOfWeek !== dayOfWeek || slot.sessionType !== 'individual'))} className="text-xs font-semibold text-white/55">ВИМКНУТИ ДЕНЬ</button>}</div></div>}
    </section>
  })}</div>
}

function WeekPreview({ weekAnchor, sessions }: { weekAnchor: Date; sessions: ZoomCalendarSession[] }) {
  const from = getWeekDateKeys(weekAnchor)[0]!
  const weekDates = useMemo(() => getWeekDateKeys(weekAnchor), [from])
  const { data: persistedDays = [], isFetching, isError, refetch } = useGetAvailabilityWeekQuery(from)
  const [saveWeek, { isLoading }] = useSaveAvailabilityWeekMutation()
  const [draft, setDraft] = useState<AvailabilityWeekDay[]>(persistedDays)
  const [resetDates, setResetDates] = useState<Set<string>>(new Set())
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState(false)
  const [savingDate, setSavingDate] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const persistedKey = useMemo(() => JSON.stringify(persistedDays), [persistedDays])
  const draftKey = useMemo(() => JSON.stringify(draft), [draft])
  const dirty = draftKey !== persistedKey || resetDates.size > 0

  useEffect(() => {
    setDraft(persistedDays)
    setResetDates(new Set())
    setEditingDate(null)
    setEditingId(null)
  }, [from, persistedDays, persistedKey])

  const updateWindows = (date: string, windows: AvailabilitySlot[]) => {
    setDraft((days) => days.map((day) => day.date === date ? { ...day, source: 'override', hasOverride: true, windows } : day))
    setResetDates((dates) => { const next = new Set(dates); next.delete(date); return next })
    setSaveError(false)
  }
  const refreshWeek = async () => { const refreshed = await refetch(); if (refreshed.data) setDraft(refreshed.data); setResetDates(new Set()) }
  const persistChanges = async (changes: AvailabilityWeekChange[], date?: string) => {
    if (changes.length === 0) return true
    setSaveError(false); setSavingDate(date ?? null)
    try { await saveWeek({ from, days: changes }).unwrap(); await refreshWeek(); return true } catch { setSaveError(true); return false } finally { setSavingDate(null) }
  }
  const applyRegularSchedule = async () => {
    if (await persistChanges(buildWeekOverrideResets(persistedDays))) setConfirmReset(false)
  }
  const save = async () => {
    if (!dirty) return
    const changes: AvailabilityWeekChange[] = draft.flatMap((day): AvailabilityWeekChange[] => {
      if (resetDates.has(day.date)) return [{ date: day.date, reset: true }]
      const persisted = persistedDays.find((item) => item.date === day.date)
      return JSON.stringify(persisted?.windows ?? []) === JSON.stringify(day.windows) ? [] : [{ date: day.date, windows: day.windows }]
    })
    if (changes.length === 0) return
    setSaveError(false)
    try { await saveWeek({ from, days: changes }).unwrap(); await refreshWeek() } catch { setSaveError(true) }
  }
  const invalidWindow = draft.flatMap((day) => day.windows).map(validateIndividualWindow).find(Boolean)
  const displayedDays = draft.filter((day) => weekDates.includes(day.date))
  const hasOverrides = displayedDays.some((day) => day.hasOverride)
  return <div className="space-y-3">{isFetching && displayedDays.length !== 7 ? <p className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-xs text-white/55">Завантажуємо доступність…</p> : isError ? <div className="rounded-xl border border-red-300/25 bg-red-500/10 p-3 text-sm text-red-100">Не вдалося завантажити доступність.<button type="button" onClick={() => void refetch()} className="ml-2 font-semibold underline">Повторити</button></div> : displayedDays.map((day) => {
    const date = new Date(day.date)
    const dateSessions = sessions.filter((session) => getKyivDateKey(new Date(session.scheduledAt)) === getKyivDateKey(date))
    const isEditing = editingDate === day.date
    const hours = day.windows.length ? day.windows.map((slot) => `${timeValue(slot.hour, slot.minute)}–${timeValue(slot.endHour ?? slot.hour + 1, slot.endMinute ?? slot.minute)}`).join(', ') : 'ВИХІДНИЙ'
    const { weekday, numericDate } = availabilityDateParts(date)
    return <section key={day.date} data-availability-week-row={day.date} className="rounded-lg border border-sky-200/10 bg-slate-900/45 px-2.5 py-2">
      <div className="flex items-center gap-3">
        <div className="w-9 shrink-0"><p className="text-xs font-semibold">{weekday}</p><p className="text-xs font-semibold">{numericDate}</p></div>
        <span className={`rounded-lg px-2 py-1.5 text-[10px] font-semibold text-white ${day.windows.length ? 'bg-emerald-500' : 'bg-slate-700'}`}>{day.windows.length ? 'ON' : 'OFF'}</span>
        <span className={`min-w-0 flex-1 text-xs leading-4 ${day.windows.length ? 'text-sky-100/85' : 'text-slate-400'}`}>{hours}</span>
        <button type="button" aria-label={`Редагувати ${dateLabel(date)}`} aria-expanded={isEditing} onClick={() => { setEditingDate(isEditing ? null : day.date); setEditingId(null) }} className="flex h-8 shrink-0 items-center gap-2 text-sky-200"><Pencil className="h-3.5 w-3.5" /><ChevronRight className={`h-3.5 w-3.5 transition ${isEditing ? 'rotate-90' : ''}`} /></button>
      </div>
      {isEditing && <div className="mt-3 border-t border-white/10 pt-3">
        {day.hasOverride && <p className="mb-2 text-[10px] font-semibold text-sky-100">ЗМІНЕНО ДЛЯ ЦІЄЇ ДАТИ</p>}
        {day.windows.length ? <div className="space-y-2">{day.windows.map((slot) => editingId === slot.id ? <AvailabilityWindowEditor key={slot.id} slot={slot} onChange={(next) => updateWindows(day.date, day.windows.map((item) => item.id === slot.id ? next : item))} onDelete={() => { updateWindows(day.date, day.windows.filter((item) => item.id !== slot.id)); setEditingId(null) }} onDone={() => setEditingId(null)} /> : <button type="button" key={slot.id} onClick={() => setEditingId(slot.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/15 px-3 py-2 text-left"><span className="text-sm text-white">{timeValue(slot.hour, slot.minute)} — {timeValue(slot.endHour ?? slot.hour + 1, slot.endMinute ?? slot.minute)}</span><span className="text-xs font-semibold text-sky-100">ЗМІНИТИ</span></button>)}</div> : <p className="text-sm text-white/55">Вихідний день. Додай час для цього конкретного дня.</p>}
        <div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={() => updateWindows(day.date, [...day.windows, createIndividualWindow(availabilityDayOfWeek(date))])} className="text-xs font-semibold text-sky-100">+ ДОДАТИ ЧАС</button>{day.windows.length > 0 && <button type="button" onClick={() => updateWindows(day.date, [])} className="text-xs font-semibold text-white/55">ЗРОБИТИ ВИХІДНИМ</button>}{day.hasOverride && <button type="button" disabled={isLoading || savingDate === day.date} onClick={() => void persistChanges([{ date: day.date, reset: true }], day.date)} className="text-xs font-semibold text-white/55 disabled:opacity-40">ПОВЕРНУТИ ЗВИЧНИЙ ГРАФІК</button>}</div>
        {dateSessions.length > 0 && <div data-availability-sessions={day.date} className="mt-3 space-y-2 border-t border-white/10 pt-3"><p className="text-xs text-white/55">Заплановані зустрічі залишаються без змін.</p>{dateSessions.map((session) => <AvailabilitySessionRow key={session.id} session={session} />)}</div>}
      </div>}
    </section>
  })}
    {saveError && <p role="alert" className="text-sm text-red-200">Не вдалося зберегти тиждень.</p>}
    <button type="button" disabled={!hasOverrides || isLoading} onClick={() => { setSaveError(false); setConfirmReset(true) }} className="flex w-full items-center justify-center gap-2 rounded-lg border border-sky-400 bg-gradient-to-b from-sky-700/50 to-sky-950/50 px-3 py-3 text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><RotateCcw className="h-4 w-4" />ЗАСТОСУВАТИ ЗВИЧНИЙ ГРАФІК</button>
    <p className="text-center text-[10px] leading-4 text-slate-400">{hasOverrides ? <>Скинути індивідуальні налаштування цього тижня<br />і повернути розклад зі звичного графіка.</> : 'Тиждень вже за звичним графіком.'}</p>
    {dirty && <button type="button" disabled={Boolean(invalidWindow) || isLoading} onClick={() => void save()} className="w-full rounded-xl border border-sky-300/30 bg-sky-500/20 px-3 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{isLoading ? 'ЗБЕРІГАЄМО…' : 'ЗБЕРЕГТИ ТИЖДЕНЬ'}</button>}
    {confirmReset && <BaseModal isOpen onClose={() => { if (!isLoading) setConfirmReset(false) }} panelClassName="relative w-full max-w-xs rounded-xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-5 text-white">
      <div role="dialog" aria-modal="true" aria-labelledby="availability-reset-title" className="text-center">
        <button type="button" aria-label="Закрити підтвердження" disabled={isLoading} onClick={() => setConfirmReset(false)} className="absolute right-3 top-3 text-white/60"><X className="h-4 w-4" /></button>
        <CalendarClock className="mx-auto mb-4 h-8 w-8 text-sky-100" />
        <h3 id="availability-reset-title" className="text-sm font-semibold">Застосувати звичний графік?</h3>
        <p className="mt-3 text-xs leading-5 text-slate-300">Будуть видалені всі індивідуальні налаштування цього тижня.<br />Заплановані зустрічі не змінюються.</p>
        {saveError && <p role="alert" className="mt-2 text-xs text-red-200">Не вдалося зберегти тиждень.</p>}
        <button type="button" disabled={isLoading} onClick={() => void applyRegularSchedule()} className="mt-4 w-full rounded-xl border border-sky-400 bg-sky-600 py-2.5 text-xs font-semibold disabled:opacity-40">{isLoading ? 'ЗАСТОСОВУЄМО…' : 'ЗАСТОСУВАТИ'}</button>
        <button type="button" disabled={isLoading} onClick={() => setConfirmReset(false)} className="mt-2 w-full rounded-xl border border-slate-700 py-2.5 text-xs font-semibold text-sky-200 disabled:opacity-40">СКАСУВАТИ</button>
      </div>
    </BaseModal>}
  </div>
}

export function ZoomAvailabilityEditor({ weekAnchor, sessions, onPreviousWeek, onNextWeek, onCurrentWeek }: { weekAnchor: Date; sessions: ZoomCalendarSession[]; onPreviousWeek: () => void; onNextWeek: () => void; onCurrentWeek: () => void }) {
  const { data: persistedSlots = [], refetch: refetchAvailability } = useGetAvailabilityQuery()
  const [saveAvailability, { isLoading }] = useSaveAvailabilityMutation()
  const [mode, setMode] = useState<AvailabilityEditorMode>('week')
  const [draft, setDraft] = useState<AvailabilitySlot[]>(persistedSlots)
  const [saveError, setSaveError] = useState(false)
  const [saved, setSaved] = useState(false)
  const persistedKey = useMemo(() => JSON.stringify(persistedSlots), [persistedSlots])
  const draftKey = useMemo(() => JSON.stringify(draft), [draft])
  const previousPersistedKey = useRef(persistedKey)
  const dirty = draftKey !== persistedKey
  const invalidWindow = draft.filter((slot) => slot.sessionType === 'individual' && slot.active).map(validateIndividualWindow).find(Boolean)
  const weekRange = getKyivWeekRange(weekAnchor)
  useEffect(() => {
    if (draftKey === previousPersistedKey.current) setDraft(persistedSlots)
    previousPersistedKey.current = persistedKey
  }, [draftKey, persistedKey, persistedSlots])
  const save = async () => {
    if (!dirty || invalidWindow) return
    setSaveError(false); setSaved(false)
    try { await saveAvailability(draft).unwrap(); await refetchAvailability(); setSaved(true) } catch { setSaveError(true) }
  }
  return <section className="space-y-3 text-white">
    <div className="grid grid-cols-2 rounded-lg border border-slate-700/60">
      <button type="button" aria-pressed={mode === 'regular'} onClick={() => setMode('regular')} className={`rounded-lg border px-2 py-2 text-[11px] font-semibold ${mode === 'regular' ? 'border-sky-400 bg-gradient-to-b from-sky-700/50 to-sky-950/50 text-white' : 'border-transparent text-sky-100/80'}`}>ЗВИЧНИЙ ГРАФІК</button>
      <button type="button" aria-pressed={mode === 'week'} onClick={() => setMode('week')} className={`rounded-lg border px-2 py-2 text-[11px] font-semibold ${mode === 'week' ? 'border-sky-400 bg-gradient-to-b from-sky-700/50 to-sky-950/50 text-white' : 'border-transparent text-sky-100/80'}`}>ЦЕЙ ТИЖДЕНЬ</button>
    </div>
    {mode === 'week' ? <>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-700/60 px-1 py-2">
        <button type="button" aria-label="Попередній тиждень доступності" onClick={onPreviousWeek} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-white/80"><ChevronLeft className="h-4 w-4" /></button>
        <p className="flex-1 text-center text-[11px] font-semibold">{formatWeekRange(weekRange.from, weekRange.to)}</p>
        <button type="button" onClick={onCurrentWeek} className="rounded-lg border border-sky-400/50 bg-sky-950/50 px-2 py-2 text-[10px] text-sky-200">Сьогодні</button>
        <button type="button" aria-label="Наступний тиждень доступності" onClick={onNextWeek} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-white/80"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <WeekPreview weekAnchor={weekAnchor} sessions={sessions} />
    </> : <>
      <div className="rounded-lg border border-slate-700/60 bg-slate-900/45 p-3"><h3 className="text-sm font-semibold">ЗВИЧНИЙ ГРАФІК</h3><p className="mt-1 text-xs leading-4 text-slate-400">Твій стандартний робочий тиждень.<br />Використовується для нових бронювань.</p></div>
      <RegularSchedule slots={draft} onChange={(next) => { setDraft(next); setSaved(false); setSaveError(false) }} />
      <div className="flex items-start gap-3 rounded-lg border border-slate-700/60 bg-slate-900/45 p-3"><Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-200/60" /><p className="text-[10px] leading-4 text-slate-400">Зміна звичного графіка впливає на нові бронювання.<br />Вже заплановані зустрічі не змінюються.</p></div>
      {saved && <p className="text-sm text-emerald-200">Звичний графік оновлено.</p>}
      {saveError && <p role="alert" className="text-sm text-red-200">Не вдалося зберегти графік.</p>}
      {dirty && <button type="button" disabled={Boolean(invalidWindow) || isLoading} onClick={() => void save()} className="w-full rounded-xl border border-sky-300/30 bg-sky-500/20 px-3 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{saveError ? 'ПОВТОРИТИ' : isLoading ? 'ЗБЕРІГАЄМО…' : 'ЗБЕРЕГТИ ЗВИЧНИЙ ГРАФІК'}</button>}
    </>}
  </section>
}
