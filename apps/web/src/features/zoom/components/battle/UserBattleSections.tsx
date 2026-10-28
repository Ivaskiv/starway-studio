import { useEffect, useRef, useState } from 'react';
import { Crosshair } from 'lucide-react';
import { useInitiateBattleMutation, useGetEligibleOpponentsQuery } from '../../zoom.api';
import { getZoomPaymentBadgeLabel } from '../../zoom.utils';
import type { ZoomCalendarSession } from '../../zoom.types';
import { openExternalPaymentUrl } from '@/features/subscription/utils/openExternalPaymentUrl';
import type * as React from 'react';

type EligibleBattleOpponent = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
};

type BattleInitiationResponse =
  | { type: 'subscriber'; costUAH: 0; battle: { id: string } }
  | { type: 'non_subscriber'; costUAH: 99; request: { id: string; status: string }; checkoutUrl?: string | null; message: string };

type InitiateBattle = (body: {
  challengerId: string;
  opponentId: string;
}) => { unwrap: () => Promise<BattleInitiationResponse> };

export function getBattleOpponentLabel(opponent: EligibleBattleOpponent): string {
  return [opponent.firstName, opponent.lastName].filter(Boolean).join(' ') || opponent.email;
}

export function getNextSelectedBattleOpponent(selectedOpponent: string, opponentId: string): string {
  return selectedOpponent === opponentId ? '' : opponentId;
}

export function isEligibleBattleOpponent(opponents: EligibleBattleOpponent[], opponentId: string): boolean {
  return opponents.some(({ id }) => id === opponentId);
}

export async function submitBattleChallenge({
  challengerId,
  opponentId,
  initiate,
  openCheckout,
}: {
  challengerId: string;
  opponentId: string;
  initiate: InitiateBattle;
  openCheckout: (url: string) => void;
}): Promise<void> {
  const response = await initiate({ challengerId, opponentId }).unwrap();
  if (response.type === 'non_subscriber' && response.checkoutUrl) {
    openCheckout(response.checkoutUrl);
  }
}

export function ActiveBattleSection({
  session,
  userId,
  onLogProgress,
  onAccept,
  onDecline,
}: {
  session: ZoomCalendarSession;
  userId: string;
  onLogProgress: (args: { sessionId: string; userId: string; day: number; text: string }) => void;
  onAccept: (sessionId: string) => void;
  onDecline: (sessionId: string) => void;
}) {
  const progRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');

  const startedAt = new Date(session.scheduledAt).getTime() - 7 * 24 * 60 * 60 * 1000;
  const elapsed = Math.min(Date.now() - startedAt, 7 * 24 * 60 * 60 * 1000);
  const pct = Math.round((elapsed / (7 * 24 * 60 * 60 * 1000)) * 100);
  const day = Math.min(Math.ceil(elapsed / (24 * 60 * 60 * 1000)), 7);
  const isPending = session.battleStatus === 'pending';
  const isOpponent = session.opponentId === userId;
  const paymentLabel = getZoomPaymentBadgeLabel(session);

  useEffect(() => {
    progRef.current?.style.setProperty('--my-progress', `${pct}%`);
  }, [pct]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim()) return;
    onLogProgress({ sessionId: session.id, userId, day, text: text.trim() });
    setText('');
  };

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-400">
          <Crosshair className="h-4 w-4" />
          {session.topic}
        </p>
        <div className="flex flex-shrink-0 flex-col items-end gap-1">
          <span className="inline-flex rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
            День {day}/7
          </span>
          {paymentLabel && (
            <span className="inline-flex rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
              {paymentLabel}
            </span>
          )}
        </div>
      </div>
      {isPending && (
        <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-200">
          {isOpponent ? 'Battle очікує твого рішення.' : 'Battle очікує прийняття суперником.'}
          {isOpponent && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onAccept(session.id)}
                className="rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200"
              >
                Прийняти
              </button>
              <button
                type="button"
                onClick={() => onDecline(session.id)}
                className="rounded-lg bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-200"
              >
                Відхилити
              </button>
            </div>
          )}
        </div>
      )}
      {session.goalText && (
        <p className="text-xs text-[var(--text-muted)] mb-3">Моя ціль: {session.goalText}</p>
      )}
      <div className="mb-1.5">
        <div className="h-1.5 rounded-full bg-[var(--border-primary)] overflow-hidden">
          <div ref={progRef} className="h-full rounded-full bg-amber-500 [width:var(--my-progress,0%)] transition-all duration-500" />
        </div>
        <p className="text-[10px] text-amber-400 text-right mt-1">{pct}%</p>
      </div>
      <form onSubmit={handleSubmit} className="mt-3">
        <textarea
          id={`progress-text-${session.id}`}
          value={text}
          onChange={e => setText(e.target.value)}
          rows={2}
          placeholder="Що ти зробила сьогодні для свого результату?"
          className="w-full resize-none rounded-[18px] border border-[var(--border-primary)] bg-white/[0.02] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition-colors duration-200 placeholder:text-[var(--text-muted)] focus:border-[rgba(var(--accent-rgb),0.34)]"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="btn-liquid-primary mt-2 w-full inline-flex items-center justify-center text-sm font-semibold py-2.5 rounded-[var(--btn-radius)] disabled:opacity-40"
        >
          + Зафіксувати прогрес сьогодні
        </button>
      </form>
    </div>
  );
}

export function BattleCallSection({
  userId,
  onOpenInstructions,
}: {
  userId: string
  onOpenInstructions: () => void
}) {
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const {
    data: opponents = [],
    isLoading: isOpponentsLoading,
    isError: isOpponentsError,
    refetch: refetchOpponents,
  } = useGetEligibleOpponentsQuery(userId);
  const [initiate, { isLoading }] = useInitiateBattleMutation();
  const selectedOpponentIsEligible = isEligibleBattleOpponent(opponents, selectedOpponent);

  const handleSend = async () => {
    if (!selectedOpponentIsEligible) return;
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      await submitBattleChallenge({
        challengerId: userId,
        opponentId: selectedOpponent,
        initiate,
        openCheckout: openExternalPaymentUrl,
      });
      setSelectedOpponent('');
      setSubmitSuccess('Виклик на Battle надіслано.');
    } catch {
      setSubmitError('Не вдалося надіслати виклик. Спробуй ще раз.');
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-[var(--border-primary)] bg-[var(--glass-bg)] p-4 flex flex-col items-center gap-3 text-center">
      <p className="text-sm text-[var(--text-muted)]">
        Вибери учасника і запропонуй 7-денний челендж
      </p>
      {isOpponentsLoading && (
        <p role="status" className="text-sm text-[var(--text-muted)]">Завантажуємо доступних суперників…</p>
      )}
      {isOpponentsError && (
        <div role="alert" className="flex flex-col items-center gap-2 text-sm text-amber-200">
          <span>Не вдалося завантажити доступних суперників.</span>
          <button
            type="button"
            onClick={() => void refetchOpponents()}
            className="rounded-lg border border-amber-200/25 px-3 py-1.5 text-xs font-semibold"
          >
            Повторити
          </button>
        </div>
      )}
      {!isOpponentsLoading && !isOpponentsError && opponents.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">Наразі немає доступних суперників для Battle.</p>
      )}
      {!isOpponentsLoading && !isOpponentsError && opponents.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {opponents.map((opponent) => {
            const label = getBattleOpponentLabel(opponent);
            const initials = label.slice(0, 2).toUpperCase();
            const selected = selectedOpponent === opponent.id;
            return (
              <button
                key={opponent.id}
                type="button"
                onClick={() => {
                  setSelectedOpponent(getNextSelectedBattleOpponent(selectedOpponent, opponent.id));
                  setSubmitError(null);
                  setSubmitSuccess(null);
                }}
                title={label}
                aria-label={`Обрати суперника: ${label}`}
                aria-pressed={selected}
                className={[
                  'w-9 h-9 rounded-full text-[10px] font-semibold flex items-center justify-center transition-all',
                  selected
                    ? 'bg-amber-500/30 text-amber-300 ring-1 ring-amber-400'
                    : 'bg-purple-500/15 text-purple-300 hover:bg-purple-500/25',
                ].join(' ')}
              >
                {initials}
              </button>
            );
          })}
        </div>
      )}
      {submitError && <p role="alert" className="text-sm text-rose-300">{submitError}</p>}
      {submitSuccess && <p role="status" className="text-sm text-emerald-300">{submitSuccess}</p>}
      <div className="grid w-full grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleSend}
          disabled={!selectedOpponentIsEligible || isLoading || isOpponentsLoading || isOpponentsError}
          className="glass-button inline-flex items-center justify-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-[var(--btn-radius)] disabled:opacity-40"
        >
          {isLoading ? 'Відправка...' : (
            <>
              <Crosshair className="h-4 w-4" />
              Викликати на Battle
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onOpenInstructions}
          className="rounded-[var(--btn-radius)] border border-[var(--border-primary)] bg-transparent px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--glass-bg-hover)]"
        >
          Правила
        </button>
      </div>
    </div>
  );
}
