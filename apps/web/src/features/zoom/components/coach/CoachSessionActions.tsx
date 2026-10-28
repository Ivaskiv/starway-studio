import { Info, PencilLine, CalendarClock, Ban, CheckCircle2, Trash2 } from 'lucide-react'
import type { ZoomCalendarSession } from '../../zoom.types'
import { getIndividualPresentation, getNormalizedSessionType, getSessionMeta } from '../../zoom.utils'
import { KYIV_TIMEZONE } from '../../utils/zoomDateTime.utils'
import { getCoachPrimaryStatus, getSessionIcon, formatCoachSessionRange, getSessionSecondaryLines } from './coachPanelPresentation'

export function CoachSessionActions({ session, canManage, busy, error, onDetails, onEdit, onCancel, onDeleteSlot, onComplete, onApprove, onReject }: {
  session: ZoomCalendarSession
  canManage: boolean
  busy: boolean
  error: string | null
  onDetails: () => void
  onEdit: (reschedule: boolean) => void
  onCancel: () => void
  onDeleteSlot: () => void
  onComplete: () => void
  onApprove: () => void
  onReject: () => void
}) {
  const terminal = session.status === 'COMPLETED' || session.status === 'CANCELLED'
  const pendingRequest = Boolean(session.commerceRequestId && session.commerceStatus === 'REQUESTED')
  const pendingCommerce = Boolean(session.commerceRequestId && ['REQUESTED', 'APPROVED_PENDING_PAYMENT'].includes(session.commerceStatus ?? ''))
  const future = new Date(session.scheduledAt).getTime() > Date.now()
  const individualPresentation = getIndividualPresentation(session)
  const isIndividualSlot = individualPresentation?.kind === 'INDIVIDUAL_SLOT'
  const sessionType = getNormalizedSessionType(session)
  const isGroupPractice = sessionType === 'group_practice'
  const canEdit = canManage
    && session.canEdit
    && !terminal
    && !pendingCommerce
    && (!individualPresentation || future)
  // This is advisory UI eligibility; the backend repeats every guard
  // transactionally before changing a session.
  const canReschedule = canEdit
    && (
      (isIndividualSlot && session.isDisposableIndividualSlot === true)
      || (isGroupPractice && session.status === 'SCHEDULED' && future)
    )
  // Deleting disposable inventory is intentionally independent from editing.
  // Past slots remain safe to delete; committed/cancelled sessions never do.
  const canDeleteSlot = canManage
    && isIndividualSlot
    && session.isDisposableIndividualSlot === true
    && (session.status === 'SCHEDULED' || session.status === 'CANCELLED')
    && !session.commerceRequestId
    && !session.commerceStatus
  const status = getCoachPrimaryStatus(session)
  const day = new Intl.DateTimeFormat('uk-UA', { timeZone: KYIV_TIMEZONE, weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(session.scheduledAt))
  const actionClass = 'flex w-full items-center gap-3 border-t border-white/10 py-2.5 text-left text-xs text-white/90 disabled:opacity-40'
  return <div data-coach-session-actions className="pt-2">
    <div className="mb-3 flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-700/40">{getSessionIcon(session)}</span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{individualPresentation?.title ?? getSessionMeta({ type: session.type })}</p>
        <p className="mt-0.5 text-xs text-sky-100/70">{day} · {formatCoachSessionRange(session)}</p>
        <p className="mt-0.5 text-xs text-sky-100/60">{getSessionSecondaryLines(session).join(' · ')}</p>
        {status && <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] ${status.badgeClass}`}>{status.label}</span>}
      </div>
    </div>
    <button type="button" onClick={onDetails} className={actionClass}><Info className="h-4 w-4" />ВІДКРИТИ ДЕТАЛІ</button>
    {canEdit && <>
      <button type="button" onClick={() => onEdit(false)} className={actionClass}><PencilLine className="h-4 w-4" />{isIndividualSlot ? 'РЕДАГУВАТИ СЛОТ' : isGroupPractice ? 'РЕДАГУВАТИ НАЛАШТУВАННЯ' : 'РЕДАГУВАТИ ТЕМУ'}</button>
      {canReschedule && <button type="button" onClick={() => onEdit(true)} className={actionClass}><CalendarClock className="h-4 w-4" />{isGroupPractice ? 'ПЕРЕНЕСТИ ПРАКТИКУ' : 'ПЕРЕНЕСТИ СЛОТ'}</button>}
      {future && !isIndividualSlot ? <button type="button" onClick={onCancel} className={actionClass}><Ban className="h-4 w-4 text-rose-400" />{isGroupPractice ? 'СКАСУВАТИ ПРАКТИКУ' : 'СКАСУВАТИ СЕСІЮ'}</button> : !individualPresentation && <button type="button" onClick={onComplete} className={actionClass}><CheckCircle2 className="h-4 w-4 text-emerald-400" />ЗАВЕРШИТИ СЕСІЮ</button>}
    </>}
    {canDeleteSlot && <button type="button" onClick={onDeleteSlot} className={actionClass}><Trash2 className="h-4 w-4 text-red-400" />ВИДАЛИТИ СЛОТ</button>}
    {canManage && pendingRequest && !terminal && <>
      <button type="button" disabled={busy} onClick={onApprove} className={actionClass}><CheckCircle2 className="h-4 w-4 text-emerald-400" />ПІДТВЕРДИТИ ЗАПИТ</button>
      <button type="button" disabled={busy} onClick={onReject} className={actionClass}><Ban className="h-4 w-4 text-rose-400" />ВІДХИЛИТИ ЗАПИТ</button>
    </>}
    {error && <p role="alert" className="mt-2 text-xs text-red-200">{error}</p>}
  </div>
}
