import { useEffect, useMemo, useRef, useState } from 'react'

import { useGetAttendeesQuery } from '../../services/zoom.api'
import type {
  CreateSessionPayload,
  ZoomSessionType,
} from '../../zoom.types'
import { COACH_ZOOM_SESSION_TYPES } from '../../zoom.types'
import { getSessionMeta } from '../../zoom.utils'
import type { AdminUser } from '@/features/admin/services/ownership.types'

type SessionFormPayload = CreateSessionPayload & {
  participantUserId?: string
  participantUserIds?: string[]
}

const DEFAULT_GROUP_CAPACITY = 50
const BATTLE_PARTICIPANTS_REQUIRED = 2

function formatDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`
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
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function buildScheduledAtIso(dateValue: string, timeValue: string): string {
  const [day, month, year] = dateValue.split('.').map(Number)
  const [hours, minutes] = timeValue.split(':').map(Number)
  return new Date(year, month - 1, day, hours, minutes, 0).toISOString()
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
    isEditing && initialScheduledAt ? formatDateInputValue(initialScheduledAt) : '',
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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null)

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
    onSubmit(payload);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-white/10 bg-white/[0.04] p-4 mt-3 flex flex-col gap-3"
    >
      <p className="text-[12px] font-semibold text-white/60 uppercase tracking-wider">{title}</p>

      <div>
        <label className="text-[11px] text-white/40 mb-1 block">Тип</label>
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {COACH_ZOOM_SESSION_TYPES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setType(option)}
              aria-pressed={type === option}
              className={[
                'rounded-lg px-3 py-2 text-[13px] font-semibold transition-all',
                type === option
                  ? 'bg-[rgba(var(--accent-rgb),0.12)] text-[rgb(var(--accent-rgb))] border border-[rgba(var(--accent-rgb),0.3)]'
                  : 'text-white/65 hover:text-white',
              ].join(' ')}
            >
              {getSessionMeta({ type: option })}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-white/40 mb-1 block">Дата</label>
          <input
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
            value={formatDatePickerValue(date)}
            onChange={e => setDate(parseDatePickerValue(e.target.value))}
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
            onChange={e => setTime(e.target.value)}
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
          onChange={e => setTopic(e.target.value)}
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
            onChange={e => setParticipantUserId(e.target.value)}
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
            <p className="mt-1 text-[11px] text-white/55">
              {submitError}
            </p>
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
            <p className="col-span-2 text-[11px] text-white/55">
              {submitError}
            </p>
          )}
        </div>
      )}

      {isGroupPractice && (
        <div>
          <label className="text-[11px] text-white/40 mb-1 block">Місткість</label>
          <input
            className="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/25"
            value={String(maxAttendees)}
            onChange={e => {
              const nextValue = Number(e.target.value)
              if (!Number.isNaN(nextValue)) {
                setMaxAttendees(nextValue)
              }
            }}
            placeholder="50"
            type="number"
            min={1}
          />
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
        <p className="text-[11px] text-white/55">
          {submitError}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-2 rounded-lg bg-[rgba(var(--accent-rgb),0.12)] border border-[rgba(var(--accent-rgb),0.3)] text-[rgb(var(--accent-rgb))] text-[13px] font-semibold hover:bg-[rgba(var(--accent-rgb),0.2)] transition-all disabled:opacity-50"
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
