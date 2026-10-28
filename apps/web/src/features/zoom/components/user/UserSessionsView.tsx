
import ZoomCalendar from '../calendar/Calendar';
import { MySessionRow } from './UserSessionPieces';
import { UserCreateModal } from './UserCreateModal';
import type { UserZoomPanelModel } from '../../UserZoomPanel';

export function UserSessionsView({ model }: { model: UserZoomPanelModel }) {
  const {
    userId,
    zoomAccess,
    activeTab,
    setActiveSessionsTab,
    mySessionsFilter,
    setMySessionsFilter,
    monthStart,
    monthEnd,
    requestedUserSession,
    setRequestedUserSession,
    openPayment,
    visibleCalendarSessions,
    mySessionsPresentation,
    myCalendarSessions,
    sessionHistoryLoadFailed,
    handleBookingCta,
    setCreateAction,
  } = model;
  // The backend exposes only the one trial-eligible Monday group practice for
  // PREMIUM. It is bookable server-side, but PREMIUM must not be treated as
  // full FOCUS elsewhere in the USER surface.
  const canBookVisibleGroupPractice =
    zoomAccess?.hasFocus === true || zoomAccess?.state === 'PREMIUM';

  if (activeTab !== 'sessions') return null;

  const openMySession = (session: typeof myCalendarSessions[number]) => {
    // SessionCard remains owned by the public calendar; do not duplicate its actions.
    setActiveSessionsTab('all');
    setRequestedUserSession(session);
  };

  const openIndividualSlotSelection = () => {
    if (zoomAccess?.hasFocus === false) {
      void openPayment()
      return
    }
    setActiveSessionsTab('all')
    setCreateAction('individual')
  }

  return (
    <section className="min-w-0">
      <section className="mb-3 rounded-2xl border border-white/[0.08] bg-black/15 p-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-white">Мої сесії</h2>
          {zoomAccess?.hasFocus !== false && (
            <button
              type="button"
              data-user-booking-cta="primary"
              onClick={handleBookingCta}
              className="btn-liquid-primary shrink-0 rounded-xl px-3 py-2 text-[11px] font-semibold"
            >
              ЗАПИСАТИСЯ НА СЕСІЮ
            </button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl border border-white/[0.08] bg-black/[0.24] p-1" aria-label="Фільтр моїх сесій">
          {([
            { id: 'upcoming', label: 'Майбутні' },
            { id: 'past', label: 'Минулі' },
            { id: 'cancelled', label: 'Скасовані' },
          ] as const).map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setMySessionsFilter(filter.id)}
              className={mySessionsFilter === filter.id
                ? 'min-h-9 rounded-lg bg-white/[0.1] px-1.5 py-2 text-[10px] font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]'
                : 'min-h-9 rounded-lg px-1.5 py-2 text-[10px] font-semibold text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-primary)]'}
            >
              <span>{filter.label}</span>
              <span className="ml-1 text-sky-100/70">{mySessionsPresentation.counts[filter.id]}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {myCalendarSessions.map((session) => (
            <MySessionRow key={session.id} session={session} onSelect={openMySession} />
          ))}
          {myCalendarSessions.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-center">
              <p className="text-sm text-white/50">
                {sessionHistoryLoadFailed
                  ? 'Не вдалося завантажити історію сесій. Спробуйте ще раз.'
                  : mySessionsPresentation.emptyMessage}
              </p>
              {!sessionHistoryLoadFailed && mySessionsFilter === 'upcoming' && zoomAccess?.hasFocus !== false && (
                <button
                  type="button"
                  onClick={handleBookingCta}
                  className="mt-2 text-xs font-semibold text-sky-100 underline underline-offset-2"
                >
                  ЗАПИСАТИСЯ НА СЕСІЮ
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <UserCreateModal model={model} />

      <div className="rounded-[22px] border border-white/[0.08] bg-black/[0.12] p-2.5">
        <ZoomCalendar
          mode="user"
          userId={userId}
          sessionSource={{ from: monthStart, to: monthEnd, sessions: visibleCalendarSessions }}
          requestedUserSession={requestedUserSession}
          onRequestedUserSessionHandled={() => setRequestedUserSession(null)}
          hasFocusAccess={canBookVisibleGroupPractice}
          onRestrictedGroupAction={() => void openPayment()}
          onFindAvailableSlots={openIndividualSlotSelection}
        />
      </div>
      {!canBookVisibleGroupPractice && (
        <section className="mt-3 rounded-2xl border border-sky-300/20 bg-sky-500/[0.08] p-3 text-center">
          <button
            type="button"
            onClick={handleBookingCta}
            className="btn-liquid-primary w-full rounded-xl px-3 py-3 text-[11px] font-semibold"
          >
            АКТИВУВАТИ ДОСТУП І ЗАПИСАТИСЯ
          </button>
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Після оплати ти зможеш бронювати сесії та отримувати нагадування.
          </p>
        </section>
      )}
    </section>
  );
}
