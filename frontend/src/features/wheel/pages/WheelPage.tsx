// frontend/src/features/wheel/pages/WheelPage.tsx
import { useAppSelector } from '@/app/hooks';
import { WheelHistory } from '@/features/wheel';
import {
  useConnectTelegramProfileMutation,
  useGetLatestWheelAssessmentQuery,
  useGetWheelCooldownQuery,
  useGetWheelPdfMutation,
  useSendWheelTelegramReminderMutation,
} from '@/features/wheel/api';
import { Button } from '@/ui';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Clock3, Download, Eye, Loader2, Send, Share2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
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
  const userId = useAppSelector(s => s.auth.user?.id);

  const [tab, setTab] = useState<Tab>('assessment');
  const [activeTopTab, setActiveTopTab] = useState<TopTab>('assessment');
  const [showForm, setShowForm] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isPdfBusy, setIsPdfBusy] = useState(false);
  const [isTelegramBusy, setIsTelegramBusy] = useState(false);
  const [isShareBusy, setIsShareBusy] = useState(false);
  const [requestWheelPdf] = useGetWheelPdfMutation();
  const [requestTelegramReminder] = useSendWheelTelegramReminderMutation();
  const [connectTelegramProfile] = useConnectTelegramProfileMutation();

  const {
    data: currentWheel,
    isLoading: isWheelLoading,
    isError: isWheelError,
    error: wheelError,
  } = useGetLatestWheelAssessmentQuery(userId ?? '', {
    skip: !userId,
  });

  const { data: cooldown, isLoading: isCooldownLoading } = useGetWheelCooldownQuery(userId ?? '', {
    skip: !userId,
  });

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

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white/60">Будь ласка, увійдіть</p>
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

  const canFill = cooldown?.canFill ?? true;
  const daysLeft = cooldown?.daysLeft ?? 0;

  const handleShowForm = () => setShowForm(true);
  const handleHideForm = () => setShowForm(false);

  const handleComplete = () => {
    setShowForm(false);
  };

  const getWheelPdfBlob = async (): Promise<Blob | null> => {
    if (!currentWheel?.id) return null;
    return requestWheelPdf(currentWheel.id).unwrap();
  };

  const downloadWheelPdf = async (mode: 'view' | 'download') => {
    if (!currentWheel?.id || isPdfBusy) return;

    setIsPdfBusy(true);
    try {
      const blob = await getWheelPdfBlob();
      if (!blob) return;

      // fix code_x: auto-generated report is immediately available for preview/download after saving.
      const url = URL.createObjectURL(blob);

      if (mode === 'view') {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `wheel-report-${new Date().toISOString().slice(0, 10)}.pdf`;
        anchor.click();
      }

      setTimeout(() => URL.revokeObjectURL(url), 5000);
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
      const blob = await getWheelPdfBlob();
      if (!blob) return;

      const file = new File([blob], 'wheel-report.pdf', { type: 'application/pdf' });
      // fix code_x: native share first; fallback guarantees a real action on desktop browsers.
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
      // Secondary fallback even when share/copy fails.
      try {
        await downloadWheelPdf('download');
      } catch {
        toast.error('Не вдалося поділитись звітом');
      }
    } finally {
      setIsShareBusy(false);
    }
  };

  const requestTelegramProfile = async () => {
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
      // fix code_x: use RTK baseQuery so token refresh/reauth is unified.
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

  const topTabs: Array<{
    id: TopTab;
    label: string;
    icon: LucideIcon;
    disabled?: boolean;
    onClick: () => void;
  }> = [
    {
      id: 'assessment',
      label: 'Оцінка',
      icon: Sparkles,
      onClick: () => {
        setTab('assessment');
        setShowForm(false);
      },
    },
    {
      id: 'history',
      label: 'Історія',
      icon: Clock3,
      onClick: () => {
        setTab('history');
        setShowForm(false);
      },
    },
    {
      id: 'pdf-view',
      label: 'PDF перегляд',
      icon: Eye,
      disabled: !currentWheel || isPdfBusy,
      onClick: () => {
        void downloadWheelPdf('view');
      },
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        {/* fix code_x: stylized back action above card for stronger glass hierarchy. */}
        <button
          onClick={() => navigate(-1)}
          className="group inline-flex items-center gap-2 rounded-2xl border border-[color:rgba(var(--accent-rgb),0.35)] bg-[linear-gradient(135deg,rgba(var(--accent-rgb),0.24),rgba(var(--ambient-rgb-2),0.3))] px-4 py-2 text-white/90 backdrop-blur-xl transition-all hover:scale-[1.02] hover:border-[color:rgba(var(--accent-rgb),0.55)] hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="text-sm font-medium">Назад до попередньої сторінки</span>
        </button>

        <h1 className="text-2xl font-bold text-white flex items-center gap-3 mt-3">
          <Sparkles className="w-7 h-7 text-[var(--color-accent-soft)]" />
          Колесо балансу
        </h1>
      </div>

      {/* Tabs + quick actions in one block */}
      {/* fix code_x: symmetric spacing around divider line and no extra right inset drift. */}
      <div className="w-full">
        <div className="px-3 pb-2 flex justify-end">
          <div className="flex items-center gap-0.5 rounded-xl px-2 py-1 backdrop-blur-xl">
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
        <div className="mx-3 h-px bg-white/30" />
        <div className="px-3 pt-2">
          <div className="overflow-x-auto no-scrollbar">
            <div className="inline-flex items-end pb-1">
              {topTabs.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTopTab(item.id);
                    item.onClick();
                  }}
                  disabled={item.disabled}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-br-xl border-r border-b border-l-0 border-t-0 px-4 py-2.5 text-sm font-semibold transition-all ${
                    idx === 0 ? '' : '-ml-px'
                  } ${
                    activeTopTab === item.id
                      ? 'text-white border-[color:rgba(var(--accent-rgb),0.62)] bg-[color:rgba(var(--accent-rgb),0.28)] shadow-[0_4px_12px_rgba(var(--accent-rgb),0.22)]'
                      : 'text-white/85 border-white/30 bg-white/10 hover:text-white hover:bg-white/14'
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className={`transition-all duration-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="glass-card p-6">
          {tab === 'assessment' ? (
            showForm ? (
              <WheelForm userId={userId} onComplete={handleComplete} onCancel={handleHideForm} />
            ) : currentWheel ? (
              <div className="space-y-6">
                <div className="flex flex-col items-center text-center">
                  <BalanceWheel scores={currentWheel.scores} size={360} interactive />

                  <div className="mt-6 text-center">
                    <p className="text-3xl font-bold text-white">
                      {Number(currentWheel.averageScore ?? 0).toFixed(1)}
                    </p>
                    <p className="text-white/40">Середній бал</p>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                    {/* fix code_x: replace unclear raw ids ("relationships/finance") with two clear visual cards. */}
                    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-left">
                      <p className="text-[11px] uppercase tracking-wide text-emerald-300/85">
                        Сильна сфера
                      </p>
                      <p className="mt-1 text-white font-semibold flex items-center gap-2">
                        <span>{formatSphereEmoji(currentWheel.strengths?.[0])}</span>
                        {formatSphere(currentWheel.strengths?.[0])}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-left">
                      <p className="text-[11px] uppercase tracking-wide text-amber-300/85">
                        Сфера розвитку
                      </p>
                      <p className="mt-1 text-white font-semibold flex items-center gap-2">
                        <span>{formatSphereEmoji(currentWheel.gaps?.[0])}</span>
                        {formatSphere(currentWheel.gaps?.[0])}
                      </p>
                    </div>
                  </div>

                  <p className="text-white/40 text-xs mt-4">
                    Оновлено:{' '}
                    {new Date(
                      currentWheel.completedAt ?? currentWheel.createdAt,
                    ).toLocaleDateString('uk')}
                  </p>
                </div>

                <div className="flex justify-center">
                  <Button
                    onClick={handleShowForm}
                    disabled={!canFill}
                    color="orange"
                    size="lg"
                    variant="solid"
                  >
                    {canFill ? 'Оновити оцінку' : `Доступно через ${daysLeft} дн.`}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-white/60 mb-4">
                  {isWheelError
                    ? 'Тимчасово не вдалося завантажити колесо'
                    : 'Колесо ще не заповнено'}
                </p>
                <Button onClick={handleShowForm} color="orange" size="lg" variant="solid">
                  Заповнити зараз
                </Button>
              </div>
            )
          ) : (
            <WheelHistory userId={userId} />
          )}
        </div>
      </div>
    </div>
  );
};

export default WheelPage;
