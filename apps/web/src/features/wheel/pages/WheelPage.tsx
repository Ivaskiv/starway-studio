// frontend/src/features/wheel/pages/WheelPage.tsx
import { useAppSelector } from '@/app/hooks';
import { ROUTES } from '@/config/routes';
import { useSystemState } from '@/features/auth/hooks/useSystemState';
import { useGetWebMapQuery } from '@/features/web-map/services/web-map.api';
import { WheelHistory } from '@/features/wheel';
import {
  useConnectTelegramProfileMutation,
  useGetLatestWheelAssessmentQuery,
  useGetWheelCooldownQuery,
  useGetWheelHistoryQuery,
  useSendWheelTelegramReminderMutation,
} from '@/features/wheel/api';
import { Button, GenerationCurtain, useGenerationCurtain, withMinimumDelay } from '@/ui';
import type { WheelAssessment } from '@/features/wheel/types/wheel.types';
import { Download, Eye, Loader2, Send, Share2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { BalanceWheel } from '../components/BalanceWheel';
import { WheelForm } from '../components/WheelForm';
import WheelOnboarding from '../components/WheelOnboarding';
import { WHEEL_CATEGORIES } from '../types/wheel.types';

const sphereLabelMap = new Map(WHEEL_CATEGORIES.map(item => [item.id, item.nameUk]));

const formatSphere = (value?: string) => {
  if (!value) return '—';
  return sphereLabelMap.get(value) || value.replace(/_/g, ' ');
};

export const WheelPage = () => {
  const navigate = useNavigate();
  const user = useAppSelector(s => s.auth.user);
  const userId = user?.id;
  const accessToken = useAppSelector(s => s.auth.accessToken);
  const isSuperAdmin = user?.role?.toLowerCase?.() === 'superadmin';
  const { accessControl } = useSystemState();
  const hasWheelApiAccess =
    isSuperAdmin ||
    (
      accessControl?.hasSubscription === true &&
      accessControl?.hasRequiredContacts === true &&
      accessControl?.currentFlow !== 'lead-magnet'
    );

  // ─── state ────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [isPdfBusy, setIsPdfBusy] = useState(false);
  const [isTelegramBusy, setIsTelegramBusy] = useState(false);
  const [isShareBusy, setIsShareBusy] = useState(false);
  const [isPdfLibraryOpen, setIsPdfLibraryOpen] = useState(false);
  const [pdfIframeUrl, setPdfIframeUrl] = useState<string | null>(null);
  const [pdfPreviewTitle, setPdfPreviewTitle] = useState<string>('PDF звіт колеса балансу');
  const [wheelOnboardingCompleted, setWheelOnboardingCompleted] = useState(false);
  const pdfUrlRef = useRef<string | null>(null);

  // ─── queries ──────────────────────────────────────────────
  const [requestTelegramReminder] = useSendWheelTelegramReminderMutation();
  const [connectTelegramProfile] = useConnectTelegramProfileMutation();

  const {
    data: currentWheel,
    isLoading: isWheelLoading,
    isError: isWheelError,
    error: wheelError,
  } = useGetLatestWheelAssessmentQuery(userId ?? '', { skip: !userId || !hasWheelApiAccess });

  const { data: cooldown, isLoading: isCooldownLoading } = useGetWheelCooldownQuery(
    userId ?? '',
    { skip: !userId || !hasWheelApiAccess },
  );
  const { data: wheelHistory = [], isFetching: isHistoryFetching } = useGetWheelHistoryQuery(
    { userId: userId ?? '', limit: 12 },
    { skip: !userId || !hasWheelApiAccess },
  );
  const { data: webMap } = useGetWebMapQuery(undefined, {
    skip: !userId,
  });
  const wheelGenerationVisible = useGenerationCurtain(
    isPdfBusy || isTelegramBusy || isShareBusy || isHistoryFetching,
    { enterDelay: 140, minVisibleMs: 950 },
  );

  // ─── ALL hooks BEFORE any early return ───────────────────

  useEffect(() => {
    const code = (wheelError as any)?.data?.error;
    if (code === 'token_expired' || code === 'invalid_token') {
      toast.error('Сесія завершилась. Увійдіть знову.');
    }
  }, [wheelError]);

  useEffect(() => {
    if (currentWheel) {
      setWheelOnboardingCompleted(false);
    }
  }, [currentWheel]);

  const handleContinueAfterWheel = () => {
    if (webMap?.status === 'active') {
      navigate('/dashboard/cycle?session=morning');
      return;
    }

    navigate(ROUTES.VISION);
  };

  // cleanup PDF blob URL on unmount — MUST be before early returns
  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
    };
  }, []);

  // ─── early returns AFTER all hooks ───────────────────────

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/60">Будь ласка, увійдіть</p>
      </div>
    );
  }

  if (!hasWheelApiAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="ios-panel w-full max-w-xl rounded-[28px] p-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-subtle)]">
            Колесо балансу
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
            Доступ відкривається з активним тріалом або підпискою
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            Коли доступ буде активний, тут з&apos;явиться твій поточний зріз, історія колеса та оновлення оцінок.
          </p>
          <div className="mt-5 flex justify-center">
            <Button onClick={() => navigate('/dashboard/subscription')} size="lg" variant="solid">
              Оформити доступ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isWheelLoading || isCooldownLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[var(--color-accent)]" />
      </div>
    );
  }

  // ─── derived state ────────────────────────────────────────

  const lastAssessmentDate = currentWheel
    ? new Date(currentWheel.completedAt ?? currentWheel.createdAt)
    : null;

  const nextWheelAvailable = lastAssessmentDate
    ? new Date(lastAssessmentDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;

  const canFill = isSuperAdmin || (cooldown?.canFill ?? true);
  const canOpenPdfLibrary = Boolean(currentWheel || wheelHistory.length > 0) && !isPdfBusy;

  // ─── handlers ─────────────────────────────────────────────

  const handleShowForm = () => setShowForm(true);
  const handleHideForm = () => setShowForm(false);
  const handleComplete = () => {
    setShowForm(false);
    setWheelOnboardingCompleted(true);
  };

  const renderWheelAction = () => (
    <div className="flex justify-center">
      <div className="flex items-center gap-3">
        <Button
          onClick={handleShowForm}
          disabled={(!canFill && (cooldown?.regenLeft ?? 0) <= 0)}
          size="lg"
          variant="solid"
        >
          {isSuperAdmin
            ? 'Перегенерувати'
            : canFill
              ? 'Нове колесо балансу'
              : (cooldown?.regenLeft ?? 0) > 0
                ? `Оновити оцінку (${cooldown?.regenLeft ?? 0} із 3)`
                : nextWheelAvailable
                  ? `Доступно через ${Math.max(0, Math.ceil(
                      ((nextWheelAvailable?.getTime() ?? 0) - Date.now()) /
                      (1000 * 60 * 60 * 24)
                    ))} дн.`
                  : 'Очікування...'}
        </Button>
      </div>
    </div>
  );

  const fetchWheelPdfBlob = async (wheelId: string): Promise<Blob> => {
    if (!wheelId) throw new Error('wheel_not_found');
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const response = await fetch(`/api/wheel/${wheelId}/pdf`, {
      headers,
      credentials: 'include',
    });
    if (!response.ok) {
      const contentType = response.headers.get('Content-Type') ?? '';
      let details = 'Не вдалося сформувати PDF';
      if (contentType.includes('application/json')) {
        const json = await response.json().catch(() => null);
        if (json?.error) details = json.error;
      } else {
        const text = await response.text().catch(() => '');
        if (text) details = text;
      }
      throw new Error(details);
    }
    return response.blob();
  };

  const openWheelPdf = async (
    wheel: Pick<WheelAssessment, 'id' | 'createdAt'>,
    mode: 'view' | 'download',
  ) => {
    if (!wheel?.id || isPdfBusy) return;
    setIsPdfBusy(true);
    try {
      const blob = await withMinimumDelay(fetchWheelPdfBlob(wheel.id), 850);
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      if (mode === 'view') {
        if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = url;
        setPdfIframeUrl(url);
        setPdfPreviewTitle(`Звіт колеса · ${new Date(wheel.createdAt).toLocaleDateString('uk-UA')}`);
        setIsPdfLibraryOpen(false);
      } else {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `wheel-report-${new Date(wheel.createdAt).toISOString().slice(0, 10)}.pdf`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    } catch (error) {
      console.error(error);
      toast.error('Помилка формування PDF');
    } finally {
      setIsPdfBusy(false);
    }
  };

  const shareWheelReport = async () => {
    if (!currentWheel?.id || isShareBusy) return;
    setIsShareBusy(true);
    try {
      const blob = await withMinimumDelay(fetchWheelPdfBlob(currentWheel.id), 850);
      const file = new File([blob], 'wheel-report.pdf', { type: 'application/pdf' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Мій звіт колеса балансу',
          text: 'Ділюсь коротким звітом колеса балансу',
          files: [file],
        });
        toast.success('Звіт надіслано');
      } else {
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `wheel-report-${new Date(currentWheel.createdAt).toISOString().slice(0, 10)}.pdf`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast.success('Звіт завантажено. Можна поділитись файлом вручну.');
      }
    } catch (error) {
      console.error(error);
      try {
        await openWheelPdf(currentWheel, 'download');
      } catch {
        toast.error('Не вдалося поділитись звітом');
      }
    } finally {
      setIsShareBusy(false);
    }
  };

  const requestTelegramProfile = async (): Promise<boolean> => {
    const raw = window.prompt(
      'Щоб надсилати звіти в Telegram, вкажіть ваш @username (наприклад @myname).',
      '',
    );
    const username = raw?.trim().replace(/^@/, '');
    if (!username) return false;
    try {
      await connectTelegramProfile({ username }).unwrap();
      toast.success('Username збережено. Тепер відкрийте бота і натисніть Start.');
      return true;
    } catch (err) {
      console.error(err);
      toast.error('Не вдалося зберегти Telegram username');
      return false;
    }
  };

  const sendTelegramReminder = async () => {
    if (!currentWheel?.id || isTelegramBusy) return;
    setIsTelegramBusy(true);
    try {
      const result = await requestTelegramReminder(currentWheel.id).unwrap();
      toast.success(result.message || 'Нагадування надіслано в Telegram');
    } catch (error) {
      console.error(error);
      const payload = (error as any)?.data;
      const code = payload?.error;
      const botLink = payload?.botLink as string | undefined;
      if (code === 'telegram_username_missing') {
        const saved = await requestTelegramProfile();
        if (saved && botLink) {
          window.open(botLink, '_blank', 'noopener,noreferrer');
          toast('Після Start у боті натисніть Telegram ще раз.', { icon: 'ℹ️' });
        }
      } else if (code === 'telegram_chat_not_linked') {
        toast('Відкриваю Telegram-бота для підтвердження чату...', { icon: 'ℹ️' });
        if (botLink) window.open(botLink, '_blank', 'noopener,noreferrer');
      } else {
        const msg =
          payload?.message ||
          payload?.error ||
          (error as any)?.error ||
          (error instanceof Error ? error.message : 'Не вдалося надіслати нагадування');
        toast.error(msg);
      }
    } finally {
      setIsTelegramBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-5 md:px-6">
      <GenerationCurtain
        open={wheelGenerationVisible}
        title="Готуємо зріз колеса"
        subtitle="Підтягуємо історію, збираємо PDF і синхронізуємо дані для порівняння."
      />
      <section className="glass-card p-5 md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[rgb(var(--accent-soft-rgb))]">
              КОЛЕСО БАЛАНСУ
            </p>
            <h1 className="text-3xl font-semibold text-[var(--text-primary)] md:text-[2.15rem]">
              Оціни свій стан і побач, де зараз точка фокусу
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
              Тут усе зібрано в одному місці: діагностика, поточний зріз, PDF, Telegram і історія. Без зайвих вкладок і без шуму.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setIsPdfLibraryOpen(true)}
              disabled={(!currentWheel && wheelHistory.length === 0) || isPdfBusy}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-white/[0.08] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => void sendTelegramReminder()}
              disabled={!currentWheel || isTelegramBusy}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-white/[0.08] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5 shrink-0" />
              <span>Telegram</span>
            </button>
            <button
              onClick={() => void shareWheelReport()}
              disabled={!currentWheel || isShareBusy}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-white/[0.04] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-white/[0.08] hover:text-[var(--text-primary)] disabled:opacity-50"
            >
              <Share2 className="h-3.5 w-3.5 shrink-0" />
              <span>Поділитись</span>
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="glass-card p-5 md:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
            Крок 1 · Діагностика
          </p>
          <div className="mt-4">
            {showForm ? (
              <WheelForm
                userId={userId}
                onComplete={handleComplete}
                onCancel={handleHideForm}
                nextWheelAvailable={nextWheelAvailable ?? undefined}
              />
            ) : currentWheel ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center text-center">
                  <BalanceWheel scores={currentWheel.scores} size={360} interactive />
                  <div className="mt-6 grid w-full gap-3 lg:grid-cols-3">
                    <div className="min-w-0 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-emerald-300/80">Сильна сфера</p>
                      <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                        {formatSphere(currentWheel.strengths?.[0]) || '—'}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-white/[0.04] px-4 py-3 text-center">
                      <p className="text-3xl font-bold text-[var(--text-primary)]">{Number(currentWheel.averageScore ?? 0).toFixed(1)}</p>
                      <p className="text-xs text-[var(--text-muted)]">Середній бал</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Оновлено: {new Date(currentWheel.completedAt ?? currentWheel.createdAt).toLocaleDateString('uk')}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-amber-300/80">Сфера розвитку</p>
                      <p className="mt-1 text-base font-semibold text-[var(--text-primary)]">
                        {formatSphere(currentWheel.gaps?.[0]) || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleShowForm}
                    disabled={(!canFill && (cooldown?.regenLeft ?? 0) <= 0)}
                    size="lg"
                    variant="solid"
                  >
                    {isSuperAdmin
                      ? 'Перегенерувати'
                      : canFill
                        ? 'Нове колесо балансу'
                        : (cooldown?.regenLeft ?? 0) > 0
                          ? `Оновити оцінку (${cooldown?.regenLeft ?? 0} із 3)`
                          : nextWheelAvailable
                            ? `Доступно через ${Math.max(0, Math.ceil(
                                ((nextWheelAvailable?.getTime() ?? 0) - Date.now()) /
                                (1000 * 60 * 60 * 24)
                              ))} дн.`
                            : 'Очікування...'}
                  </Button>
                  <Button
                    onClick={handleContinueAfterWheel}
                    variant="ghost"
                    size="lg"
                    className="border border-[var(--border)] bg-white/[0.04] text-[var(--text-primary)] hover:bg-white/[0.08]"
                  >
                    {webMap?.status === 'active' ? 'До ранку' : 'До Точка Б'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {wheelOnboardingCompleted ? (
                  <WheelOnboarding
                    completed
                    onGoToMorning={handleContinueAfterWheel}
                    continueLabel={webMap?.status === 'active' ? 'Перейти до ранкової сесії' : 'Перейти до Точка Б'}
                    onStartDiagnosis={handleShowForm}
                  />
                ) : (
                  <WheelOnboarding
                    onStartDiagnosis={handleShowForm}
                    onGoToMorning={handleContinueAfterWheel}
                  />
                )}

                {isWheelError ? (
                  <p className="text-center text-sm text-[var(--text-muted)]">
                    Тимчасово не вдалося завантажити колесо
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-5 md:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">
            Крок 2 · Історія
          </p>
          <div className="mt-4">
            <WheelHistory
              userId={userId}
              onViewPdf={(wheel) => { void openWheelPdf(wheel, 'view'); }}
              onDownloadPdf={(wheel) => { void openWheelPdf(wheel, 'download'); }}
            />
          </div>
        </div>
      </section>

      {isPdfLibraryOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-[var(--bg-secondary)] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">PDF звіти</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Історія колеса балансу</h3>
                <p className="mt-1 text-sm text-white/60">Обери дату, щоб відкрити звіт у вікні або завантажити PDF.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPdfLibraryOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Закрити список PDF звітів"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto pr-1">
              {wheelHistory.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/60">
                  Ще немає збережених звітів колеса для перегляду.
                </div>
              ) : wheelHistory.map((wheel) => (
                <div key={wheel.id} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">
                        {new Date(wheel.createdAt).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="mt-1 text-xs text-white/60">
                        Середній бал {wheel.averageScore.toFixed(1)} • слабка сфера {formatSphere(wheel.gaps?.[0])} • фокус {formatSphere(wheel.strengths?.[0])}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { void openWheelPdf(wheel, 'view'); }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/[0.08] hover:text-white"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Перегляд
                      </button>
                      <button
                        type="button"
                        onClick={() => { void openWheelPdf(wheel, 'download'); }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/[0.08] hover:text-white"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Завантажити
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {pdfIframeUrl ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4 py-6">
          <div className="relative w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10 bg-[var(--bg-secondary)] shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">PDF звіт</p>
                <h3 className="mt-1 text-lg font-semibold text-white">{pdfPreviewTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
                  pdfUrlRef.current = null;
                  setPdfIframeUrl(null);
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label="Закрити PDF звіт"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <iframe src={pdfIframeUrl} title={pdfPreviewTitle} className="h-[78vh] w-full border-0" />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default WheelPage;
