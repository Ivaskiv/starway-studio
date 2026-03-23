// frontend/src/features/wheel/pages/WheelPage.tsx
import { useAppSelector } from '@/app/hooks';
import { useSystemState } from '@/features/auth/hooks/useSystemState';
import { WheelHistory } from '@/features/wheel';
import {
  useConnectTelegramProfileMutation,
  useGetLatestWheelAssessmentQuery,
  useGetWheelCooldownQuery,
  useSendWheelTelegramReminderMutation,
} from '@/features/wheel/api';
import { Button } from '@/ui';
import type { LucideIcon } from 'lucide-react';
import { Clock3, Download, Eye, Loader2, Send, Share2, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { BalanceWheel } from '../components/BalanceWheel';
import { WheelForm } from '../components/WheelForm';
import { WHEEL_CATEGORIES } from '../types/wheel.types';

type Tab = 'assessment' | 'history';
type TopTab = Tab | 'pdf-view';

const sphereLabelMap = new Map(WHEEL_CATEGORIES.map(item => [item.id, item.nameUk]));
const sphereEmojiMap = new Map(WHEEL_CATEGORIES.map(item => [item.id, item.emoji]));

const formatSphere = (value?: string) => {
  if (!value) return '—';
  return sphereLabelMap.get(value) || value.replace(/_/g, ' ');
};

const formatSphereEmoji = (value?: string) => sphereEmojiMap.get(value || '') || '✨';

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
  const [tab, setTab] = useState<Tab>('assessment');
  const [activeTopTab, setActiveTopTab] = useState<TopTab>('assessment');
  const [showForm, setShowForm] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isPdfBusy, setIsPdfBusy] = useState(false);
  const [isTelegramBusy, setIsTelegramBusy] = useState(false);
  const [isShareBusy, setIsShareBusy] = useState(false);
  const [pdfIframeUrl, setPdfIframeUrl] = useState<string | null>(null);
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

  // ─── ALL hooks BEFORE any early return ───────────────────

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const code = (wheelError as any)?.data?.error;
    if (code === 'token_expired' || code === 'invalid_token') {
      toast.error('Сесія завершилась. Увійдіть знову.');
    }
  }, [wheelError]);

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

  // ─── handlers ─────────────────────────────────────────────

  const handleShowForm = () => setShowForm(true);
  const handleHideForm = () => setShowForm(false);
  const handleComplete = () => setShowForm(false);

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

  const fetchWheelPdfBlob = async (): Promise<Blob> => {
    if (!currentWheel?.id) throw new Error('wheel_not_found');
    const headers: Record<string, string> = {};
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    const response = await fetch(`/api/wheel/${currentWheel.id}/pdf`, {
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

  const downloadWheelPdf = async (mode: 'view' | 'download') => {
    if (!currentWheel?.id || isPdfBusy) return;
    setIsPdfBusy(true);
    try {
      const blob = await fetchWheelPdfBlob();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      if (mode === 'view') {
        if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = url;
        setPdfIframeUrl(url);
        setActiveTopTab('pdf-view');
      } else {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `wheel-report-${new Date().toISOString().slice(0, 10)}.pdf`;
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
      const blob = await fetchWheelPdfBlob();
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
        anchor.download = `wheel-report-${new Date().toISOString().slice(0, 10)}.pdf`;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        toast.success('Звіт завантажено. Можна поділитись файлом вручну.');
      }
    } catch (error) {
      console.error(error);
      try {
        await downloadWheelPdf('download');
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

  // ─── tabs config ──────────────────────────────────────────

  const topTabs: Array<{
    id: TopTab
    label: string
    icon: LucideIcon
    disabled?: boolean
    onClick: () => void
  }> = [
    {
      id: 'assessment',
      label: 'Оцінка',
      icon: Sparkles,
      onClick: () => { setTab('assessment'); setShowForm(false); },
    },
    {
      id: 'history',
      label: 'Історія',
      icon: Clock3,
      onClick: () => { setTab('history'); setShowForm(false); },
    },
    {
      id: 'pdf-view',
      label: 'Перегляд звіту',
      icon: Eye,
      disabled: !currentWheel || isPdfBusy,
      onClick: () => { void downloadWheelPdf('view'); },
    },
  ];

  // ─── render ───────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl space-y-1 p-1 md:p-1">
      <div>
        <h1 className="hero-h1 flex items-center gap-3 mt-3">
          <Sparkles className="w-7 h-7 text-[var(--color-accent-soft)] animate-pulse" />
          Колесо балансу
        </h1>
      </div>

      <div className="w-full">
        <div className="px-3 pb-2 flex justify-end">
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/75">
            <p>Що робить користувач: ставить оцінки 1–10 по 8 сферах.</p>
            <p>Що фіксує система: слабку сферу, фокус-сферу, динаміку за періоди.</p>
            <p>Що система НЕ робить: не дає порад, не мотивує, не призначає рекомендації.</p>
          </div>

          <div className="flex items-end gap-0.5 rounded-xl px-2 py-1 backdrop-blur-xl">
            <button
              onClick={() => void downloadWheelPdf('download')}
              disabled={!currentWheel || isPdfBusy}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/85 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5 shrink-0" />
              <span>PDF</span>
            </button>
            <button
              onClick={() => void sendTelegramReminder()}
              disabled={!currentWheel || isTelegramBusy}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/85 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5 shrink-0" />
              <span>Telegram</span>
            </button>
            <button
              onClick={() => void shareWheelReport()}
              disabled={!currentWheel || isShareBusy}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-white/85 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <Share2 className="h-3.5 w-3.5 shrink-0" />
              <span>Поділитись</span>
            </button>
          </div>
        </div>

        <div className="px-3 pt-2 overflow-x-auto no-scrollbar">
          <div className="app-tabs-shell">
            {topTabs.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTopTab(item.id); item.onClick(); }}
                disabled={item.disabled}
                className={[
                  'app-tab',
                  activeTopTab === item.id ? 'app-tab-active' : 'app-tab-inactive',
                ].join(' ')}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {activeTopTab === 'pdf-view' ? (
          <div className="glass-card p-6">
            {pdfIframeUrl ? (
              <iframe
                src={pdfIframeUrl}
                title="PDF звіт колеса балансу"
                className="w-full min-h-[600px] border-0"
              />
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-sm text-white/60">
                {isPdfBusy ? (
                  <>
                    <Loader2 className="animate-spin text-[var(--accent)]" />
                    <p>Підготовка PDF...</p>
                  </>
                ) : (
                  <p>Натисни «Перегляд і сформувати звіт», щоб відкрити PDF у цьому вікні.</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card p-6">
            {tab === 'assessment' ? (
              showForm ? (
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
                    <div className="mt-6 flex w-full flex-wrap items-stretch justify-center gap-3 text-left">
                      <div className="flex-1 min-w-[180px] rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-emerald-300/85">Сильна сфера</p>
                        <p className="mt-1 text-white font-semibold flex items-center gap-2">
                          <span>{formatSphereEmoji(currentWheel.strengths?.[0])}</span>
                          {formatSphere(currentWheel.strengths?.[0]) || '—'}
                        </p>
                      </div>
                      <div className="flex flex-1 min-w-[160px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                        <p className="text-3xl font-bold text-white">{Number(currentWheel.averageScore ?? 0).toFixed(1)}</p>
                        <p className="text-white/40 text-xs">Середній бал</p>
                        <p className="text-white/40 text-xs">
                          Оновлено: {new Date(currentWheel.completedAt ?? currentWheel.createdAt).toLocaleDateString('uk')}
                        </p>
                      </div>
                      <div className="flex-1 min-w-[180px] rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3">
                        <p className="text-[11px] uppercase tracking-wide text-amber-300/85">Сфера розвитку</p>
                        <p className="mt-1 text-white font-semibold flex items-center gap-2">
                          <span>{formatSphereEmoji(currentWheel.gaps?.[0])}</span>
                          {formatSphere(currentWheel.gaps?.[0]) || '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {renderWheelAction()}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-white/60 mb-4">
                    {isWheelError ? 'Тимчасово не вдалося завантажити колесо' : 'Колесо ще не заповнено'}
                  </p>
                  {renderWheelAction()}
                </div>
              )
            ) : (
              <WheelHistory userId={userId} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WheelPage;
