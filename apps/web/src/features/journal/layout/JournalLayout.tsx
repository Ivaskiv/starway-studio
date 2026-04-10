import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ListTodo, MoonStar, Sparkles, SunMedium, Video } from 'lucide-react';
import type { ComponentPropsWithoutRef, ComponentType } from 'react';
import type { RootState } from '@/app/store';
import type { JournalLayoutProps } from '../types';
import { useJournalDay } from '../hooks/useJournalDay';
import WeekStrip from '@/features/journal/components/WeekStrip';
import EventCard from '@/features/journal/components/EventCard';
import SystemSignalsCard from '@/features/journal/components/SystemSignalsCard';
import JournalCommandCenter from '@/features/journal/components/JournalCommandCenter';
import DayDetails from '@/features/journal/components/DayDetails';

type MotionDivProps = ComponentPropsWithoutRef<'div'> & Parameters<typeof motion.div>[0];
const MotionDiv = motion.div as ComponentType<MotionDivProps>;

function getDisplayName(user: RootState['auth']['user']) {
  return user?.firstName || user?.name || user?.email?.split('@')[0] || 'друже';
}

function getProgress(dayState: JournalLayoutProps['selectedDayState']) {
  const total = Math.max(1, dayState.summary.completed + dayState.summary.pending + dayState.summary.missed);
  const value = Math.min(100, Math.round((dayState.summary.completed / total) * 100));
  return { total, value };
}

function getDayLabel(selectedDate: Date, todayKey: string, yesterdayKey: string) {
  const dayKey = selectedDate.toISOString().slice(0, 10);
  const pretty = selectedDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
  if (dayKey === todayKey) return `Сьогодні · ${pretty}`;
  if (dayKey === yesterdayKey) return `Вчора · ${pretty}`;
  return pretty;
}

export default function JournalLayout(props: JournalLayoutProps) {
  const {
    compact = false,
    month,
    year,
    errorMessage,
    latestIncompleteDay,
    dayStatesByDate,
    selectedDay,
    selectedDayState,
    selectedEvents,
    onPrevMonth,
    onNextMonth,
    onSelectDay,
  } = props;

  const user = useSelector((state: RootState) => state.auth.user);
  const dayLogic = useJournalDay({
    selectedDay,
    selectedDayState,
    dayStatesByDate,
    latestIncompleteDay,
  });

  const todayLabel = useMemo(
    () => new Date(year, month - 1, 1).toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' }),
    [month, year],
  );
  const displayName = getDisplayName(user);
  const isMorningDone = selectedDayState.reflection.morning.status === 'done';
  const isEveningDone = selectedDayState.reflection.evening.status === 'done';
  const hasTaskProgress = selectedDayState.microTasks.completedCount > 0 || selectedDayState.microTasks.activeCount > 0 || selectedDayState.microTasks.missedCount > 0;
  const areTasksDone = hasTaskProgress && selectedDayState.microTasks.activeCount === 0 && selectedDayState.microTasks.missedCount === 0;
  const progress = getProgress(selectedDayState);
  const dayLabel = getDayLabel(dayLogic.selectedDate, dayLogic.todayKey, dayLogic.yesterdayKey);

  const steps = [
    {
      id: 'morning',
      number: '01',
      title: 'Ранкова рефлексія',
      icon: SunMedium,
      done: isMorningDone,
      locked: false,
      description: isMorningDone
        ? 'Стан дня вже зафіксовано. Можна переходити до конкретної дії.'
        : 'Зафіксуй стан і задай напрямок на сьогодні, щоб день не розпорошився.',
      cta: isMorningDone ? 'Відкрити' : 'Почати',
      onClick: () => dayLogic.openMorning(),
      badge: isMorningDone ? 'Готово' : 'Перший крок',
      badgeClassName: isMorningDone ? 'text-emerald-300 border-emerald-400/20 bg-emerald-500/10' : 'text-[rgb(var(--accent-soft-rgb))] border-[rgba(92,136,255,0.16)] bg-white/[0.04]',
    },
    {
      id: 'tasks',
      number: '02',
      title: 'Мікрозавдання',
      icon: ListTodo,
      done: areTasksDone,
      locked: !isMorningDone,
      description: !isMorningDone
        ? 'Заверши ранкову рефлексію — і відкриються твої мікрозавдання.'
        : areTasksDone
          ? 'Усі задачі дня вже закриті. Рух по дню збережено.'
          : hasTaskProgress
            ? 'Тут твій головний фокус дня. Закрий відкриті кроки й тримай темп.'
            : 'Після ранкової рефлексії тут з’явиться короткий список дій на сьогодні.',
      cta: !isMorningDone ? 'Спершу крок 1' : hasTaskProgress ? 'Відкрити задачі' : 'Побачити задачі',
      onClick: !isMorningDone ? () => dayLogic.openMorning() : () => dayLogic.openMicroTasks(),
      badge: !isMorningDone ? 'Заблоковано' : areTasksDone ? 'Готово' : hasTaskProgress ? 'У процесі' : 'Очікує',
      badgeClassName: !isMorningDone
        ? 'text-white/58 border-white/10 bg-white/[0.03]'
        : areTasksDone
          ? 'text-emerald-300 border-emerald-400/20 bg-emerald-500/10'
          : hasTaskProgress
            ? 'text-amber-200 border-amber-300/20 bg-amber-400/10'
            : 'text-white/58 border-white/10 bg-white/[0.03]',
    },
    {
      id: 'evening',
      number: '03',
      title: 'Вечірня рефлексія',
      icon: MoonStar,
      done: isEveningDone,
      locked: !isMorningDone,
      description: !isMorningDone
        ? 'Спершу відкрий день з ранку, а ввечері повернись до підсумку.'
        : isEveningDone
          ? 'Підсумок дня вже збережено. Можна спокійно переглянути результат.'
          : hasTaskProgress
            ? 'Підсумуй, що спрацювало сьогодні, і закрий день без хвостів.'
            : 'Коли з’явиться рух по дню, тут ти зможеш зафіксувати підсумок.',
      cta: !isMorningDone ? 'Спершу крок 1' : isEveningDone ? 'Переглянути' : 'Підсумувати день',
      onClick: !isMorningDone ? () => dayLogic.openMorning() : () => dayLogic.openEvening(),
      badge: !isMorningDone ? 'Заблоковано' : isEveningDone ? 'Готово' : hasTaskProgress ? 'Готовий до підсумку' : 'Очікує',
      badgeClassName: !isMorningDone
        ? 'text-white/58 border-white/10 bg-white/[0.03]'
        : isEveningDone
          ? 'text-emerald-300 border-emerald-400/20 bg-emerald-500/10'
          : hasTaskProgress
            ? 'text-[rgb(var(--accent-soft-rgb))] border-[rgba(92,136,255,0.16)] bg-white/[0.04]'
            : 'text-white/58 border-white/10 bg-white/[0.03]',
    },
  ];

  const primaryAction = dayLogic.recoveryNeedsAttention
    ? {
        label: 'Продовжити день',
        helper: dayLogic.recoveryDescription,
        onClick: dayLogic.openRecovery,
      }
    : !isMorningDone
      ? {
          label: 'Почати день',
          helper: 'Почни з ранкової рефлексії й відкрий фокус на сьогодні.',
          onClick: () => dayLogic.openMorning(),
        }
      : !areTasksDone
        ? {
            label: 'Продовжити день',
            helper: 'Рух уже є. Повернись до мікрозавдань і закрий головний крок.',
            onClick: () => dayLogic.openMicroTasks(),
          }
        : !isEveningDone
          ? {
              label: 'Продовжити день',
              helper: 'День майже закрито. Залишився короткий вечірній підсумок.',
              onClick: () => dayLogic.openEvening(),
            }
          : {
              label: 'Продовжити день',
              helper: 'День уже зібраний. Можна швидко повернутися до будь-якого етапу.',
              onClick: () => dayLogic.openMorning(),
            };

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {errorMessage && (
        <div className="rounded-[20px] border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100">
          {errorMessage}
        </div>
      )}

      <JournalCommandCenter
        compact={compact}
        displayName={displayName}
        subtitle={primaryAction.helper}
        dayLabel={dayLabel}
        actionLabel={primaryAction.label}
        progressLabel={`${selectedDayState.summary.completed}/${progress.total} виконано`}
        progressPercent={progress.value}
        xp={selectedDayState.summary.xp}
        streak={dayLogic.currentStreak}
        onAction={primaryAction.onClick}
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">Тиждень</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{todayLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onPrevMonth} className="nav-btn-back">
              <ChevronLeft className="h-3.5 w-3.5" />
              Місяць назад
            </button>
            <button type="button" onClick={onNextMonth} className="nav-btn-back">
              Місяць вперед
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <WeekStrip selectedDay={selectedDay} daysByDate={dayStatesByDate} onSelectDay={onSelectDay} />
      </section>

      <AnimatePresence mode="wait">
        <MotionDiv
          key={selectedDay}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="dashboard-liquid-card--soft overflow-hidden"
        >
          <div className="dashboard-liquid-edge--top p-5 sm:p-6">
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[rgb(var(--accent-soft-rgb))]">Потік дня</p>
              <h2 className="text-2xl font-black text-[var(--text-primary)]">Що робити далі</h2>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">
                Кожен крок відкриває наступний, тож тут завжди видно найкоротший шлях уперед.
              </p>
            </div>
          </div>

          <div className="space-y-4 p-5 sm:p-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="relative rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-4 sm:px-5">
                  {index < steps.length - 1 && (
                    <span className="pointer-events-none absolute left-[31px] top-[68px] hidden h-[calc(100%-32px)] w-px bg-white/8 sm:block" />
                  )}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex min-w-0 gap-4">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-white/[0.04] text-[var(--text-primary)]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">{step.number}</span>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${step.badgeClassName}`}>{step.badge}</span>
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{step.title}</h3>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">{step.description}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={step.onClick}
                      className={[
                        'inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all',
                        step.locked
                          ? 'border-white/10 bg-white/[0.03] text-white/58 hover:bg-white/[0.05]'
                          : 'border-[rgba(var(--accent-rgb),0.24)] bg-[rgba(var(--accent-rgb),0.12)] text-[var(--text-primary)] hover:border-[rgba(var(--accent-rgb),0.34)] hover:bg-[rgba(var(--accent-rgb),0.18)]',
                      ].join(' ')}
                    >
                      {step.cta}
                    </button>
                  </div>
                </div>
              );
            })}

            {(selectedDayState.zoomSessions.items.length > 0 || selectedDayState.systemSignals.length > 0) && (
              <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                {selectedDayState.zoomSessions.items.length > 0 && (
                  <div className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                      <Video className="h-4 w-4" />
                      Zoom-сесії
                    </div>
                    <div className="space-y-3">
                      {selectedDayState.zoomSessions.items.map((event) => (
                        <EventCard key={event.id} event={event} onOpen={dayLogic.openZoom} footer={dayLogic.getZoomFooter(event)} />
                      ))}
                    </div>
                  </div>
                )}

                {selectedDayState.systemSignals.length > 0 && (
                  <div className="rounded-[24px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                      <Sparkles className="h-4 w-4" />
                      Системні сигнали
                    </div>
                    <SystemSignalsCard events={selectedDayState.systemSignals} onOpen={dayLogic.openAI} />
                  </div>
                )}
              </div>
            )}

            <DayDetails day={selectedDay} events={selectedEvents} />
          </div>
        </MotionDiv>
      </AnimatePresence>
    </div>
  );
}
