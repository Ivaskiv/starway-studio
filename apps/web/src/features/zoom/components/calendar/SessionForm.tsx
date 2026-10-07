import { useEffect, useMemo, useRef, useState } from 'react'

import { useGetAttendeesQuery } from '../../services/zoom.api'
import { useGetAvailabilityQuery } from '../../zoom.api'
import type {
  AvailabilitySlot,
  CreateSessionPayload,
  ZoomSessionType,
} from '../../zoom.types'
import { COACH_ZOOM_SESSION_TYPES } from '../../zoom.types'
import { getSessionMeta, getZoomFormatInfo } from '../../zoom.utils'
import {
  createUtcDateForTimeZone,
  getTimeZoneDateParts,
  KYIV_TIMEZONE,
} from '../../utils/zoomDateTime.utils'
import type { AdminUser } from '@/features/admin/services/ownership.types'

type SessionFormPayload = CreateSessionPayload & {
  participantUserId?: string
  participantUserIds?: string[]
}

const DEFAULT_GROUP_CAPACITY = 50
const BATTLE_PARTICIPANTS_REQUIRED = 2
const DEFAULT_SUBMIT_ERROR_MESSAGE = 'Не вдалося зберегти Zoom-сесію. Спробуйте ще раз.'
const SCHEDULING_CONFLICT_ERROR_CODES = new Set([
  'coach_session_conflict',
  'user_session_conflict',
  'COMMERCE_SLOT_UNAVAILABLE',
])
const GENERIC_SUBMIT_ERROR_CLASS =
  'rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white/70'
const CONFLICT_SUBMIT_ERROR_CLASS =
  'rounded-lg border border-red-300/35 bg-red-500/10 px-3 py-2 text-[11px] text-red-100'
const GROUP_SCHEDULE_WARNING_CLASS =
  'rounded-lg border border-amber-300/35 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100'
const GROUP_SCHEDULE_INFO_CLASS =
  'rounded-lg border border-sky-300/25 bg-sky-500/10 px-3 py-2 text-[11px] text-sky-100'
const GROUP_SCHEDULE_SUCCESS_CLASS =
  'rounded-lg border border-emerald-300/30 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-100'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function getSessionFormSubmitErrorMessage(error: unknown): string {
  if (isRecord(error)) {
    const data = error.data
    if (isRecord(data)) {
      if (typeof data.message === 'string' && data.message.trim()) {
        return data.message.trim()
      }
      if (typeof data.error === 'string' && data.error.trim()) {
        return data.error.trim()
      }
    }

    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message.trim()
    }
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error.trim()
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }

  return DEFAULT_SUBMIT_ERROR_MESSAGE
}

export function isSessionSchedulingConflictError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false
  }

  const data = error.data
  if (isRecord(data)) {
    return typeof data.error === 'string' && SCHEDULING_CONFLICT_ERROR_CODES.has(data.error)
  }

  return typeof error.error === 'string' && SCHEDULING_CONFLICT_ERROR_CODES.has(error.error)
}

export function getSessionFormSubmitErrorClassName(isConflict: boolean): string {
  return isConflict ? CONFLICT_SUBMIT_ERROR_CLASS : GENERIC_SUBMIT_ERROR_CLASS
}

function formatDateInputValue(date: Date): string {
  const parts = getTimeZoneDateParts(date, KYIV_TIMEZONE)
  return `${String(parts.day).padStart(2, '0')}.${String(parts.month).padStart(2, '0')}.${parts.year}`
}

export function formatDatePickerValue(dateValue: string): string {
  const [day, month, year] = dateValue.split('.')
  if (!day || !month || !year) return ''
  return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

export function parseDatePickerValue(dateValue: string): string {
  const [year, month, day] = dateValue.split('-')
  if (!day || !month || !year) return ''
  return `${day.padStart(2, '0')}.${month.padStart(2, '0')}.${year}`
}

function formatTimeInputValue(date: Date): string {
  const parts = getTimeZoneDateParts(date, KYIV_TIMEZONE)
  return `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`
}

export function buildScheduledAtIso(dateValue: string, timeValue: string): string {
  const [day, month, year] = dateValue.split('.').map(Number)
  const [hours, minutes] = timeValue.split(':').map(Number)
  return createUtcDateForTimeZone({
    year,
    month,
    day,
    hour: hours,
    minute: minutes,
    second: 0,
    millisecond: 0,
    timeZone: KYIV_TIMEZONE,
  }).toISOString()
}

export function getGroupPracticeScheduleState(
  dateValue: string,
  timeValue: string,
  slots: AvailabilitySlot[],
  availabilityLoaded: boolean,
): {
  kind: 'info' | 'warning' | 'success'
  message: string
  blocksCreation: boolean
  recommendedTime: string | null
} {
  if (!availabilityLoaded) {
    return {
      kind: 'info',
      message: 'Перевіряємо звичний графік коуча…',
      blocksCreation: true,
      recommendedTime: null,
    }
  }

  const groupSlots = slots.filter((slot) => slot.active && slot.sessionType === 'group_practice')
  if (groupSlots.length === 0) {
    return {
      kind: 'warning',
      message: 'У звичному графіку немає активної групової практики.',
      blocksCreation: true,
      recommendedTime: null,
    }
  }

  const [day, month, year] = dateValue.split('.').map(Number)
  const dayOfWeek = Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year)
    ? new Date(Date.UTC(year, month - 1, day)).getUTCDay()
    : null
  const daySlots = dayOfWeek === null
    ? []
    : groupSlots.filter((slot) => slot.dayOfWeek === dayOfWeek)
  const recommendedTime = daySlots[0]
    ? `${String(daySlots[0].hour).padStart(2, '0')}:${String(daySlots[0].minute).padStart(2, '0')}`
    : null

  if (daySlots.length === 0) {
    return {
      kind: 'warning',
      message: 'На обраний день у звичному графіку немає групової практики.',
      blocksCreation: true,
      recommendedTime: null,
    }
  }

  const matchesTime = daySlots.some((slot) =>
    `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}` === timeValue,
  )
  if (!matchesTime) {
    return {
      kind: 'warning',
      message: `Час групової практики має відповідати звичному графіку: ${daySlots.map((slot) => `${String(slot.hour).padStart(2, '0')}:${String(slot.minute).padStart(2, '0')}`).join(', ')}.`,
      blocksCreation: true,
      recommendedTime,
    }
  }

  return {
    kind: 'success',
    message: `Час відповідає звичному графіку: ${timeValue}.`,
    blocksCreation: false,
    recommendedTime,
  }
}

export function isSessionFormCreationBlocked(input: {
  isLoading: boolean
  isSubmitConflict: boolean
  date: string
  time: string
  topic: string
  type: ZoomSessionType
  maxAttendees: number
  groupScheduleBlocked: boolean
  participantUserId: string
  participantUserIds: string[]
}): boolean {
  if (input.isLoading || input.isSubmitConflict || !input.date.trim() || !input.time.trim() || !input.topic.trim()) {
    return true
  }
  if (input.type === 'group_practice') {
    return input.maxAttendees < 1 || input.groupScheduleBlocked
  }
  if (input.type === 'individual') return !input.participantUserId.trim()
  if (input.type === 'battle_review') {
    return input.participantUserIds.length !== BATTLE_PARTICIPANTS_REQUIRED
      || new Set(input.participantUserIds).size !== BATTLE_PARTICIPANTS_REQUIRED
  }
  return false
}

export function SessionForm({
  defaultDate,
  initialValues,
  onSubmit,
  onClose,
  isLoading,
  sessionId,
  participants = [],
  title = 'Нова сесія',
  submitLabel = 'Створити',
  loadingLabel = 'Створення...',
  closeLabel = 'Назад',
  autoFocusZoomLink = false,
}: {
  defaultDate: Date;
  initialValues?: Partial<CreateSessionPayload>;
  onSubmit: (p: SessionFormPayload) => void | Promise<void>;
  onClose: () => void;
  isLoading: boolean;
  sessionId?: string;
  participants?: AdminUser[];
  title?: string;
  submitLabel?: string;
  loadingLabel?: string;
  closeLabel?: string;
  autoFocusZoomLink?: boolean;
}) {
  const isEditing = Boolean(initialValues?.scheduledAt)
  const initialScheduledAt = initialValues?.scheduledAt ? new Date(initialValues.scheduledAt) : null
  const defaultGroupCapacity = initialValues?.maxAttendees ?? DEFAULT_GROUP_CAPACITY
  const [date, setDate] = useState(
    isEditing && initialScheduledAt ? formatDateInputValue(initialScheduledAt) : formatDateInputValue(defaultDate),
  );
  const [time, setTime] = useState(
    isEditing && initialScheduledAt ? formatTimeInputValue(initialScheduledAt) : '19:00',
  );
  const [topic, setTopic] = useState(initialValues?.topic ?? '');
  const [type, setType] = useState<ZoomSessionType>(initialValues?.type ?? 'group_practice');
  const [zoomLink, setZoomLink] = useState(initialValues?.zoomLink ?? '');
  const [maxAttendees, setMaxAttendees] = useState(
    initialValues?.maxAttendees ?? (initialValues?.type === 'individual' ? 1 : defaultGroupCapacity),
  )
  const [participantUserId, setParticipantUserId] = useState(
    initialValues?.participantUserId ?? '',
  )
  const [participantUserIds, setParticipantUserIds] = useState<string[]>(
    initialValues?.participantUserIds ?? [],
  )
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitConflict, setIsSubmitConflict] = useState(false)
  const availabilityQuery = useGetAvailabilityQuery()
  const availabilitySlots = availabilityQuery.data ?? []
  const availabilityLoaded = availabilityQuery.data !== undefined
  const { data: attendees = [] } = useGetAttendeesQuery(sessionId ?? '', {
    skip: !sessionId,
    refetchOnMountOrArgChange: true,
  })

  const individualParticipants = useMemo(
    () => participants.filter((user) => user.role === 'USER'),
    [participants],
  )
  const previousTypeRef = useRef(type)

  const currentParticipantUserId = participantUserId || attendees[0]?.userId || ''
  const currentParticipantUserIds = participantUserIds.length > 0
    ? participantUserIds
    : attendees.map((attendee) => attendee.userId).filter(Boolean)
  const battleParticipantOneId = currentParticipantUserIds[0] ?? ''
  const battleParticipantTwoId = currentParticipantUserIds[1] ?? ''
  const isGroupPractice = type === 'group_practice'
  const isIndividual = type === 'individual'
  const isBattleReview = type === 'battle_review'
  const groupScheduleState = getGroupPracticeScheduleState(
    date,
    time,
    availabilitySlots,
    availabilityLoaded,
  )

  const resetSchedulingFeedback = () => {
    setSubmitError(null)
    setIsSubmitConflict(false)
  }

  useEffect(() => {
    if (!participantUserId && attendees[0]?.userId) {
      setParticipantUserId(attendees[0].userId)
    }
    if (participantUserIds.length === 0 && attendees.length > 0) {
      setParticipantUserIds(attendees.map((attendee) => attendee.userId).filter(Boolean))
    }
  }, [attendees, participantUserId, participantUserIds.length])

  useEffect(() => {
    setSubmitError(null)
    setIsSubmitConflict(false)
    const previousType = previousTypeRef.current
    previousTypeRef.current = type

    if (isIndividual) {
      setMaxAttendees(1)
      return
    }

    if (isGroupPractice && previousType === 'individual') {
      setMaxAttendees(defaultGroupCapacity)
    }
  }, [defaultGroupCapacity, isGroupPractice, isIndividual, type])

  useEffect(() => {
    if (
      !isEditing
      && isGroupPractice
      && groupScheduleState.recommendedTime
      && time === '19:00'
    ) {
      setTime(groupScheduleState.recommendedTime)
    }
  }, [groupScheduleState.recommendedTime, isEditing, isGroupPractice, time])

  const creationBlocked = isSessionFormCreationBlocked({
    isLoading,
    isSubmitConflict,
    date,
    time,
    topic,
    type,
    maxAttendees,
    groupScheduleBlocked: !isEditing && isGroupPractice && groupScheduleState.blocksCreation,
    participantUserId: currentParticipantUserId,
    participantUserIds: currentParticipantUserIds,
  })

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null)
    setIsSubmitConflict(false)

    if (!date.trim()) {
      setSubmitError('Обери дату сесії.')
      return
    }

    if (isGroupPractice && maxAttendees < 1) {
      setSubmitError('Місткість має бути більшою за 0.')
      return
    }

    const nextParticipantUserId = isIndividual ? currentParticipantUserId.trim() : ''
    if (isIndividual && !nextParticipantUserId) {
      setSubmitError('Учасника не вибрано.')
      return
    }

    const nextParticipantUserIds = isBattleReview
      ? currentParticipantUserIds.map((id) => id.trim()).filter(Boolean)
      : []
    if (
      isBattleReview &&
      (nextParticipantUserIds.length !== BATTLE_PARTICIPANTS_REQUIRED ||
        new Set(nextParticipantUserIds).size !== BATTLE_PARTICIPANTS_REQUIRED)
    ) {
      setSubmitError('Для Zoom Battle потрібно вибрати 2 учасників.')
      return
    }

    const payload: SessionFormPayload = {
      scheduledAt: buildScheduledAtIso(date, time),
      topic,
      type,
      zoomLink: zoomLink || undefined,
    }
    if (isIndividual) payload.participantUserId = nextParticipantUserId
    if (isBattleReview) payload.participantUserIds = nextParticipantUserIds
    if (isGroupPractice) payload.maxAttendees = maxAttendees
    try {
      await onSubmit(payload)
    } catch (error) {
      setSubmitError(getSessionFormSubmitErrorMessage(error))
      setIsSubmitConflict(isSessionSchedulingConflictError(error))
    }
  };

  const submitErrorClassName = getSessionFormSubmitErrorClassName(isSubmitConflict)

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/10 bg-white/[0.04] p-4 mt-3 flex flex-col gap-3"
    >
      <p className="text-[12px] font-semibold text-white/60 uppercase tracking-wider">{title}</p>

      <div>
        <label className="text-[11px] text-white/40 mb-1 block">Тип</label>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {COACH_ZOOM_SESSION_TYPES.map((option) => {
            const selected = type === option
            const format = getZoomFormatInfo(option)
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  resetSchedulingFeedback()
                  setType(option)
                }}
                aria-pressed={selected}
                className={[
                  'rounded-lg border px-3 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--accent-rgb),0.45)]',
                  selected
                    ? 'border-[rgba(var(--accent-rgb),0.46)] bg-[rgba(var(--accent-rgb),0.18)] text-white shadow-[0_0_0_1px_rgba(var(--accent-rgb),0.16)]'
                    : 'border-transparent bg-transparent text-white/55 hover:border-white/10 hover:bg-white/[0.04] hover:text-white/80',
                ].join(' ')}
              >
                <span className="block text-[13px] font-semibold leading-tight">{getSessionMeta({ type: option })}</span>
                <span className={['mt-1 block text-[11px] leading-snug', selected ? 'text-[rgb(var(--accent-soft-rgb))]' : 'text-white/38'].join(' ')}>
                  {format.priceLabel ?? format.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-white/40 mb-1 block">Дата</label>
          <input
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
            value={formatDatePickerValue(date)}
            onChange={e => {
              resetSchedulingFeedback()
              setDate(parseDatePickerValue(e.target.value))
            }}
            placeholder="Обрати дату"
            aria-label="Обрати дату"
            type="date"
          />
        </div>
        <div>
          <label className="text-[11px] text-white/40 mb-1 block">Час</label>
          <input
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
            value={time}
            onChange={e => {
              resetSchedulingFeedback()
              setTime(e.target.value)
            }}
            placeholder="19:00"
            aria-label="Обрати час"
            type="time"
          />
        </div>
      </div>

      <div>
        <label className="text-[11px] text-white/40 mb-1 block">Тема</label>
        <input
          className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
          value={topic}
          onChange={e => {
            resetSchedulingFeedback()
            setTopic(e.target.value)
          }}
          placeholder="Щотижнева сесія балансу"
          required
        />
      </div>

      {isIndividual && (
        <div>
          <label className="text-[11px] text-white/40 mb-1 block">Учасник</label>
          <select
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-white/25"
            value={currentParticipantUserId}
            onChange={e => {
              resetSchedulingFeedback()
              setParticipantUserId(e.target.value)
            }}
            required
          >
            <option value="">Оберіть користувача</option>
            {individualParticipants.map(user => {
              const label = [
                [user.firstName, user.lastName].filter(Boolean).join(' ').trim(),
                user.email,
              ].find(Boolean) ?? user.id
              return (
                <option key={user.id} value={user.id}>
                  {label}
                </option>
              )
            })}
          </select>
          {individualParticipants.length === 0 && (
            <p className="mt-1 text-[11px] text-white/45">
              Немає доступних користувачів для індивідуальної сесії.
            </p>
          )}
          {submitError && (
            <div className={`mt-1 ${submitErrorClassName}`}>
              {submitError}
            </div>
          )}
        </div>
      )}

      {isBattleReview && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-white/40 mb-1 block">Учасник 1</label>
            <select
              className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-white/25"
              value={battleParticipantOneId}
              onChange={e => setParticipantUserIds([e.target.value, battleParticipantTwoId].filter(Boolean))}
              required
            >
              <option value="">Оберіть користувача</option>
              {individualParticipants
                .filter(user => user.id !== battleParticipantTwoId)
                .map(user => {
                  const label = [
                    [user.firstName, user.lastName].filter(Boolean).join(' ').trim(),
                    user.email,
                  ].find(Boolean) ?? user.id
                  return (
                    <option key={user.id} value={user.id}>
                      {label}
                    </option>
                  )
                })}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-white/40 mb-1 block">Учасник 2</label>
            <select
              className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white focus:outline-none focus:border-white/25"
              value={battleParticipantTwoId}
              onChange={e => setParticipantUserIds([battleParticipantOneId, e.target.value].filter(Boolean))}
              required
            >
              <option value="">Оберіть користувача</option>
              {individualParticipants
                .filter(user => user.id !== battleParticipantOneId)
                .map(user => {
                  const label = [
                    [user.firstName, user.lastName].filter(Boolean).join(' ').trim(),
                    user.email,
                  ].find(Boolean) ?? user.id
                  return (
                    <option key={user.id} value={user.id}>
                      {label}
                    </option>
                  )
                })}
            </select>
          </div>
          {submitError && (
            <div className={`col-span-2 ${submitErrorClassName}`}>
              {submitError}
            </div>
          )}
        </div>
      )}

      {isGroupPractice && (
        <div className="space-y-2">
          <label className="text-[11px] text-white/40 mb-1 block">Місткість</label>
          <input
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
            value={String(maxAttendees)}
            onChange={e => {
              resetSchedulingFeedback()
              const nextValue = Number(e.target.value)
              if (!Number.isNaN(nextValue)) {
                setMaxAttendees(nextValue)
              }
            }}
            placeholder="50"
            type="number"
            min={1}
          />
          <p
            className={
              groupScheduleState.kind === 'success'
                ? GROUP_SCHEDULE_SUCCESS_CLASS
                : groupScheduleState.kind === 'warning'
                  ? GROUP_SCHEDULE_WARNING_CLASS
                  : GROUP_SCHEDULE_INFO_CLASS
            }
            role="status"
          >
            {groupScheduleState.message}
          </p>
        </div>
      )}

      <div>
        <label className="text-[11px] text-white/40 mb-1 block">Zoom-посилання</label>
        <input
          className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
          value={zoomLink}
          onChange={e => setZoomLink(e.target.value)}
          placeholder="можна додати пізніше"
          type="url"
          autoFocus={autoFocusZoomLink}
        />
      </div>

      {submitError && !isIndividual && !isBattleReview && (
        <div className={submitErrorClassName}>
          {submitError}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={creationBlocked}
          className="flex-1 rounded-lg border border-[rgba(var(--accent-rgb),0.3)] bg-[rgba(var(--accent-rgb),0.12)] py-2 text-[13px] font-semibold text-[rgb(var(--accent-rgb))] transition-all hover:bg-[rgba(var(--accent-rgb),0.2)] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.04] disabled:text-white/40 disabled:opacity-100"
        >
          {isLoading ? loadingLabel : submitLabel}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg border border-white/10 text-[13px] text-white/50 hover:text-white/80 transition-all"
        >
          {closeLabel}
        </button>
      </div>
    </form>
  );
}
