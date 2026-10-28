import { formatCoachSessionRange } from './components/coach/coachPanelPresentation'
import { CheckCircle2 } from 'lucide-react'
// apps/web/src/features/zoom/CoachZoomPanel.tsx

import { SectionLabel, buildCoachWeekDays } from './components/coach/coachPanelPresentation'
import type { BattleSession, BattleOutcome } from './components/coach/coachPanelPresentation'
import { CoachSessionActions } from './components/coach/CoachSessionActions'
import { CoachActionModal } from './components/coach/CoachActionModal'
import { BattleCard } from './components/coach/BattleCard'
import { CoachParticipantsSummary, CoachAnalyticsSummary, CoachMoreSummary } from './components/coach/CoachSummaries'
import { CoachPanelHeader } from './components/coach/CoachPanelHeader'
import { useAppSelector } from '@/app/hooks'
import { useGetUsersQuery } from '@/features/admin/services/ownership.api'
import { useEffect, useRef, useState } from 'react'
import { BattleInstruction } from './components/BattleInstruction'
import { ZoomAvailabilityEditor } from './ZoomAvailabilityEditor'
import { SessionCard } from './components/calendar/SessionCard'
import { SessionForm } from './components/calendar/SessionForm'
import { CoachWeeklyDiary as CoachWeeklyDiaryComponent } from './components/calendar/CoachWeeklyDiary'
import {
  useCreateZoomSessionMutation,
  useApproveZoomCommerceRequestMutation,
  useCancelZoomSessionMutation,
  useDeleteFreeIndividualSlotMutation,
  useFinalizeBattleMutation,
  useGetCalendarSessionsQuery,
  useGetCoachProfileQuery,
  useGetAvailabilityWeekQuery,
  useRejectZoomCommerceRequestMutation,
  useRescheduleCoachSessionMutation,
  useUpdateZoomSessionMutation,
} from './zoom.api'
import type {
  CreateSessionPayload,
  ZoomCalendarSession,
} from './zoom.types'
import {
  getNormalizedSessionType,
  getIndividualPresentation,
} from './zoom.utils'
import { buildCalendarEvent } from './utils/calendar-event'
import {
  getKyivDateKey,
  getKyivWeekRange,
  createUtcDateForTimeZone,
  getTimeZoneDateParts,
  KYIV_TIMEZONE,
} from './utils/zoomDateTime.utils'

// ── Types ─────────────────────────────────────────────────────────────────────

// ── CoachZoomPanel ────────────────────────────────────────────────────────────

export { CoachSessionActions } from './components/coach/CoachSessionActions'

export interface CoachZoomPanelProps {
  expertId: string | null
  requestId?: string | null
  activeScreen?: 'calendar' | 'participants' | 'battle' | 'analytics' | 'more'
}

/** The panel identity belongs to the authenticated coach's linked Expert, never a session participant. */
export function resolveCoachHeaderName(displayName: string | null | undefined): string {
  return displayName?.trim() || 'Профіль коуча недоступний'
}

/** A URL requestId only selects data already authorized for this coach. */
export function findPendingCoachRequestSession(
  sessions: readonly ZoomCalendarSession[],
  requestId: string | null | undefined,
): ZoomCalendarSession | null {
  if (!requestId) return null

  return sessions.find((session) => (
    session.commerceRequestId === requestId && session.commerceStatus === 'REQUESTED'
  )) ?? null
}

export function getCoachSessionInitialValues(
  session: ZoomCalendarSession,
  participantUserIds: string[] = []
): Partial<CreateSessionPayload> {
  return {
    scheduledAt: session.scheduledAt,
    topic: session.topic,
    type: session.type,
    zoomLink: session.zoomLink,
    maxAttendees:
      session.attendeesCount !== undefined &&
      session.remainingSlots !== undefined
        ? session.attendeesCount + session.remainingSlots
        : session.type === 'individual'
          ? 1
          : undefined,
    participantUserId:
      session.type === 'individual' ? participantUserIds[0] : undefined,
    participantUserIds:
      session.type === 'battle_review' ? participantUserIds : undefined,
  }
}

export function getCoachRescheduleErrorMessage(code: string | null): string {
  const messages: Record<string, string> = {
    RESCHEDULE_INVALID_TIME: 'Вкажи майбутні дату й час за Києвом.',
    RESCHEDULE_FORBIDDEN: 'Ти не маєш прав переносити цей слот.',
    RESCHEDULE_SESSION_NOT_FOUND: 'Слот більше не існує. Онови календар.',
    RESCHEDULE_TARGET_UNAVAILABLE: 'Цей час недоступний або вже зайнятий.',
    RESCHEDULE_CONCURRENT_MODIFICATION: 'Календар змінився. Онови дані та спробуй ще раз.',
    RESCHEDULE_SESSION_IMMUTABLE: 'Цей слот більше не можна переносити.',
    RESCHEDULE_ATTENDEES_LOCKED: 'Слот має учасників і не може бути перенесений.',
    RESCHEDULE_COMMERCE_LOCKED: 'Слот має активне бронювання або оплату й не може бути перенесений.',
    RESCHEDULE_SWAP_LOCKED: 'Для цього слота вже є запит на перенесення.',
    RESCHEDULE_DURATION_UNSUPPORTED: 'Тривалість слота не підтримує перенесення.',
  }
  return messages[code ?? ''] ?? 'Не вдалося перенести слот. Спробуй ще раз.'
}

function isCoachRescheduleEligible(session: ZoomCalendarSession): boolean {
  const groupPractice = getNormalizedSessionType(session) === 'group_practice'
  return (session.isDisposableIndividualSlot === true || groupPractice)
    && session.status === 'SCHEDULED'
    && !session.commerceRequestId
    && !session.commerceStatus
    && new Date(session.scheduledAt).getTime() > Date.now()
}

function buildCoachRescheduleIso(dateValue: string, timeValue: string): string | null {
  const [year, month, day] = dateValue.split('-').map(Number)
  const [hour, minute] = timeValue.split(':').map(Number)
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null
  return createUtcDateForTimeZone({ year, month, day, hour, minute, timeZone: KYIV_TIMEZONE }).toISOString()
}

function getCoachRescheduleInputValues(value: string): { date: string; time: string } {
  const parts = getTimeZoneDateParts(new Date(value), KYIV_TIMEZONE)
  return {
    date: `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`,
    time: `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`,
  }
}

export function CoachZoomPanel({
  expertId,
  requestId = null,
  activeScreen: activeCoachScreen = 'calendar',
}: CoachZoomPanelProps) {
  const [weekAnchor, setWeekAnchor] = useState(() => new Date())
  const [calendarMode, setCalendarMode] = useState<'calendar' | 'availability'>('calendar')
  const weekRange = getKyivWeekRange(weekAnchor)
  const user = useAppSelector((state) => state.auth.user)
  const previewRole = user?.activeRole ?? user?.role ?? 'USER'
  const canManageZoom =
    previewRole === 'EXPERT' ||
    previewRole === 'ADMIN' ||
    previewRole === 'SUPERADMIN'
  const { data: coachProfile } = useGetCoachProfileQuery(undefined, {
    skip: !canManageZoom,
  })

  const {
    data: sessions = [],
    isLoading: isLoadingSessions,
    isFetching: isFetchingSessions,
  } = useGetCalendarSessionsQuery(
    {
      from: weekRange.from,
      to: weekRange.to,
      role: 'coach',
      userId: expertId ?? 'staff',
      expertId: expertId ?? undefined,
    },
    {}
  )
  const availabilityWeekFrom = getKyivDateKey(new Date(weekRange.from))
  const { data: effectiveAvailability = [] } = useGetAvailabilityWeekQuery(availabilityWeekFrom)
  const [finalize] = useFinalizeBattleMutation()
  const [approveCommerceRequest, { isLoading: isApprovingCommerce }] =
    useApproveZoomCommerceRequestMutation()
  const [rejectCommerceRequest, { isLoading: isRejectingCommerce }] =
    useRejectZoomCommerceRequestMutation()
  const [createSession, { isLoading: isCreating }] =
    useCreateZoomSessionMutation()
  const [cancelZoomSession, { isLoading: isCancellingSession }] =
    useCancelZoomSessionMutation()
  const [deleteFreeIndividualSlot, { isLoading: isDeletingSlot }] =
    useDeleteFreeIndividualSlotMutation()

  const [battlesOpen, setBattlesOpen] = useState(true)
  const [instructionsOpen, setInstructionsOpen] = useState(false)
  const [createDate, setCreateDate] = useState<Date | null>(null)
  const [createInitialValues, setCreateInitialValues] = useState<
    Partial<CreateSessionPayload> | undefined
  >(undefined)
  const [selectedSession, setSelectedSession] = useState<ZoomCalendarSession | null>(null)
  const [selectedSessionView, setSelectedSessionView] = useState<'actions' | 'details'>('actions')
  const [requestActionError, setRequestActionError] = useState<string | null>(null)
  const [completionSessionId, setCompletionSessionId] = useState<string | null>(null)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingFocus, setEditingFocus] = useState<'zoomLink' | 'schedule' | null>(null)
  const [editingReturnView, setEditingReturnView] = useState<'actions' | 'details'>('actions')
  const [cancellingSessionId, setCancellingSessionId] = useState<string | null>(null)
  const [cancelSessionError, setCancelSessionError] = useState<string | null>(null)
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null)
  const [deleteSlotError, setDeleteSlotError] = useState<string | null>(null)
  const [deletedSlotSuccess, setDeletedSlotSuccess] = useState(false)
  const [rescheduleDraft, setRescheduleDraft] = useState<{
    session: ZoomCalendarSession
    scheduledAt: string
    dateValue: string
    timeValue: string
    confirming: boolean
  } | null>(null)
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)
  const resolvedDeepLinkRequestId = useRef<string | null>(null)
  const rescheduleRequestVersion = useRef(0)

  useEffect(() => {
    if (!requestId) {
      resolvedDeepLinkRequestId.current = null
      return
    }
    if (isLoadingSessions || isFetchingSessions || resolvedDeepLinkRequestId.current === requestId) return

    const requestSession = findPendingCoachRequestSession(sessions, requestId)
    resolvedDeepLinkRequestId.current = requestId
    if (!requestSession) return

    setSelectedSession(requestSession)
    setSelectedSessionView('actions')
    setRequestActionError(null)
    setCompletionSessionId(null)
    setCreateDate(null)
  }, [isFetchingSessions, isLoadingSessions, requestId, sessions])

  // Free individual inventory stays visible so a coach can use the dedicated
  // reschedule command. The server remains the final safety authority.
  const operationalSessions = sessions
  const weekDays = buildCoachWeekDays(operationalSessions, weekRange.from, effectiveAvailability)
  const activeBattles = sessions.filter(
    (session) =>
      getNormalizedSessionType(session) === 'battle_review' &&
      session.status !== 'COMPLETED' &&
      session.status !== 'CANCELLED'
  )
  const totalAttendees = sessions.reduce(
    (sum, session) => sum + (session.attendeesCount ?? 0),
    0
  )
  const displayBattles: BattleSession[] = activeBattles as BattleSession[]
  const coachHeaderName = resolveCoachHeaderName(coachProfile?.profile?.displayName)
  const { data: coachUsers = [] } = useGetUsersQuery(undefined, {
    skip: !canManageZoom,
  })
  const selectedSessionData = selectedSession
    ? (sessions.find((session) => session.id === selectedSession.id) ?? selectedSession)
    : null
  const selectedIndividualPresentation = selectedSessionData
    ? getIndividualPresentation(selectedSessionData)
    : null
  const editingSessionData = editingSessionId
    ? (sessions.find((session) => session.id === editingSessionId) ?? null)
    : null
  const [updateSession, { isLoading: isUpdating }] =
    useUpdateZoomSessionMutation()
  const [rescheduleCoachSession, { isLoading: isRescheduling }] =
    useRescheduleCoachSessionMutation()

  const handleFinalize = (sessionId: string, outcome: BattleOutcome) => {
    finalize({ sessionId, outcome }).catch(console.error)
  }

  const handleCreate = async (payload: CreateSessionPayload) => {
    await createSession(payload).unwrap()
    closeCoachActionModal()
  }

  const handleUpdate = async (payload: CreateSessionPayload) => {
    if (!editingSessionData) {
      return
    }

    await updateSession({ id: editingSessionData.id, patch: payload }).unwrap()
    closeCoachActionModal()
  }

  const closeCoachActionModal = () => {
    setSelectedSession(null)
    setSelectedSessionView('actions')
    setRequestActionError(null)
    setCompletionSessionId(null)
    setEditingSessionId(null)
    setEditingFocus(null)
    setEditingReturnView('actions')
    setCreateDate(null)
    setCreateInitialValues(undefined)
    setCancellingSessionId(null)
    setCancelSessionError(null)
    setDeletingSlotId(null)
    setDeleteSlotError(null)
    setDeletedSlotSuccess(false)
    rescheduleRequestVersion.current += 1
    setRescheduleDraft(null)
    setRescheduleError(null)
  }

  const requestSessionCancellation = (sessionId: string) => {
    setCancellingSessionId(sessionId)
    setCancelSessionError(null)
  }

  const requestFreeSlotDeletion = (sessionId: string) => {
    setDeletingSlotId(sessionId)
    setDeleteSlotError(null)
    setDeletedSlotSuccess(false)
  }

  const returnToSessionActions = () => {
    setSelectedSessionView('actions')
    setCompletionSessionId(null)
    setCancellingSessionId(null)
    setCancelSessionError(null)
    setDeletingSlotId(null)
    setDeleteSlotError(null)
    setDeletedSlotSuccess(false)
  }

  const openSessionEditor = (sessionId: string, reschedule: boolean) => {
    setEditingReturnView(selectedSessionView)
    setEditingSessionId(sessionId)
    setEditingFocus(reschedule ? 'schedule' : null)
  }

  const openReschedule = (session: ZoomCalendarSession, scheduledAt = session.scheduledAt) => {
    if (!isCoachRescheduleEligible(session)) return
    const input = getCoachRescheduleInputValues(scheduledAt)
    setSelectedSession(session)
    setSelectedSessionView('actions')
    setRescheduleError(null)
    setRescheduleDraft({
      session,
      scheduledAt,
      dateValue: input.date,
      timeValue: input.time,
      confirming: scheduledAt !== session.scheduledAt,
    })
  }

  const updateRescheduleDraft = (patch: { scheduledAt?: string; dateValue?: string; timeValue?: string; confirming?: boolean }) => {
    setRescheduleDraft((current) => current ? { ...current, ...patch } : null)
  }

  const confirmReschedule = async () => {
    if (!rescheduleDraft || isRescheduling || rescheduleDraft.scheduledAt === rescheduleDraft.session.scheduledAt) return
    const version = ++rescheduleRequestVersion.current
    setRescheduleError(null)
    try {
      await rescheduleCoachSession({ id: rescheduleDraft.session.id, scheduledAt: rescheduleDraft.scheduledAt }).unwrap()
      if (version === rescheduleRequestVersion.current) closeCoachActionModal()
    } catch (error) {
      if (version !== rescheduleRequestVersion.current) return
      const code = error && typeof error === 'object' && 'data' in error
        ? (error as { data?: { error?: string } }).data?.error ?? null
        : null
      setRescheduleError(getCoachRescheduleErrorMessage(code))
    }
  }

  const returnFromSessionEditor = () => {
    setEditingSessionId(null)
    setEditingFocus(null)
    setSelectedSessionView(editingReturnView)
  }

  const handleRequestDecision = async (approve: boolean) => {
    if (!selectedSessionData?.commerceRequestId) return
    setRequestActionError(null)
    try {
      const decide = approve ? approveCommerceRequest : rejectCommerceRequest
      await decide(selectedSessionData.commerceRequestId).unwrap()
      closeCoachActionModal()
    } catch {
      setRequestActionError('Не вдалося оновити запит. Спробуй ще раз.')
    }
  }

  const confirmSessionCancellation = async () => {
    if (!cancellingSessionId || isCancellingSession) return

    setCancelSessionError(null)
    try {
      await cancelZoomSession(cancellingSessionId).unwrap()
      closeCoachActionModal()
    } catch {
      setCancelSessionError('Не вдалося скасувати Zoom-сесію. Спробуй ще раз.')
    }
  }

  const confirmFreeSlotDeletion = async () => {
    if (!deletingSlotId || isDeletingSlot) return

    setDeleteSlotError(null)
    try {
      await deleteFreeIndividualSlot(deletingSlotId).unwrap()
      setDeletingSlotId(null)
      setDeletedSlotSuccess(true)
    } catch {
      setDeleteSlotError('Не вдалося видалити слот. Спробуй ще раз.')
    }
  }

  const handleCreateForDate = (date: Date) => {
    if (!canManageZoom) return
    setSelectedSession(null)
    setCompletionSessionId(null)
    setEditingSessionId(null)
    setEditingFocus(null)
    setCreateInitialValues(undefined)
    setCreateDate(date)
  }

  const handleAddToCalendar = (session: ZoomCalendarSession) => {
    const icsContent = buildCalendarEvent(session)
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'focus-zoom-practice.ics'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const goToPreviousWeek = () => {
    setWeekAnchor((current) => new Date(current.getTime() - 7 * 24 * 60 * 60 * 1000))
  }

  const goToNextWeek = () => {
    setWeekAnchor((current) => new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000))
  }

  const goToCurrentWeek = () => {
    setWeekAnchor(new Date())
  }

  return (
    <div className="flex flex-col gap-3 text-white" data-coach-zoom-panel="weekly-diary">
      <CoachPanelHeader
        coachHeaderName={coachHeaderName}
        canManageZoom={canManageZoom}
        activeCoachScreen={activeCoachScreen}
        calendarMode={calendarMode}
        weekFrom={weekRange.from}
        onCreateSession={handleCreateForDate}
        onChangeCalendarMode={setCalendarMode}
        onPreviousWeek={goToPreviousWeek}
        onCurrentWeek={goToCurrentWeek}
        onNextWeek={goToNextWeek}
      />

      {activeCoachScreen === 'calendar' && calendarMode === 'availability' ? (
        <ZoomAvailabilityEditor
          weekAnchor={weekAnchor}
          sessions={sessions}
          onPreviousWeek={goToPreviousWeek}
          onNextWeek={goToNextWeek}
          onCurrentWeek={goToCurrentWeek}
          onSelectSession={(session) => {
            setSelectedSession(session)
            setSelectedSessionView('actions')
            setRequestActionError(null)
            setCompletionSessionId(null)
            setCreateDate(null)
          }}
        />
      ) : <>
      {activeCoachScreen === 'calendar' && <CoachWeeklyDiaryComponent
        days={weekDays}
        onSelectSession={(session) => {
          setSelectedSession(session)
          setSelectedSessionView('actions')
          setRequestActionError(null)
          setCompletionSessionId(null)
          setCreateDate(null)
        }}
        onDeleteSlot={(session) => requestFreeSlotDeletion(session.id)}
        onProposeReschedule={openReschedule}
        onCreateSession={handleCreateForDate}
        canManageZoom={canManageZoom}
      />}

      {activeCoachScreen === 'battle' && <section id="battle" className="scroll-mt-4">
        <SectionLabel
          label="АКТИВНІ BATTLES"
          count={displayBattles.length}
          collapsible
          open={battlesOpen}
          onToggle={() => setBattlesOpen((open) => !open)}
          action={
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                setInstructionsOpen(true)
              }}
              className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold normal-case tracking-normal text-white/75 transition hover:bg-white/[0.08] hover:text-white"
            >
              Інструкція
            </button>
          }
        />
        {battlesOpen && (
          displayBattles.length > 0 ? (
            <div className="flex flex-col gap-2">
              {displayBattles.map((session) => (
                <BattleCard
                  key={session.id}
                  session={session}
                  onFinalize={handleFinalize}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.025] px-3 py-3 text-sm text-white/45">
              Активних battles немає
            </div>
          )
        )}
      </section>}
      {activeCoachScreen === 'participants' && <CoachParticipantsSummary />}
      {activeCoachScreen === 'analytics' && <CoachAnalyticsSummary sessions={sessions} attendeeCount={totalAttendees} activeBattles={displayBattles.length} />}
      {activeCoachScreen === 'more' && <CoachMoreSummary />}
      </>}

      {selectedSessionData && !editingSessionData && (
        <CoachActionModal
          title={cancellingSessionId === selectedSessionData.id
            ? 'Скасувати сесію'
            : rescheduleDraft?.confirming
              ? 'Підтвердити перенесення'
              : rescheduleDraft
                ? getNormalizedSessionType(rescheduleDraft.session) === 'group_practice' ? 'Перенести практику' : 'Перенести слот'
            : deletedSlotSuccess
              ? 'Слот видалено'
            : deletingSlotId === selectedSessionData.id
              ? 'ВИДАЛИТИ СЛОТ?'
            : completionSessionId === selectedSessionData.id ? 'Завершити сесію'
            : selectedSessionView === 'details'
              ? selectedIndividualPresentation?.kind === 'INDIVIDUAL_SLOT'
                ? 'ДЕТАЛІ СЛОТА'
                : selectedIndividualPresentation
                  ? 'ДЕТАЛІ СЕСІЇ'
                  : 'ДЕТАЛІ СЕСІЇ'
            : selectedSessionData.commerceRequestId && ['REQUESTED', 'APPROVED_PENDING_PAYMENT'].includes(selectedSessionData.commerceStatus ?? '') ? 'Дії з запитом користувача'
            : getNormalizedSessionType(selectedSessionData) === 'group_practice' ? 'Дії з груповою практикою' : selectedIndividualPresentation?.kind === 'INDIVIDUAL_SLOT' ? 'Дії зі слотом' : 'Дії з сесією'}
          onClose={closeCoachActionModal}
          onBack={rescheduleDraft?.confirming
            ? () => updateRescheduleDraft({ confirming: false })
            : cancellingSessionId === selectedSessionData.id || deletingSlotId === selectedSessionData.id || selectedSessionView === 'details'
              ? returnToSessionActions
              : undefined}
        >
          {rescheduleDraft ? (
            <div className="space-y-4">
              {rescheduleDraft.confirming ? (
                <>
                  <p className="text-sm leading-5 text-white/80">{getNormalizedSessionType(rescheduleDraft.session) === 'group_practice'
                    ? 'Усі записані учасники залишаться в практиці та отримають повідомлення.'
                    : 'Підтвердь перенесення вільного слота. Зміна набуде чинності лише після підтвердження.'}</p>
                  <div className="space-y-2 rounded-xl border border-sky-300/20 bg-sky-500/[0.07] px-3 py-3 text-xs text-sky-50">
                    <p><span className="text-sky-100/60">Було:</span> {new Intl.DateTimeFormat('uk-UA', { timeZone: KYIV_TIMEZONE, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(rescheduleDraft.session.scheduledAt))}</p>
                    <p><span className="text-sky-100/60">Буде:</span> {new Intl.DateTimeFormat('uk-UA', { timeZone: KYIV_TIMEZONE, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(rescheduleDraft.scheduledAt))}</p>
                    <p className="pt-1 text-[11px] text-sky-100/55">час за Києвом</p>
                  </div>
                  {rescheduleError && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-100">{rescheduleError}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => void confirmReschedule()} disabled={isRescheduling || rescheduleDraft.scheduledAt === rescheduleDraft.session.scheduledAt} className="rounded-xl border border-sky-300/35 bg-sky-500/20 px-4 py-2.5 text-[12px] font-semibold text-sky-50 transition hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50">{isRescheduling ? 'ПЕРЕНОСИМО…' : 'ПІДТВЕРДИТИ ПЕРЕНЕСЕННЯ'}</button>
                    <button type="button" onClick={closeCoachActionModal} disabled={isRescheduling} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] font-semibold text-white/70 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50">СКАСУВАТИ</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-white/75">{getNormalizedSessionType(rescheduleDraft.session) === 'group_practice'
                    ? 'Обери нові дату й час для практики.'
                    : 'Обери нові дату й час для вільного слота.'}</p>
                  <p className="text-[11px] text-sky-100/55">час за Києвом</p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1 text-[11px] text-sky-100/65">Дата
                      <input type="date" value={rescheduleDraft.dateValue} onChange={(event) => updateRescheduleDraft({ dateValue: event.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-2 py-2 text-sm text-white" />
                    </label>
                    <label className="space-y-1 text-[11px] text-sky-100/65">Час
                      <input type="time" value={rescheduleDraft.timeValue} onChange={(event) => updateRescheduleDraft({ timeValue: event.target.value })} className="w-full rounded-lg border border-white/10 bg-slate-950/50 px-2 py-2 text-sm text-white" />
                    </label>
                  </div>
                  {rescheduleError && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-100">{rescheduleError}</p>}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => {
                      const scheduledAt = buildCoachRescheduleIso(rescheduleDraft.dateValue, rescheduleDraft.timeValue)
                      if (!scheduledAt || new Date(scheduledAt).getTime() <= Date.now()) {
                        setRescheduleError(getCoachRescheduleErrorMessage('RESCHEDULE_INVALID_TIME'))
                        return
                      }
                      setRescheduleError(null)
                      updateRescheduleDraft({ scheduledAt, confirming: true })
                    }} className="rounded-xl border border-sky-300/35 bg-sky-500/20 px-4 py-2.5 text-[12px] font-semibold text-sky-50 transition hover:bg-sky-500/30">ПРОДОВЖИТИ</button>
                    <button type="button" onClick={closeCoachActionModal} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] font-semibold text-white/70 transition hover:bg-white/[0.08]">СКАСУВАТИ</button>
                  </div>
                </>
              )}
            </div>
          ) : deletedSlotSuccess ? (
            <div className="flex flex-col items-center gap-4 py-5 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-500/15 text-emerald-100"><CheckCircle2 className="h-7 w-7" aria-hidden="true" /></span>
              <div>
                <p className="text-base font-semibold text-white">Слот видалено</p>
                <p className="mt-1 text-sm leading-5 text-white/70">Вільний слот прибрано з календаря. Користувачі більше не можуть на нього записатися.</p>
              </div>
              <button type="button" onClick={closeCoachActionModal} className="w-full rounded-xl border border-sky-300/35 bg-sky-500/20 px-4 py-2.5 text-[12px] font-semibold text-sky-50 transition hover:bg-sky-500/30">ЗРОЗУМІЛО</button>
            </div>
          ) : cancellingSessionId === selectedSessionData.id ? (
            <div className="space-y-4">
              <p className="text-sm text-white/75">Скасувати цю Zoom-сесію?</p>
              {cancelSessionError && (
                <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-100">
                  {cancelSessionError}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void confirmSessionCancellation()}
                  disabled={isCancellingSession}
                  className="rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-2.5 text-[12px] font-semibold text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCancellingSession ? 'СКАСОВУЄМО…' : 'СКАСУВАТИ СЕСІЮ'}
                </button>
                <button
                  type="button"
                  onClick={() => setCancellingSessionId(null)}
                  disabled={isCancellingSession}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] font-semibold text-white/70 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  НАЗАД
                </button>
              </div>
            </div>
          ) : deletingSlotId === selectedSessionData.id ? (
            <div className="space-y-4">
              <p className="text-xs text-sky-100/70">
                {new Intl.DateTimeFormat('uk-UA', { timeZone: KYIV_TIMEZONE, day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(selectedSessionData.scheduledAt))}
                {' · '}{formatCoachSessionRange(selectedSessionData)}
              </p>
              <p className="whitespace-pre-line text-sm text-white/75">Слот буде видалено з календаря.{"\n"}Цю дію не можна скасувати.</p>
              {deleteSlotError && (
                <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-100">
                  {deleteSlotError}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void confirmFreeSlotDeletion()}
                  disabled={isDeletingSlot}
                  className="rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-2.5 text-[12px] font-semibold text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeletingSlot ? 'ВИДАЛЯЄМО…' : 'ВИДАЛИТИ'}
                </button>
                <button
                  type="button"
                  onClick={closeCoachActionModal}
                  disabled={isDeletingSlot}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[12px] font-semibold text-white/70 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  СКАСУВАТИ
                </button>
              </div>
            </div>
          ) : selectedSessionView === 'actions' ? (
            <CoachSessionActions
              session={selectedSessionData} canManage={canManageZoom}
              busy={isApprovingCommerce || isRejectingCommerce} error={requestActionError}
              onDetails={() => setSelectedSessionView('details')}
              onEdit={(reschedule) => {
                if (reschedule) openReschedule(selectedSessionData)
                else openSessionEditor(selectedSessionData.id, false)
              }}
              onCancel={() => requestSessionCancellation(selectedSessionData.id)}
              onDeleteSlot={() => requestFreeSlotDeletion(selectedSessionData.id)}
              onComplete={() => { setCompletionSessionId(selectedSessionData.id); setSelectedSessionView('details') }}
              onApprove={() => void handleRequestDecision(true)} onReject={() => void handleRequestDecision(false)}
            />
          ) : (
            <>
              <SessionCard
                session={selectedSessionData}
                mode="coach"
                userId={expertId ?? 'staff'}
                initialCompletionOpen={completionSessionId === selectedSessionData.id}
                onClose={closeCoachActionModal}
                showCloseControl={false}
                onAddToCalendar={handleAddToCalendar}
                onDeleteSlot={requestFreeSlotDeletion}
                onEdit={(id) => {
                  openSessionEditor(id, false)
                  setCompletionSessionId(null)
                }}
                onCancel={requestSessionCancellation}
              />
              {canManageZoom && selectedSessionData.commerceStatus === 'REQUESTED' && selectedSessionData.commerceRequestId && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleRequestDecision(true)}
                    disabled={isApprovingCommerce || isRejectingCommerce}
                    className="rounded-xl border border-emerald-300/25 bg-emerald-500/15 px-4 py-2.5 text-[12px] font-semibold text-emerald-100 transition hover:bg-emerald-500/24 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ПІДТВЕРДИТИ
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRequestDecision(false)}
                    disabled={isApprovingCommerce || isRejectingCommerce}
                    className="rounded-xl border border-rose-300/25 bg-rose-500/15 px-4 py-2.5 text-[12px] font-semibold text-rose-100 transition hover:bg-rose-500/24 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    ВІДХИЛИТИ
                  </button>
                </div>
              )}
              {requestActionError && <p role="alert" className="mt-2 text-xs text-red-200">{requestActionError}</p>}
            </>
          )}
        </CoachActionModal>
      )}

      {canManageZoom && createDate && (
        <CoachActionModal title="Нова ZOOM-практика" onClose={closeCoachActionModal}>
          <SessionForm
            defaultDate={createDate}
            participants={coachUsers}
            initialValues={createInitialValues}
            onSubmit={handleCreate}
            onClose={closeCoachActionModal}
            isLoading={isCreating}
            title="Нова ZOOM-практика"
          />
        </CoachActionModal>
      )}
      {canManageZoom && editingSessionData && (
        <CoachActionModal
          title={editingFocus === 'schedule' ? 'Перенести сесію' : 'Редагування сесії'}
          onClose={closeCoachActionModal}
          onBack={returnFromSessionEditor}
        >
          <SessionForm
            defaultDate={new Date(editingSessionData.scheduledAt)}
            sessionId={editingSessionData.id}
            participants={coachUsers}
            initialValues={{
              scheduledAt: editingSessionData.scheduledAt,
              topic: editingSessionData.topic,
              type: editingSessionData.type,
              zoomLink: editingSessionData.zoomLink,
              ...getCoachSessionInitialValues(editingSessionData),
            }}
            onSubmit={handleUpdate}
            onClose={returnFromSessionEditor}
            isLoading={isUpdating}
            title={editingFocus === 'schedule' ? 'Перенести сесію' : 'Редагування сесії'}
            submitLabel="Зберегти"
            loadingLabel="Збереження..."
            autoFocusZoomLink={editingFocus === 'zoomLink'}
          />
        </CoachActionModal>
      )}

      {instructionsOpen && (
        <BattleInstruction onClose={() => setInstructionsOpen(false)} />
      )}
    </div>
  )
}
