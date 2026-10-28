import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BaseModal } from '@/features/modals/BaseModal';
import { fmtDateTime, INDIVIDUAL_WEEKDAYS, toLocalDateKey, formatIndividualDate, formatIndividualTime } from '../../utils/userPanelPresentation';
import { KYIV_TIME_LABEL } from '../../utils/zoomDateTime.utils';
import { AvailableSessionRow } from './UserSessionPieces';
import { BattleCallSection } from '../battle/UserBattleSections';
import type { UserZoomPanelModel } from '../../UserZoomPanel';

export function UserCreateModal({ model }: { model: UserZoomPanelModel }) {
  const { userId, now, sessions, setInstructionsOpen, createAction, setCreateAction, setRequestedUserSession, individualDate, individualTime, setIndividualTime, individualQuestion, setIndividualQuestion, individualRequestError, setIndividualRequestError, individualCalendarMonth, isCreatingIndividualRequest, individualAvailability, isFetchingIndividualAvailability, isIndividualAvailabilityError, refetchIndividualAvailability, individualAvailabilitySummary, selectedIndividualSlot, hasOnlyBusyIndividualSlots, todayKey, calendarMonthLabel, calendarMonthDays, calendarOffset, individualFreeSlotCount, selectedIndividualDaySummary, individualQuestionValidationError, canSubmitIndividualRequest, bookedSessionIds, displayAvailableSessions, individualCalendarGroupSessions, selectIndividualDate, moveIndividualCalendarMonth, closeCreateModal, handleIndividualRequest } = model;
  return (
    <>
    {createAction !== null && (
            <BaseModal
              isOpen
              onClose={closeCreateModal}
              fitVisualViewport
              overlayClassName="bg-black/70 backdrop-blur-sm"
              containerClassName="z-[1000] px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
              panelClassName="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0d1117] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
            >
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">Запис на Zoom</p>
                    <h2 className="mt-1 text-lg font-semibold text-white">
                      {createAction === 'menu' ? 'Обери сесію' : createAction === 'group' ? 'Групова практика' : createAction === 'individual' ? 'Індивідуальний запит' : 'Zoom Battle'}
                    </h2>
                  </div>
                  <button type="button" onClick={closeCreateModal} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-lg text-white/50">×</button>
                </div>

                <div className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                {createAction === 'menu' && (
                  <div className="grid gap-2">
                    <button type="button" onClick={() => setCreateAction('group')} className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 px-4 py-3 text-left text-sm font-semibold text-emerald-100">ГРУПОВА ПРАКТИКА</button>
                    <button type="button" onClick={() => setCreateAction('individual')} className="rounded-2xl border border-sky-300/25 bg-sky-500/10 px-4 py-3 text-left text-sm font-semibold text-sky-100">ІНДИВІДУАЛЬНИЙ ЗАПИТ</button>
                    <button type="button" onClick={() => setCreateAction('battle')} className="rounded-2xl border border-amber-300/25 bg-amber-500/10 px-4 py-3 text-left text-sm font-semibold text-amber-100">ZOOM BATTLE</button>
                  </div>
                )}

                {createAction === 'group' && (
                  <div className="space-y-2">
                    <p className="text-sm text-white/60">Обери доступну практику, щоб записатися та додати питання.</p>
                    {displayAvailableSessions.filter((session) => session.type === 'group' || session.type === 'group_practice').map((session) => (
                      <AvailableSessionRow key={session.id} session={session} onSelect={(selected) => { setRequestedUserSession(selected); closeCreateModal(); }} />
                    ))}
                    {displayAvailableSessions.every((session) => session.type !== 'group' && session.type !== 'group_practice') && <p className="py-3 text-sm text-white/45">Наразі немає доступних групових практик.</p>}
                  </div>
                )}

                {createAction === 'individual' && (
                  <div className="space-y-4">
                    <section aria-label="Календар індивідуальних сесій" className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          aria-label="Попередній місяць"
                          disabled={individualCalendarMonth.getFullYear() === now.getFullYear() && individualCalendarMonth.getMonth() === now.getMonth()}
                          onClick={() => moveIndividualCalendarMonth(-1)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/75 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <p className="text-center text-sm font-semibold capitalize text-white">{calendarMonthLabel}</p>
                        <button
                          type="button"
                          aria-label="Наступний місяць"
                          onClick={() => moveIndividualCalendarMonth(1)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/75"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {INDIVIDUAL_WEEKDAYS.map((weekday) => (
                          <span key={weekday} className="pb-1 text-[10px] font-semibold uppercase text-white/40">{weekday}</span>
                        ))}
                        {Array.from({ length: calendarOffset }).map((_, index) => <span key={`offset-${index}`} />)}
                        {Array.from({ length: calendarMonthDays }, (_, index) => {
                          const date = new Date(
                            individualCalendarMonth.getFullYear(), individualCalendarMonth.getMonth(), index + 1,
                          );
                          const dateKey = toLocalDateKey(date);
                          const isPast = dateKey < todayKey;
                          const isToday = dateKey === todayKey;
                          const isSelected = dateKey === individualDate;
                          const hasGroup = individualCalendarGroupSessions.some(
                            (session) => toLocalDateKey(new Date(session.scheduledAt)) === dateKey,
                          );
                          const hasOwnBooking = sessions.some((session) =>
                            toLocalDateKey(new Date(session.scheduledAt)) === dateKey
                            && (session.isMyBooking || bookedSessionIds.has(session.id)),
                          );
                          const daySummary = individualAvailabilitySummary.find((day) => day.date === dateKey);
                          const hasKnownAvailability = daySummary?.hasAvailableIndividual === true;
                          const hasKnownUnavailable = daySummary !== undefined && !daySummary.hasAvailableIndividual;
                          return (
                            <button
                              key={dateKey}
                              type="button"
                              disabled={isPast}
                              aria-pressed={isSelected}
                              aria-label={formatIndividualDate(dateKey)}
                              onClick={() => selectIndividualDate(dateKey)}
                              className={[
                                'relative flex min-h-11 flex-col items-center justify-center rounded-xl border text-xs font-semibold transition-colors',
                                isSelected
                                  ? 'border-sky-200 bg-slate-800 text-white'
                                  : isPast
                                    ? 'cursor-not-allowed border-transparent text-white/20'
                                    : isToday
                                      ? 'border-sky-300/35 bg-sky-500/10 text-sky-100'
                                      : 'border-transparent text-white/75 hover:border-white/15 hover:bg-white/[0.05]',
                              ].join(' ')}
                            >
                              <span>{index + 1}</span>
                              <span className="mt-0.5 flex h-2 items-center gap-0.5" aria-hidden="true">
                                {hasKnownAvailability && <i className="h-1.5 w-1.5 rounded-full bg-emerald-300" />}
                                {hasKnownUnavailable && <i className="text-[8px] not-italic text-white/45">×</i>}
                                {hasGroup && <i className="text-[8px] not-italic text-amber-200">G</i>}
                                {hasOwnBooking && <i className="text-[8px] not-italic text-sky-200">✓</i>}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    {!individualDate && <p className="text-sm text-white/45">Обери дату, щоб побачити доступний час.</p>}
                    {individualDate && (
                      <section aria-live="polite" className="space-y-3">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Обрана дата</p>
                          <p className="mt-1 text-sm font-semibold capitalize text-white">{formatIndividualDate(individualDate)}</p>
                          {!isFetchingIndividualAvailability && !isIndividualAvailabilityError && individualAvailability.length > 0 && (
                            <p className="mt-1 text-xs text-white/55">Індивідуальні години · вільно: {individualFreeSlotCount}</p>
                          )}
                        </div>

                        {isFetchingIndividualAvailability && (
                          <div className="grid grid-cols-2 gap-2" aria-label="Завантажуємо доступний час">
                            {[0, 1, 2, 3].map((index) => <span key={index} className="h-14 animate-pulse rounded-xl bg-white/[0.06]" />)}
                          </div>
                        )}
                        {isIndividualAvailabilityError && (
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                            <span>Не вдалося завантажити доступний час.</span>
                            <button type="button" onClick={() => void refetchIndividualAvailability()} className="rounded-lg border border-amber-200/25 px-2 py-1 text-xs font-semibold">Повторити</button>
                          </div>
                        )}
                        {!isFetchingIndividualAvailability && !isIndividualAvailabilityError && individualAvailability.length === 0 && selectedIndividualDaySummary?.hasIndividualWindow === false && (
                          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/55">Коуч ще не відкрив доступні години на цю дату.</p>
                        )}
                        {!isFetchingIndividualAvailability && !isIndividualAvailabilityError && (hasOnlyBusyIndividualSlots || (selectedIndividualDaySummary?.hasIndividualWindow === true && selectedIndividualDaySummary.availableCount === 0)) && (
                          <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/55">На цю дату всі індивідуальні слоти зайняті.</p>
                        )}
                        {!isFetchingIndividualAvailability && !isIndividualAvailabilityError && individualAvailability.length > 0 && (
                          <div className="grid grid-cols-2 gap-2" aria-label="Доступний час">
                            {individualAvailability.map((slot) => {
                              const selected = individualTime === slot.scheduledAt;
                              return (
                                <button
                                  key={slot.scheduledAt}
                                  type="button"
                                  disabled={!slot.available}
                                  onClick={() => {
                                    setIndividualTime(slot.scheduledAt);
                                    setIndividualRequestError(null);
                                  }}
                                  className={[
                                    'min-h-14 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition-colors',
                                    selected
                                      ? 'border-sky-200 bg-slate-800 text-white'
                                      : slot.available
                                        ? 'border-sky-300/25 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20'
                                        : 'cursor-not-allowed border-white/10 bg-white/[0.03] text-white/45',
                                  ].join(' ')}
                                >
                                  <span className="block">{formatIndividualTime(slot.scheduledAt)}</span>
                                  <span className="mt-0.5 block text-[10px] font-medium text-inherit opacity-70">
                                    {slot.available ? 'Вільно' : 'Зайнято'}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {individualCalendarGroupSessions
                          .filter((session) => toLocalDateKey(new Date(session.scheduledAt)) === individualDate)
                          .map((session) => (
                            <div key={session.id} className="rounded-xl border border-amber-300/20 bg-amber-500/10 p-3">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-200">Групова практика</p>
                              <p className="mt-1 text-sm font-semibold text-white">{session.topic}</p>
                              <p className="mt-1 text-xs text-white/60">{fmtDateTime(session.scheduledAt)}</p>
                              {session.isMyBooking || bookedSessionIds.has(session.id) ? (
                                <p className="mt-2 text-xs font-semibold text-sky-200">✓ ВАШ ЗАПИС</p>
                              ) : (
                                <button type="button" onClick={() => { setRequestedUserSession(session); closeCreateModal(); }} className="mt-2 rounded-lg border border-amber-200/25 px-3 py-1.5 text-xs font-semibold text-amber-100">Записатися</button>
                              )}
                            </div>
                          ))}
                      </section>
                    )}

                    {selectedIndividualSlot?.available && (
                      <>
                        <section className="rounded-2xl border border-sky-300/25 bg-sky-500/10 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200">ЗАПИС НА ІНДИВІДУАЛЬНУ СЕСІЮ</p>
                          <p className="mt-1 text-sm font-semibold capitalize text-white">{formatIndividualDate(individualDate)}</p>
                          <p className="mt-1 text-lg font-semibold text-sky-100">
                            {formatIndividualTime(selectedIndividualSlot.scheduledAt)}–{formatIndividualTime(new Date(new Date(selectedIndividualSlot.scheduledAt).getTime() + 60 * 60 * 1000).toISOString())}
                          </p>
                          <p className="text-xs text-white/60">60 хв · {KYIV_TIME_LABEL}</p>
                        </section>
                        <label className="block text-sm text-white/75">Питання або проблема<textarea value={individualQuestion} onChange={(event) => {
                          setIndividualQuestion(event.target.value);
                          setIndividualRequestError(null);
                        }} rows={4} className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-white" /></label>
                        {(individualRequestError ?? individualQuestionValidationError) && (
                          <p className="text-sm text-amber-300">
                            {individualRequestError ?? individualQuestionValidationError}
                          </p>
                        )}
                        <button type="button" onClick={() => void handleIndividualRequest()} disabled={!canSubmitIndividualRequest || isCreatingIndividualRequest} className="btn-liquid-primary sticky bottom-0 z-10 w-full rounded-2xl px-4 py-3 text-sm font-semibold disabled:opacity-50">{isCreatingIndividualRequest ? 'Створюємо…' : 'Продовжити'}</button>
                      </>
                    )}
                  </div>
                )}

                {createAction === 'battle' && <div><BattleCallSection userId={userId} onOpenInstructions={() => setInstructionsOpen(true)} /></div>}
                </div>
              </div>
            </BaseModal>
          )}
    </>
  );
}
