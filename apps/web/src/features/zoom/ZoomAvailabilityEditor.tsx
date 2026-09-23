import { useEffect, useMemo, useRef, useState } from 'react'
import { useGetAvailabilityQuery, useGetAvailabilityWeekQuery, useSaveAvailabilityMutation, useSaveAvailabilityWeekMutation } from './zoom.api'
import type { AvailabilitySlot, AvailabilityWeekChange, AvailabilityWeekDay, ZoomCalendarSession } from './zoom.types'
import { addKyivDays, getKyivDateKey, getKyivWeekRange } from './utils/zoomDateTime.utils'

const DAYS = ['НЕДІЛЯ', 'ПОНЕДІЛОК', 'ВІВТОРОК', 'СЕРЕДА', 'ЧЕТВЕР', "П'ЯТНИЦЯ", 'СУБОТА']
const MONTHS = ['січ', 'лют', 'бер', 'кві', 'тра', 'чер', 'лип', 'сер', 'вер', 'жов', 'лис', 'гру']
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
  return month(start) === month(end) ? `${day(start)}–${day(end)} ${month(start)}` : `${day(start)} ${month(start)} — ${day(end)} ${month(end)}`
}

function dateLabel(date: Date) {
  const parts = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', weekday: 'short', day: 'numeric' }).formatToParts(date)
  return `${parts.find((part) => part.type === 'weekday')?.value?.replace('.', '').toUpperCase()} ${parts.find((part) => part.type === 'day')?.value}`
}

function formatSessionTime(scheduledAt: string, durationMinutes = 60) {
  const formatter = new Intl.DateTimeFormat('uk-UA', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const start = new Date(scheduledAt)
  return `${formatter.format(start)} — ${formatter.format(new Date(start.getTime() + durationMinutes * 60_000))}`
}

export function getWeekDateKeys(weekAnchor: Date) {
  const range = getKyivWeekRange(weekAnchor)
  const fromKey = getKyivDateKey(new Date(range.from))
  return Array.from({ length: 7 }, (_, index) => addKyivDays(fromKey, index))
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

function RegularSchedule({ slots, onChange }: { slots: AvailabilitySlot[]; onChange: (slots: AvailabilitySlot[]) => void }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const individualSlots = slots.filter((slot) => slot.sessionType === 'individual' && slot.active)
  const replaceSlot = (next: AvailabilitySlot) => onChange(slots.map((slot) => slot.id === next.id ? next : slot))
  return <div className="space-y-3">{DAYS.map((day, dayOfWeek) => {
    const daySlots = individualSlots.filter((slot) => slot.dayOfWeek === dayOfWeek)
    return <section key={day} className="border-b border-white/10 pb-3 last:border-0"><h3 className="text-sm font-semibold text-white">{day}</h3>
      {daySlots.length === 0 ? <><p className="mt-3 text-sm text-white/45">ВИХІДНИЙ</p><button type="button" onClick={() => onChange([...slots, createIndividualWindow(dayOfWeek)])} className="mt-2 rounded-xl border border-sky-300/25 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-100">ВІДКРИТИ ДЕНЬ</button></> : <div className="mt-2 space-y-2">{daySlots.map((slot) => editingId === slot.id ? <AvailabilityWindowEditor key={slot.id} slot={slot} onChange={replaceSlot} onDelete={() => { onChange(slots.filter((item) => item.id !== slot.id)); setEditingId(null) }} onDone={() => setEditingId(null)} /> : <div key={slot.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2"><span className="text-sm text-white">{timeValue(slot.hour, slot.minute)} — {timeValue(slot.endHour ?? slot.hour + 1, slot.endMinute ?? slot.minute)}</span><button type="button" onClick={() => setEditingId(slot.id)} className="text-xs font-semibold text-sky-100">ЗМІНИТИ</button></div>)}</div>}
      {daySlots.length > 0 && <button type="button" onClick={() => onChange([...slots, createIndividualWindow(dayOfWeek)])} className="mt-2 text-xs font-semibold text-sky-100">+ ДОДАТИ</button>}
    </section>
  })}</div>
}

function RegularScheduleSummary({ slots }: { slots: AvailabilitySlot[] }) {
  const individualSlots = slots.filter((slot) => slot.sessionType === 'individual' && slot.active)
  return <div className="mt-4 space-y-2">{DAYS.map((day, dayOfWeek) => {
    const windows = individualSlots.filter((slot) => slot.dayOfWeek === dayOfWeek)
    return <div key={day} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2"><span className="text-sm font-medium text-white">{day}</span><span className="text-sm text-white/55">{windows.length ? windows.map((slot) => `${timeValue(slot.hour, slot.minute)} — ${timeValue(slot.endHour ?? slot.hour + 1, slot.endMinute ?? slot.minute)}`).join(', ') : 'ВИХІДНИЙ'}</span></div>
  })}</div>
}

function WeekPreview({ weekAnchor, sessions, recurringSlots }: { weekAnchor: Date; sessions: ZoomCalendarSession[]; recurringSlots: AvailabilitySlot[] }) {
  const from = getWeekDateKeys(weekAnchor)[0]!
  const { data: persistedDays = [], isFetching, refetch } = useGetAvailabilityWeekQuery(from)
  const [saveWeek, { isLoading }] = useSaveAvailabilityWeekMutation()
  const [draft, setDraft] = useState<AvailabilityWeekDay[]>(persistedDays)
  const [resetDates, setResetDates] = useState<Set<string>>(new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saveError, setSaveError] = useState(false)
  const persistedKey = useMemo(() => JSON.stringify(persistedDays), [persistedDays])
  const draftKey = useMemo(() => JSON.stringify(draft), [draft])
  const previousPersistedKey = useRef(persistedKey)
  const dirty = draftKey !== persistedKey || resetDates.size > 0

  useEffect(() => {
    if (draftKey === previousPersistedKey.current) {
      setDraft(persistedDays)
      setResetDates(new Set())
    }
    previousPersistedKey.current = persistedKey
  }, [draftKey, persistedDays, persistedKey])

  const updateWindows = (date: string, windows: AvailabilitySlot[]) => {
    setDraft((days) => days.map((day) => day.date === date ? { ...day, source: 'override', hasOverride: true, windows } : day))
    setResetDates((dates) => { const next = new Set(dates); next.delete(date); return next })
    setSaveError(false)
  }
  const applyRegularSchedule = () => {
    setDraft((days) => days.map((day) => ({ ...day, source: 'recurring', hasOverride: false, windows: recurringSlots.filter((slot) => slot.active && slot.sessionType === 'individual' && slot.dayOfWeek === availabilityDayOfWeek(new Date(day.date))).map((slot) => ({ ...slot })) })))
    setResetDates(new Set(persistedDays.filter((day: AvailabilityWeekDay) => day.hasOverride).map((day: AvailabilityWeekDay) => day.date)))
    setSaveError(false)
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
    try { const result = await saveWeek({ from, days: changes }).unwrap(); void result; const refreshed = await refetch(); if (refreshed.data) setDraft(refreshed.data); setResetDates(new Set()) } catch { setSaveError(true) }
  }
  const invalidWindow = draft.flatMap((day) => day.windows).map(validateIndividualWindow).find(Boolean)
  const hasRecurringIndividualWindows = recurringSlots.some((slot) => slot.active && slot.sessionType === 'individual')
  return <div className="space-y-3"><button type="button" disabled={!hasRecurringIndividualWindows} onClick={applyRegularSchedule} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/75 disabled:cursor-not-allowed disabled:opacity-40">ЗАСТОСУВАТИ ЗВИЧНИЙ ГРАФІК</button>{isFetching && persistedDays.length === 0 ? <p className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-xs text-white/55">Завантажуємо доступність…</p> : draft.map((day) => {
    const date = new Date(day.date)
    const dateSessions = sessions.filter((session) => getKyivDateKey(new Date(session.scheduledAt)) === getKyivDateKey(date))
    const restoreRecurring = () => { setResetDates((dates) => new Set(dates).add(day.date)); setDraft((days) => days.map((item) => item.date === day.date ? { ...item, source: 'recurring', hasOverride: false, windows: recurringSlots.filter((slot) => slot.active && slot.sessionType === 'individual' && slot.dayOfWeek === availabilityDayOfWeek(date)).map((slot) => ({ ...slot })) } : item)) }
    return <section key={day.date} className="border-b border-white/10 pb-3 last:border-0"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-white">{dateLabel(date)}</h3>{day.hasOverride && <span className="text-[10px] font-semibold text-sky-100">ЗМІНЕНО</span>}</div>{day.windows.length ? <div className="mt-2 space-y-2">{day.windows.map((slot) => editingId === slot.id ? <AvailabilityWindowEditor key={slot.id} slot={slot} onChange={(next) => updateWindows(day.date, day.windows.map((item) => item.id === slot.id ? next : item))} onDelete={() => { updateWindows(day.date, day.windows.filter((item) => item.id !== slot.id)); setEditingId(null) }} onDone={() => setEditingId(null)} /> : <div key={slot.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2"><span className="text-sm text-white">{timeValue(slot.hour, slot.minute)} — {timeValue(slot.endHour ?? slot.hour + 1, slot.endMinute ?? slot.minute)}</span><button type="button" onClick={() => setEditingId(slot.id)} className="text-xs font-semibold text-sky-100">ЗМІНИТИ</button></div>)}</div> : <><p className="mt-2 text-sm text-white/45">ВИХІДНИЙ</p><button type="button" onClick={() => updateWindows(day.date, [createIndividualWindow(availabilityDayOfWeek(date))])} className="mt-2 rounded-xl border border-sky-300/25 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-100">ВІДКРИТИ ДЕНЬ</button></>}{(day.windows.length > 0 || day.hasOverride) && <div className="mt-2 flex gap-3">{day.windows.length > 0 && <><button type="button" onClick={() => updateWindows(day.date, [...day.windows, createIndividualWindow(availabilityDayOfWeek(date))])} className="text-xs font-semibold text-sky-100">+ ДОДАТИ</button><button type="button" onClick={() => updateWindows(day.date, [])} className="text-xs font-semibold text-white/55">ЗРОБИТИ ВИХІДНИМ</button></>}{day.hasOverride && <button type="button" onClick={restoreRecurring} className="text-xs font-semibold text-white/55">ПОВЕРНУТИ ЗВИЧНИЙ ГРАФІК</button>}</div>}{dateSessions.map((session) => <div key={session.id} className="mt-2 rounded-xl border border-white/10 bg-black/15 px-3 py-2"><p className="text-xs font-semibold uppercase tracking-wide text-white/55">{session.type === 'individual' ? 'ЗАПИСАНО' : session.type === 'group_practice' ? 'ГРУПОВА ПРАКТИКА' : 'СЕСІЯ'}</p><p className="mt-1 text-sm text-white">{formatSessionTime(session.scheduledAt, session.durationMinutes)} · {session.topic}</p><p className="mt-1 text-xs text-white/45">Вже заплановано</p></div>)}</section>
  })}{saveError && <p className="text-sm text-red-200">Не вдалося зберегти тиждень.</p>}<button type="button" disabled={!dirty || Boolean(invalidWindow) || isLoading} onClick={() => void save()} className="w-full rounded-xl border border-sky-300/30 bg-sky-500/20 px-3 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{isLoading ? 'ЗБЕРІГАЄМО…' : 'ЗБЕРЕГТИ ТИЖДЕНЬ'}</button></div>
}

export function ZoomAvailabilityEditor({ weekAnchor, sessions, onPreviousWeek, onNextWeek, onCurrentWeek }: { weekAnchor: Date; sessions: ZoomCalendarSession[]; onPreviousWeek: () => void; onNextWeek: () => void; onCurrentWeek: () => void }) {
  const { data: persistedSlots = [] } = useGetAvailabilityQuery()
  const [saveAvailability, { isLoading }] = useSaveAvailabilityMutation()
  const [mode, setMode] = useState<AvailabilityEditorMode>('week')
  const [draft, setDraft] = useState<AvailabilitySlot[]>(persistedSlots)
  const [saveError, setSaveError] = useState(false)
  const [saved, setSaved] = useState(false)
  const [regularEditing, setRegularEditing] = useState(false)
  const persistedKey = useMemo(() => JSON.stringify(persistedSlots), [persistedSlots])
  const draftKey = useMemo(() => JSON.stringify(draft), [draft])
  const previousPersistedKey = useRef(persistedKey)
  const dirty = draftKey !== persistedKey
  const invalidWindow = draft.filter((slot) => slot.sessionType === 'individual' && slot.active).map(validateIndividualWindow).find(Boolean)
  const hasRecurringIndividualWindows = persistedSlots.some((slot) => slot.sessionType === 'individual' && slot.active)
  const timezone = draft.find((slot) => slot.sessionType === 'individual')?.timezone ?? persistedSlots.find((slot) => slot.sessionType === 'individual')?.timezone ?? 'Europe/Kyiv'
  const weekRange = getKyivWeekRange(weekAnchor)
  useEffect(() => {
    if (draftKey === previousPersistedKey.current) setDraft(persistedSlots)
    previousPersistedKey.current = persistedKey
  }, [draftKey, persistedKey, persistedSlots])
  const save = async () => {
    if (!dirty || invalidWindow) return
    setSaveError(false); setSaved(false)
    try { await saveAvailability(draft).unwrap(); setSaved(true); setRegularEditing(false) } catch { setSaveError(true) }
  }
  return <section className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,8,23,0.95))] p-4 text-white"><h2 className="text-lg font-semibold">МОЯ ДОСТУПНІСТЬ</h2><p className="mt-1 text-sm leading-relaxed text-white/55">Коли користувачі можуть записатися<br />на індивідуальну сесію</p><div className="mt-4 grid grid-cols-2 rounded-xl border border-white/10 bg-black/15 p-1"><button type="button" onClick={() => setMode('week')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${mode === 'week' ? 'bg-sky-500/20 text-white' : 'text-white/55'}`}>ЦЕЙ ТИЖДЕНЬ</button><button type="button" onClick={() => setMode('regular')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${mode === 'regular' ? 'bg-sky-500/20 text-white' : 'text-white/55'}`}>ЗВИЧНИЙ ГРАФІК</button></div>
    {mode === 'week' ? <><div className="mt-4 flex items-center justify-between gap-2"><button type="button" aria-label="Попередній тиждень доступності" onClick={onPreviousWeek} className="h-9 w-9 rounded-xl border border-white/10 text-white/80">‹</button><p className="text-center text-sm font-semibold text-white">{formatWeekRange(weekRange.from, weekRange.to)}</p><button type="button" aria-label="Наступний тиждень доступності" onClick={onNextWeek} className="h-9 w-9 rounded-xl border border-white/10 text-white/80">›</button></div><button type="button" onClick={onCurrentWeek} className="mt-3 w-full rounded-xl border border-sky-300/25 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-100">ЦЕЙ ТИЖДЕНЬ</button><WeekPreview weekAnchor={weekAnchor} sessions={sessions} recurringSlots={persistedSlots} /></> : <><div className="mt-4"><h3 className="text-base font-semibold">ЗВИЧНИЙ ГРАФІК</h3><p className="mt-1 text-sm text-white/55">Твій стандартний робочий тиждень</p></div>{!regularEditing ? <><RegularScheduleSummary slots={persistedSlots} />{saved && <p className="mt-3 text-sm text-emerald-200">Звичний графік оновлено.</p>}<button type="button" onClick={() => { setRegularEditing(true); setSaved(false); setSaveError(false) }} className="mt-4 w-full rounded-xl border border-sky-300/30 bg-sky-500/20 px-3 py-3 text-sm font-semibold text-white">{hasRecurringIndividualWindows ? 'ОНОВИТИ ЗВИЧНИЙ ГРАФІК' : 'СТВОРИТИ ЗВИЧНИЙ ГРАФІК'}</button></> : <><div className="mt-4"><RegularSchedule slots={draft} onChange={(next) => { setDraft(next); setSaved(false); setSaveError(false) }} /></div><p className="mt-4 text-xs text-white/55">Індивідуальна сесія: 60 хв<br />Крок запису: 15 хв<br />Час: {timezone === 'Europe/Kyiv' ? 'Київ' : timezone}</p><p className="mt-4 text-xs leading-relaxed text-white/45">Зміни доступності не скасовують уже створені записи.</p>{saveError && <p className="mt-3 text-sm text-red-200">Не вдалося зберегти графік.</p>}<button type="button" disabled={!dirty || Boolean(invalidWindow) || isLoading} onClick={() => void save()} className="mt-4 w-full rounded-xl border border-sky-300/30 bg-sky-500/20 px-3 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{saveError ? 'ПОВТОРИТИ' : isLoading ? 'ЗБЕРІГАЄМО…' : hasRecurringIndividualWindows ? 'ЗБЕРЕГТИ ЗВИЧНИЙ ГРАФІК' : 'СТВОРИТИ ЗВИЧНИЙ ГРАФІК'}</button></>}</>}
  </section>
}
