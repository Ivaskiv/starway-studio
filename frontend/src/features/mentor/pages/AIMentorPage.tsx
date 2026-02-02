// frontend/src/features/ai-mentor/pages/AIMentorPage.tsx
import { useAuth } from '@/features/auth/hooks/useAuth';
import { WHEEL_CATEGORIES, WheelScore } from '@/features/wheel/types/wheel.types';
import { cn } from '@/lib/utils';
import { Button, GlassCard, Input, Slider } from '@/ui';
import { ArrowLeft, ArrowRight, Bot, Download, Plus, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  useCreateWheelAssessmentMutation,
  useGetLatestWheelQuery,
  useGetMentorSetupQuery,
  useLazyDownloadWheelPDFQuery,
  useUpdateMentorSetupMutation,
} from '../services/mentor.api';

interface WheelScoreWithComment extends WheelScore {
  comment?: string;
}
type SetupStep = 'overview' | 'wheel' | 'morning' | 'evening' | 'complete';

export default function AIMentorPage() {
  const { isAuthenticated } = useAuth();

  const { data: mentorSetup, isLoading: isSetupLoading } = useGetMentorSetupQuery(undefined, {
    skip: !isAuthenticated,
  });

  const { data: latestWheel } = useGetLatestWheelQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [createWheel, { isLoading: isCreatingWheel }] = useCreateWheelAssessmentMutation();
  const [updateSetup, { isLoading: isUpdatingSetup }] = useUpdateMentorSetupMutation();
  const [triggerDownloadPDF, { isFetching: isDownloading }] = useLazyDownloadWheelPDFQuery();

  const [step, setStep] = useState<SetupStep>('overview');
  const [wheelIndex, setWheelIndex] = useState(0);

  const [scores, setScores] = useState<WheelScoreWithComment[]>(
    WHEEL_CATEGORIES.map(cat => ({
      category_id: cat.id,
      score: 5,
      comment: '',
    })),
  );

  const [morningQs, setMorningQs] = useState<string[]>(['']);
  const [eveningQs, setEveningQs] = useState<string[]>(['']);

  // Якщо вже налаштовано — одразу на complete
  useEffect(() => {
    if (mentorSetup?.is_configured) {
      setStep('complete');
    }
  }, [mentorSetup]);

  const currentCategory = WHEEL_CATEGORIES[wheelIndex];
  const currentScoreObj = scores.find(s => s.category_id === currentCategory?.id);

  const handleScoreUpdate = (categoryId: string, score: number) => {
    setScores(prev =>
      prev.map(item => (item.category_id === categoryId ? { ...item, score } : item)),
    );
  };

  const handleCommentUpdate = (categoryId: string, comment: string) => {
    setScores(prev =>
      prev.map(item => (item.category_id === categoryId ? { ...item, comment } : item)),
    );
  };

  const saveWheel = async () => {
    try {
      await createWheel(scores).unwrap();
      toast.success('Колесо балансу збережено');
      setStep('morning');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Не вдалося зберегти колесо');
    }
  };

  const completeSetup = async () => {
    const cleanMorning = morningQs.filter(Boolean);
    const cleanEvening = eveningQs.filter(Boolean);

    if (cleanMorning.length === 0) {
      toast.error('Додайте хоча б одне ранкове питання');
      return;
    }
    if (cleanEvening.length === 0) {
      toast.error('Додайте хоча б одне вечірнє питання');
      return;
    }

    try {
      await updateSetup({
        morningQuestions: cleanMorning,
        eveningQuestions: cleanEvening,
      }).unwrap();

      toast.success('AI-ментор повністю налаштовано!', { icon: '✨' });
      setStep('complete');
    } catch (err: any) {
      toast.error(err?.data?.message || 'Помилка збереження налаштувань');
    }
  };

  const downloadReport = async () => {
    if (!latestWheel?.id) return;

    try {
      const pdfBlob = await triggerDownloadPDF(latestWheel.id).unwrap();
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wheel-report-${latestWheel.id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Звіт завантажено');
    } catch {
      toast.error('Не вдалося завантажити PDF');
    }
  };

  // ────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────

  if (isSetupLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-white/70">
        Завантаження налаштувань...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:px-6 md:py-12 space-y-10">
      {/* Шапка */}
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-xl shadow-purple-900/30">
          <Bot className="w-8 h-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white">Мій AI-Ментор</h1>
          <p className="text-white/70 mt-1">Персональна система балансу та рефлексії</p>
        </div>
      </div>

      <GlassCard className="p-6 md:p-10">
        {/* Прогрес-лінія */}
        <div className="flex justify-between items-center mb-10 md:mb-12 gap-2">
          {['Колесо', 'Ранок', 'Вечір', 'Готово'].map((label, idx) => (
            <div key={label} className="flex-1 flex flex-col items-center relative">
              <div
                className={cn(
                  'w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-lg md:text-xl font-semibold transition-all duration-300',
                  step === 'complete' && idx < 3
                    ? 'bg-green-600 text-white shadow-green-500/30'
                    : (step === 'wheel' && idx === 0) ||
                        (step === 'morning' && idx === 1) ||
                        (step === 'evening' && idx === 2) ||
                        (step === 'overview' && idx === 0)
                      ? 'bg-gradient-to-br from-orange-500 to-pink-600 text-white shadow-lg shadow-orange-500/40 scale-110'
                      : 'bg-slate-700/60 text-white/50',
                )}
              >
                {idx + 1}
              </div>
              <p className="text-xs md:text-sm mt-2 text-center text-white/60 font-medium">
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* ─── Overview ──────────────────────────────────────── */}
        {step === 'overview' && (
          <div className="text-center space-y-10 py-6 md:py-10">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Налаштуйте свого AI-ментора за 3 кроки
            </h2>
            <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              Оцініть баланс життя, створіть щоденні ритуали рефлексії та отримайте персоналізовану
              підтримку 24/7
            </p>

            <div className="grid md:grid-cols-3 gap-6 mt-8">
              {[
                { emoji: '🎡', title: 'Колесо балансу', desc: '8 ключових сфер життя' },
                { emoji: '🌅', title: 'Ранковий ритуал', desc: 'Фокус та намір на день' },
                { emoji: '🌙', title: 'Вечірній ритуал', desc: 'Вдячність та аналіз дня' },
              ].map(item => (
                <GlassCard key={item.title} className="p-8 text-center">
                  <div className="text-6xl mb-5">{item.emoji}</div>
                  <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
                  <p className="text-white/60">{item.desc}</p>
                </GlassCard>
              ))}
            </div>

            <Button
              size="lg"
              onClick={() => setStep('wheel')}
              className="mt-10 bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 px-12 py-7 text-lg font-medium shadow-lg shadow-orange-500/20"
            >
              Почати налаштування
            </Button>
          </div>
        )}

        {/* ─── Wheel ─────────────────────────────────────────── */}
        {step === 'wheel' && currentCategory && (
          <div className="space-y-10">
            <div className="mb-8">
              <div className="flex gap-1.5 mb-5">
                {WHEEL_CATEGORIES.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2.5 flex-1 rounded-full transition-all duration-300 ${
                      i <= wheelIndex
                        ? 'bg-gradient-to-r from-orange-500 to-pink-500'
                        : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>
              <p className="text-center text-white/60 text-sm">
                Сфера {wheelIndex + 1} / {WHEEL_CATEGORIES.length}
              </p>
            </div>

            <div className="text-center">
              <div className="text-8xl mb-6 drop-shadow-lg">{currentCategory.emoji}</div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                {currentCategory.nameUk || currentCategory.label}
              </h2>
              <p className="text-white/70 text-lg">Як би ви оцінили цю сферу зараз?</p>
            </div>

            <div className="max-w-2xl mx-auto space-y-8">
              <Slider
                min={1}
                max={10}
                step={1}
                value={currentScoreObj?.score ?? 5}
                onValueChange={val => handleScoreUpdate(currentCategory.id, val)}
                trackColor="from-orange-500 via-pink-500 to-purple-600"
                showValue
              />

              <div className="pt-4">
                <label className="block text-white/80 text-sm mb-3 font-medium">
                  Чому саме така оцінка? (необов’язково)
                </label>
                <Input
                  value={currentScoreObj?.comment ?? ''}
                  onChange={e => handleCommentUpdate(currentCategory.id, e.target.value)}
                  placeholder="Що вас радує або турбує в цій сфері..."
                  className="bg-white/5 border-white/10 focus:border-orange-400/50"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-8 border-t border-white/10">
              <Button
                variant="ghost"
                onClick={() =>
                  wheelIndex > 0 ? setWheelIndex(wheelIndex - 1) : setStep('overview')
                }
                className="text-white/70 hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Назад
              </Button>

              <Button
                onClick={() =>
                  wheelIndex === WHEEL_CATEGORIES.length - 1
                    ? saveWheel()
                    : setWheelIndex(wheelIndex + 1)
                }
                disabled={isCreatingWheel}
                className="bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 min-w-[180px]"
              >
                {isCreatingWheel ? (
                  'Збереження...'
                ) : wheelIndex === WHEEL_CATEGORIES.length - 1 ? (
                  'Зберегти та продовжити'
                ) : (
                  <>
                    Наступна сфера <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ─── Morning Questions ──────────────────────────────── */}
        {step === 'morning' && (
          <div className="space-y-8">
            <div className="text-center">
              <div className="text-7xl mb-5">🌅</div>
              <h2 className="text-3xl font-bold text-white mb-3">Ранкові питання</h2>
              <p className="text-white/70 text-lg mb-2">
                Які питання допоможуть вам розпочати день осмислено?
              </p>
              <p className="text-white/50 text-sm">
                Рекомендовано 3–7 питань • заповнено: {morningQs.filter(Boolean).length}
              </p>
            </div>

            <div className="space-y-4 max-w-2xl mx-auto">
              {morningQs.map((q, index) => (
                <div key={index} className="flex gap-3 items-center group">
                  <Input
                    value={q}
                    onChange={e => {
                      const newQs = [...morningQs];
                      newQs[index] = e.target.value;
                      setMorningQs(newQs);
                    }}
                    placeholder={`Ранкове питання ${index + 1}...`}
                    className="bg-white/5 border-white/10 focus:border-orange-400/50"
                  />
                  {morningQs.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMorningQs(morningQs.filter((_, i) => i !== index))}
                      className={cn(
                        'h-8 w-8 p-0', // робимо квадрат 32×32 px
                        'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                        'text-red-400 hover:text-red-300',
                        'hover:bg-red-950/30',
                        'rounded-full', // кругла форма (дуже красиво виглядає)
                        'focus:ring-red-500/40', // фокус у кольорі теми
                      )}
                    >
                      <Trash2 size={18} />
                    </Button>
                  )}
                </div>
              ))}

              {morningQs.length < 10 && (
                <Button
                  variant="outline"
                  onClick={() => setMorningQs([...morningQs, ''])}
                  className="w-full border-dashed border-white/20 hover:bg-white/5 hover:border-white/30"
                >
                  <Plus size={16} className="mr-2" />
                  Додати ще питання
                </Button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-8 border-t border-white/10">
              <Button
                variant="ghost"
                onClick={() => setStep('wheel')}
                className="text-white/70 hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Повернутися до колеса
              </Button>

              <Button
                onClick={() => setStep('evening')}
                disabled={morningQs.filter(Boolean).length === 0}
                className="bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 min-w-[180px]"
              >
                Продовжити до вечірніх питань
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── Evening Questions ──────────────────────────────── */}
        {step === 'evening' && (
          <div className="space-y-8">
            <div className="text-center">
              <div className="text-7xl mb-5">🌙</div>
              <h2 className="text-3xl font-bold text-white mb-3">Вечірні питання</h2>
              <p className="text-white/70 text-lg mb-2">
                Які питання допоможуть вам підбити підсумки дня?
              </p>
              <p className="text-white/50 text-sm">
                Рекомендовано 3–7 питань • заповнено: {eveningQs.filter(Boolean).length}
              </p>
            </div>

            <div className="space-y-4 max-w-2xl mx-auto">
              {eveningQs.map((q, index) => (
                <div key={index} className="flex gap-3 items-center group">
                  <Input
                    value={q}
                    onChange={e => {
                      const newQs = [...eveningQs];
                      newQs[index] = e.target.value;
                      setEveningQs(newQs);
                    }}
                    placeholder={`Вечірнє питання ${index + 1}...`}
                    className="bg-white/5 border-white/10 focus:border-orange-400/50"
                  />
                  {eveningQs.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEveningQs(eveningQs.filter((_, i) => i !== index))}
                      className={cn(
                        'h-8 w-8 p-0', // робимо квадрат 32×32 px
                        'opacity-0 group-hover:opacity-100 transition-opacity duration-200',
                        'text-red-400 hover:text-red-300',
                        'hover:bg-red-950/30',
                        'rounded-full', // кругла форма (дуже красиво виглядає)
                        'focus:ring-red-500/40', // фокус у кольорі теми
                      )}
                    >
                      <Trash2 size={18} />
                    </Button>
                  )}
                </div>
              ))}

              {eveningQs.length < 10 && (
                <Button
                  variant="outline"
                  onClick={() => setEveningQs([...eveningQs, ''])}
                  className="w-full border-dashed border-white/20 hover:bg-white/5 hover:border-white/30"
                >
                  <Plus size={16} className="mr-2" />
                  Додати ще питання
                </Button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-between gap-4 pt-8 border-t border-white/10">
              <Button
                variant="ghost"
                onClick={() => setStep('morning')}
                className="text-white/70 hover:text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Повернутися до ранкових
              </Button>

              <Button
                onClick={completeSetup}
                disabled={eveningQs.filter(Boolean).length === 0 || isUpdatingSetup}
                className="bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 min-w-[220px]"
              >
                {isUpdatingSetup ? 'Збереження...' : 'Завершити налаштування'}
              </Button>
            </div>
          </div>
        )}

        {/* ─── Complete ───────────────────────────────────────── */}
        {step === 'complete' && (
          <div className="text-center py-16 space-y-10">
            <Sparkles className="mx-auto h-24 w-24 text-yellow-400 animate-pulse" />
            <h2 className="text-4xl md:text-5xl font-bold text-white">Вітаємо!</h2>
            <p className="text-xl text-white/80 max-w-3xl mx-auto leading-relaxed">
              Ваш персональний AI-ментор повністю налаштований. Тепер ви можете щодня відстежувати
              баланс, вести рефлексію та отримувати підтримку.
            </p>

            {latestWheel && (
              <Button
                size="lg"
                onClick={downloadReport}
                disabled={isDownloading}
                className="mt-8 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-lg shadow-orange-500/30 px-10 py-7 text-lg"
              >
                <Download className="mr-3 h-5 w-5" />
                Завантажити PDF-звіт
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => setStep('wheel')}
              className="mt-6 border-white/20 hover:bg-white/10"
            >
              Редагувати налаштування
            </Button>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
